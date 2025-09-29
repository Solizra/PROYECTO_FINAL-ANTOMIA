import { Routes, Route } from 'react-router-dom';
import Login from "./pages/Login";
import Home from "./pages/Home";
import Layout from "./components/Layout";
import InfoTrend from "./pages/InfoTrend";
import Perfil from "./pages/Perfil";
import Archivados from "./pages/Archivados"; 

function App() {
  return (
    <Routes>
      /* Ruta sin layout */
      <Route path="/" element={<Login />} />

      /* Rutas con layout */
      <Route element={<Layout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/trends/:id" element={<InfoTrend />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/archivados" element={<Archivados />} />
      </Route>
    </Routes>
  );
}

export default App;