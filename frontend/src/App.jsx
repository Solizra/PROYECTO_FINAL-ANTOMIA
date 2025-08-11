import { Routes, Route } from 'react-router-dom';
import Login from "./pages/Login";
import Home from "./pages/Home";
import Publicaciones from "./pages/Publicaciones";
import InfoTrend from "./pages/InfoTrend"; 

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/publicaciones" element={<Publicaciones />} />
        <Route path="/trends/:id" element={<InfoTrend />} />

    </Routes>
  );
}

export default App;