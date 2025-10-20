import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from "./pages/Login";
import Home from "./pages/Home";
import Layout from "./components/Layout";
import InfoTrend from "./pages/InfoTrend";
import Perfil from "./pages/Perfil";
import Configuracion from "./pages/Configuracion";
import Archivados from "./pages/Archivados"; 
import Fuentes from "./pages/Fuentes";
import Newsletters from "./pages/Newsletters";
import AuthCallback from "./pages/AuthCallback";
import './styles/themes.css';

function App() {
  return (
    <ThemeProvider>
      <Routes>
        /* Ruta sin layout */
        <Route path="/" element={<Login />} />

        /* Rutas con layout */
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/trends/:id" element={<InfoTrend />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/archivados" element={<Archivados />} />
          <Route path="/fuentes" element={<Fuentes />} />
          <Route path="/newsletters" element={<Newsletters />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;