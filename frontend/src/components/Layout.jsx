import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react"; // si usás este ícono
import "./Layout.css";

function Layout() {
  const location = useLocation(); // para saber en qué ruta estás
  const navigate = useNavigate(); // para redirigir al logout

  const handleLogout = () => {
    // Acá borrás tokens, limpias sesión, etc.
    console.log("Sesión cerrada");
    navigate("/"); // redirige al login
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>AntomIA</h2>
        <nav>
          <ul>
            <li className={location.pathname === "/Home" ? "active" : ""}>
              <Link to="/Home">Trends</Link>
            </li>
            <li className={location.pathname === "/publicaciones" ? "active" : ""}>
              <Link to="/publicaciones">Publicaciones</Link>
            </li>
          </ul>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} style={{ marginRight: "8px" }} />
          Cerrar sesión
        </button>
      </aside>

      <main className="content">
        <Outlet /> 
      </main>
    </div>
  );
}

export default Layout;
