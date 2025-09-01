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
      // Actualizar en Supabase
      const { data, error } = await supabase.auth.updateUser({
        email: formData.email
      });

      if (error) {
        throw error;
      }

      // Actualizar en localStorage
      const updatedUser = { ...user, email: formData.email };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditMode(false);
      
      // Mostrar mensaje de éxito
      alert("Perfil actualizado correctamente en Supabase");
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      alert(`Error al actualizar el perfil: ${error.message}`);
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
        <h1>Mi Perfil</h1>
        <p>Gestiona tu información personal y preferencias</p>
      </div>

      <div className="perfil-content">
        <div className="perfil-card">
          <div className="perfil-avatar">
            <div className="avatar-placeholder">
              {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>

          <div className="perfil-info">
            {!editMode ? (
              <>
                <div className="info-row">
                  <label>Email:</label>
                  <span>{user?.email || 'No especificado'}</span>
                </div>
                <button 
                  className="edit-btn"
                  onClick={() => setEditMode(true)}
                >
                  Editar Email
                </button>
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
                  <button className="save-btn" onClick={handleSave}>
                    Guardar
                  </button>
                  <button className="cancel-btn" onClick={handleCancel}>
                    Cancelar
                  </button>
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
        </div>
      </div>
    </div>
  );
}

export default Perfil;
