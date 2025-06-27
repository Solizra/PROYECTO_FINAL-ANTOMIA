import { Routes, Route } from 'react-router-dom';
import Login from "./pages/Login";
import Home from "./pages/Home";
import Publicaciones from "./pages/Publicaciones";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/publicaciones" element={<Publicaciones />} />
    </Routes>
  );
}

export default App;