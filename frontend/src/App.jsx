import { Routes, Route } from 'react-router-dom';
import Login from "./pages/Login";
import Home from "./pages/Home";
import Publicaciones from "./pages/Publicaciones";
import Layout from "./components/Layout";
import InfoTrend from "./pages/InfoTrend"; 

function App() {
  return (
    <Routes>
      /* Ruta sin layout */
      <Route path="/" element={<Login />} />

      /* Rutas con layout */
      <Route element={<Layout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/publicaciones" element={<Publicaciones />} />
        <Route path="/trends/:id" element={<InfoTrend />} />
      </Route>
    </Routes>
  );
}

export default App;