import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Home.css";
import { supabase } from "../supabaseClient";
import { LogOut } from "lucide-react";

function Home() {
  const ojo= "https://cdn-icons-png.freepik.com/512/3722/3722014.png";
  const location = useLocation();
  const navigate = useNavigate();

  const [trends, setTrends] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      titulo: `Trend ${i + 1}`,
      publicado: i % 2 === 0,
      newsletter: i % 2 === 0 ? "Sí" : "No",
      source: "www.google.com",
    }))
  );

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      navigate("/"); // si no hay sesión, redirige a login
    }
  }, []);

  const handleDelete = (id) => {
    setTrends(trends.filter((trend) => trend.id !== id));
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error al cerrar sesión:", error.message);
    } else {
      localStorage.removeItem("user"); // limpia el storage
      navigate("/");
    }
  };

  return (
    <div className="home-container">
      <aside className="sidebar">
        <h2>AntomIA</h2>
        <nav>
          <ul>
            <li className={location.pathname === "/Home" ? "active" : ""}>
              <Link to="/Home">Trends</Link>
            </li>
            <li
              className={location.pathname === "/publicaciones" ? "active" : ""}
            >
              <Link to="/publicaciones">Publicaciones</Link>
            </li>
          </ul>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} style={{ marginRight: "8px" }} />
          Cerrar sesión
        </button>
      </aside>

      <main className="main-content">
        <h1 className="main-title">Últimos trends reconocidos</h1>

        <table className="trends-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" />
              </th>
              <th>Título</th>
              <th>Status</th>
              <th>Newsletter</th>
              <th>Fuente</th>
              <th>Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((trend) => (
              <tr key={trend.id}>
                <td>
                  <Link to={`/trends/${trend.id}`}>
                    <button className="info-btn-outline">
                      <img src="../src/assets/ojito.png" alt="Ojo"></img>      
                    </button>
                  </Link>
                </td>
                <td>{trend.titulo}</td>
                <td>
                  <span
                    className={
                      trend.publicado
                        ? "status published"
                        : "status not-published"
                    }
                  >
                    {trend.publicado ? "Publicado" : "No publicado"}
                  </span>
                </td>
                <td>{trend.newsletter}</td>
                <td>{trend.source}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(trend.id)}
                  >
                    🗙
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="footer">
          <p>¿Tienes alguna pregunta?</p>
          <div className="input-wrapper">
            <input type="text" placeholder="Escribe aquí..." />
            <button>✈️</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
