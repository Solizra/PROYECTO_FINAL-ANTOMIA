import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../components/Logo.png';
import './LoginForm.css';

function LoginForm() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Acá despues agregamos validación
    navigate('/home');
  };

  return (
    <div className="form-wrapper">
      <img src={logo} alt="Logo AntomIA" className="login-logo" />
      <h2 className="title">AntomIA</h2>
      <p className="subtitle">¡Bienvenido a la IA de Antom!</p>
      <form onSubmit={handleSubmit}>
        <label>Usuario</label>
        <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
        
        <label>Contraseña</label>
        <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required />
        
        <a href="#">¿Olvidaste tu contraseña?</a>
        <button type="submit">Continuar</button>
      </form>
    </div>
  );
}

export default LoginForm;
