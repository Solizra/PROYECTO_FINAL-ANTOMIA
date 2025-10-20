import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Perfil.css';

function Perfil() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editEmail, setEditEmail] = useState(false);
  const [editPassword, setEditPassword] = useState(false);
  const [emailData, setEmailData] = useState({
    newEmail: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      setUser(user);
      setEmailData({
        newEmail: user?.email || ''
      });
    } catch (error) {
      setError('Error cargando datos del usuario');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (emailData.newEmail === user?.email) {
      setError('El nuevo email debe ser diferente al actual');
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        email: emailData.newEmail
      });
      
      if (error) throw error;
      
      setSuccess('Email actualizado. Revisa tu correo para confirmar el cambio.');
      setEditEmail(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (error) {
      setError('Error actualizando email: ' + error.message);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      setSuccess('Contraseña actualizada correctamente');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setEditPassword(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (error) {
      setError('Error actualizando contraseña: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (loading) {
    return (
      <div className="perfil-container">
        <div className="loading">Cargando perfil...</div>
      </div>
    );
  }

  return (
    <div className="perfil-container">
      <div className="perfil-header">
        <h1>Mi Perfil</h1>
        <p>Administra tu información personal</p>
      </div>

      <div className="perfil-content">
        <div className="perfil-card">
          <div className="perfil-avatar">
            <div className="avatar-placeholder">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {success}
            </div>
          )}

          <div className="perfil-info">
            {/* Sección de Email */}
            <div className="info-section">
              <h3>Email</h3>
              {!editEmail ? (
                <>
                  <div className="info-row">
                    <label>Email actual</label>
                    <span>{user?.email}</span>
                  </div>
                  <button className="edit-btn" onClick={() => setEditEmail(true)}>
                    Cambiar email
                  </button>
                </>
              ) : (
                <form onSubmit={handleEmailUpdate}>
                  <div className="form-row">
                    <label htmlFor="currentEmail">Email actual</label>
                    <input
                      type="email"
                      id="currentEmail"
                      value={user?.email}
                      disabled
                      className="disabled"
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="newEmail">Nuevo email</label>
                    <input
                      type="email"
                      id="newEmail"
                      value={emailData.newEmail}
                      onChange={(e) => setEmailData({...emailData, newEmail: e.target.value})}
                      placeholder="Tu nuevo email"
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="save-btn">Actualizar email</button>
                    <button type="button" className="cancel-btn" onClick={() => setEditEmail(false)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Sección de Contraseña */}
            <div className="info-section">
              <h3>Contraseña</h3>
              {!editPassword ? (
                <>
                  <div className="info-row">
                    <label>Estado de la contraseña</label>
                    <span className="status-active">Configurada</span>
                  </div>
                  <button className="edit-btn" onClick={() => setEditPassword(true)}>
                    Cambiar contraseña
                  </button>
                </>
              ) : (
                <form onSubmit={handlePasswordChange}>
                  <div className="form-row">
                    <label htmlFor="currentPassword">Contraseña actual</label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      placeholder="Tu contraseña actual"
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="newPassword">Nueva contraseña</label>
                    <input
                      type="password"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      placeholder="Nueva contraseña"
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      placeholder="Confirma tu nueva contraseña"
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="save-btn">Actualizar contraseña</button>
                    <button type="button" className="cancel-btn" onClick={() => setEditPassword(false)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="perfil-stats">
          <h3>Información de la cuenta</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">{new Date(user?.created_at).toLocaleDateString('es-ES')}</div>
              <div className="stat-label">Miembro desde</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{new Date(user?.last_sign_in_at).toLocaleDateString('es-ES')}</div>
              <div className="stat-label">Último acceso</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{user?.email_confirmed_at ? 'Verificado' : 'No verificado'}</div>
              <div className="stat-label">Estado de verificación</div>
            </div>
          </div>

          <div className="email-info">
            <h4>Acciones de cuenta</h4>
            <button className="btn-danger" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m-5 5H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Perfil;