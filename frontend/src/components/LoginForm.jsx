import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './LoginForm.css';

function LoginForm() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setCargando(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: usuario,
      password: contrasena,
    });

    setCargando(false);

    if (error) {
      console.error('Login error:', error);
      setErrorMsg('Usuario o contraseña incorrectos');
    } else {
      console.log('Login exitoso:', data);

      localStorage.setItem('user', JSON.stringify(data.user));
    
      navigate('/home');
    }
  };

  return (
    <div className="form-wrapper">
      <img src="/logo.png" alt="Logo AntomIA" className="login-logo" />
      <h2 className="title">AntomIA</h2>
      <p className="subtitle">¡Bienvenido a la IA de Antom!</p>

      <form onSubmit={handleSubmit}>
        <label>Usuario</label>
        <input
          type="email"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          required
          placeholder="ejemplo@email.com"
        />

        <label>Contraseña</label>
        <input
          type="password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
          placeholder="******"
        />

        {errorMsg && <p className="error-msg">{errorMsg}</p>}
        <a href="#">¿Olvidaste tu contraseña?</a>

        <button type="submit" disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Continuar'}
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
