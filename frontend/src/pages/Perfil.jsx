import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Perfil.css";
import { supabase } from "../supabaseClient";

function Perfil() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    email: ''
  });

  useEffect(() => {
    const checkUser = async () => {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData) {
        navigate("/");
        return;
      }
      
      setUser(userData);
      setFormData({
        email: userData.email || ''
      });
      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      // Asegurar que exista sesión antes de intentar actualizar
      const {
        data: { session },
        error: getSessionError
      } = await supabase.auth.getSession();
      if (getSessionError) throw getSessionError;
      if (!session) {
        alert('Necesitas iniciar sesión nuevamente para cambiar tu email.');
        try {
          localStorage.setItem('postLoginRedirect', '/perfil');
        } catch {}
        navigate('/');
        return;
      }

      // Verificar que el email sea diferente al actual
      if (formData.email === user?.email) {
        alert("ℹ️ El email es el mismo que ya tienes configurado.");
        setEditMode(false);
        return;
      }

      // Mostrar indicador de carga
      const saveBtn = document.querySelector('.save-btn');
      if (saveBtn) {
        saveBtn.textContent = '⏳ Actualizando...';
        saveBtn.disabled = true;
      }

      // Esperar un poco antes de hacer la solicitud para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Actualizar en Supabase con URL de redirección para verificar el cambio
      const { data, error } = await supabase.auth.updateUser(
        {
          email: formData.email
        },
        {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      );

      if (error) {
        // Manejar errores específicos de Supabase
        if (error.message.includes('Too Many Requests')) {
          throw new Error("Demasiadas solicitudes. Espera unos segundos antes de intentar nuevamente.");
        } else if (error.message.includes('security purposes')) {
          throw new Error("Por seguridad, espera al menos 30 segundos antes de cambiar el email nuevamente.");
        } else {
          throw error;
        }
      }

      // Supabase puede no devolver el usuario actualizado inmediatamente
      // Vamos a verificar el estado actual del usuario
      const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
      
      if (getUserError) {
        throw new Error(`Error obteniendo usuario actual: ${getUserError.message}`);
      }

      // Verificar que el email se actualizó correctamente
      if (currentUser && currentUser.email === formData.email) {
        // Actualizar en localStorage
        const updatedUser = { ...user, email: formData.email };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setEditMode(false);
        
        // Mostrar mensaje de éxito
        alert("✅ Email actualizado correctamente en Supabase. Deberás verificar el cambio en tu casilla de mail.");
        
      } else if (currentUser && currentUser.email !== formData.email) {
        // El email no se actualizó inmediatamente, pero Supabase puede estar procesando
        console.log('⚠️ Email no actualizado inmediatamente, pero Supabase está procesando el cambio');
        
        // Actualizar en localStorage de todas formas (optimista)
        const updatedUser = { ...user, email: formData.email };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setEditMode(false);
        
        alert("✅ Solicitud enviada a Supabase. Deberás verificar el cambio en tu casilla de mail.");
        
        // Opcional: Cerrar sesión para que el usuario use el nuevo email
        setTimeout(() => {
          if (window.confirm("¿Quieres cerrar sesión para probar el nuevo email?")) {
            supabase.auth.signOut();
            navigate("/");
          }
        }, 2000);
      } else {
        throw new Error("No se pudo obtener información del usuario actual");
      }
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      if (String(error.message).toLowerCase().includes('auth session missing')) {
        alert('❌ Debes iniciar sesión para cambiar tu email. Te redirigimos al login.');
        try {
          localStorage.setItem('postLoginRedirect', '/perfil');
        } catch {}
        navigate('/');
      } else {
        alert(`❌ Error al actualizar el perfil: ${error.message}`);
      }
    } finally {
      // Restaurar el botón
      const saveBtn = document.querySelector('.save-btn');
      if (saveBtn) {
        saveBtn.textContent = 'Guardar';
        saveBtn.disabled = false;
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      email: user?.email || ''
    });
    setEditMode(false);
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
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Mi Perfil</h1>
        <p>Gestiona tu información personal</p>
      </div>

      <div className="perfil-content">
        <div className="perfil-card">
          <div className="perfil-avatar">
            <div className="avatar-placeholder">
              {user?.nombre?.charAt(0)?.toUpperCase() || 'S'}
            </div>
          </div>

          <div className="perfil-info">
            {!editMode ? (
              <>
                <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ minWidth: 60 }}>Email:</label>
                  <span style={{ flex: 1 }}>{user?.email || 'No especificado'}</span>
                  <button 
                    className="primary-btn"
                    onClick={() => setEditMode(true)}
                    style={{ minWidth: 110 }}
                  >
                    Editar email
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="form-row">
                  <label>Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="tu@email.com"
                  />
                </div>
                                 <div className="form-actions">
                  <button className="primary-btn save-btn" onClick={handleSave}>Guardar</button>
                  <button className="danger-btn" onClick={handleCancel}>Cancelar</button>
                 </div>
                 <div className="save-info" style={{
                   marginTop: '1rem',
                   padding: '0.75rem',
                   background: '#1a1a1d',
                   border: '1px solid #444',
                   borderRadius: '6px',
                   fontSize: '0.9rem',
                   color: '#ccc'
                 }}>
                   <p>💡 <strong>Nota:</strong> El cambio de email puede tardar unos segundos en procesarse.</p>
                 </div>
              </>
            )}
          </div>
        </div>

                 <div className="perfil-stats">
           <h3>Estadísticas</h3>
           <div className="stats-grid">
             <div className="stat-item">
               <div className="stat-number">
                 {JSON.parse(localStorage.getItem('archivados') || '[]').filter(item => item.tipo === 'trend').length}
               </div>
               <div className="stat-label">Archivados</div>
             </div>
           </div>
           
           <div className="email-info">
             <h4>ℹ️ Información sobre cambio de email</h4>
             <p>Al cambiar tu email, Supabase enviará un enlace de verificación al nuevo email. Deberás verificar el nuevo email antes de poder usarlo para iniciar sesión.</p>
              <button 
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                      alert(`📧 Estado del Email:\n\n` +
                            `🔵 En Supabase: ${user.email}\n` +
                            `🟡 En localStorage: ${localUser.email || 'No encontrado'}\n` +
                            `🟢 En estado local: ${user?.email || 'No encontrado'}\n\n` +
                            `💡 Si los emails son diferentes, espera unos segundos y verifica nuevamente.`);
                    } else {
                      alert('❌ No se pudo obtener información del usuario de Supabase');
                    }
                  } catch (error) {
                    alert(`❌ Error obteniendo usuario: ${error.message}`);
                  }
                }}
                className="primary-btn"
                style={{ marginTop: '1rem' }}
              >
                Verificar estado del email
              </button>
           </div>
         </div>
      </div>
    </div>
  );
}

export default Perfil;
