import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Home.css";
import { supabase } from "../supabaseClient";
import { LogOut } from "lucide-react";

function Home() {
  const ojo= "https://cdn-icons-png.freepik.com/512/3722/3722014.png";
  const location = useLocation();
  const navigate = useNavigate();

  const [trends, setTrends] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      navigate("/"); // si no hay sesión, redirige a login
    }
  }, []);

  const handleDelete = (id) => {
    setTrends(trends.filter((trend) => trend.id !== id));
  };

  const analizar = async () => {
    setError('');
    if (!input.trim()) return;
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/Newsletter/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && (data.error || data.message)) || 'Error en el análisis');

      const filas = (data.newslettersRelacionados || []).map((nl, idx) => ({
        id: nl.id ?? idx,
        titulo: nl.titulo,
        publicado: true,
        newsletter: 'Sí',
        source: nl.link || 'N/A',
      }));

      // Si es Climatech pero no hay newsletters relacionados, mostrar la noticia como fila informativa
      if (filas.length === 0 && data.esClimatech) {
        filas.push({
          id: 'info',
          titulo: data.titulo || 'Resultado',
          publicado: false,
          newsletter: 'No',
          source: data.url || 'N/A',
        });
      }

      setTrends(filas);
    } catch (e) {
      setError(e.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
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
          <p>Pegá el link de una noticia o escribe texto para analizar</p>
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="https://..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') analizar(); }}
              disabled={loading}
            />
            <button onClick={analizar} disabled={loading}>
              {loading ? 'Analizando...' : 'Analizar'}
            </button>
          </div>
          {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
        </div>
      </main>
    </div>
  );
}

export default Home;


