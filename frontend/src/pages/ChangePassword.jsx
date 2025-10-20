import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './ChangePassword.css';

function ChangePassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isResetFlow, setIsResetFlow] = useState(false);

  useEffect(() => {
    // Verificar si venimos de un flujo de reset de contraseña
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');
    
    // Detectar si es un flujo de recuperación de contraseña
    if (accessToken && refreshToken && type === 'recovery') {
      setIsResetFlow(true);
      // Establecer la sesión con los tokens del email
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
    } else {
      // Verificar si el usuario está logueado (flujo normal desde perfil)
      const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }
        setIsResetFlow(false);
      };
      checkUser();
    }
  }, [searchParams, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Validaciones
      if (!isResetFlow && !formData.currentPassword) {
        throw new Error('Debes ingresar tu contraseña actual');
      }

      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error('Las contraseñas nuevas no coinciden');
      }

      const passwordError = validatePassword(formData.newPassword);
      if (passwordError) {
        throw new Error(passwordError);
      }

      if (isResetFlow) {
        // Flujo de reset de contraseña
        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.newPassword
        });

        if (updateError) {
          throw updateError;
        }

        setMessage('Contraseña actualizada exitosamente. Serás redirigido al login.');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        // Flujo normal de cambio de contraseña
        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.newPassword
        });

        if (updateError) {
          throw updateError;
        }

        setMessage('Contraseña actualizada exitosamente.');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      setError(error.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-card">
        <div className="change-password-header">
          <h1>{isResetFlow ? 'Establecer Nueva Contraseña' : 'Cambiar Contraseña'}</h1>
          <p>
            {isResetFlow 
              ? 'Crea una nueva contraseña para tu cuenta' 
              : 'Ingresa tu contraseña actual y la nueva contraseña'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          {!isResetFlow && (
            <div className="form-group">
              <label htmlFor="currentPassword">Contraseña Actual</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                placeholder="Tu contraseña actual"
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword">Nueva Contraseña</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Repite la nueva contraseña"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <div className="form-actions">
            <button type="submit" disabled={loading} className="primary-btn">
              {loading ? 'Actualizando...' : (isResetFlow ? 'Establecer Contraseña' : 'Actualizar Contraseña')}
            </button>
            {!isResetFlow && (
              <button 
                type="button" 
                onClick={() => navigate('/perfil')} 
                className="secondary-btn"
                disabled={loading}
              >
                Volver al Perfil
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
