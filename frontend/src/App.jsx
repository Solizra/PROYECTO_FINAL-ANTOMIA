import { Routes, Route } from 'react-router-dom';
import Login from "./pages/Login";
import Home from "./pages/Home";
import Layout from "./components/Layout";
import InfoTrend from "./pages/InfoTrend";
import Perfil from "./pages/Perfil";
import Archivados from "./pages/Archivados"; 
import Fuentes from "./pages/Fuentes";
import Newsletters from "./pages/Newsletters";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ChangePassword from "./pages/ChangePassword";

function App() {
  return (
    <Routes>
      /* Rutas sin layout */
      <Route path="/" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />

      /* Rutas con layout */
      <Route element={<Layout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/trends/:id" element={<InfoTrend />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/archivados" element={<Archivados />} />
        <Route path="/fuentes" element={<Fuentes />} />
        <Route path="/newsletters" element={<Newsletters />} />
      </Route>
    </Routes>
  );
}

export default App;