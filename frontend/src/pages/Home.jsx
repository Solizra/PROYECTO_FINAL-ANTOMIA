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
    const saved = localStorage.getItem('trends');
    if (saved) {
      try { setTrends(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('trends', JSON.stringify(trends));
  }, [trends]);

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

      // Si la API devolvió inserts (ids guardados), úsalo; sino usa map base
      const baseFilas = (data.newslettersRelacionados || []).map((nl, idx) => ({
        id: nl.id ?? idx,
        newsletterTitulo: nl.titulo || '',
        newsletterId: nl.id ?? '',
        fechaRelacion: nl.fechaRelacion || new Date().toISOString(),
        trendTitulo: data.titulo || '',
        trendLink: data.url || '',
        relacionado: true,
        newsletterLink: nl.link || '',
        analisisRelacion: nl.analisisRelacion || '',
        resumenFama: data.resumenFama || '',
        autor: data.autor || '',
      }));
      const filas = (data.inserts && data.inserts.length > 0)
        ? data.inserts.map((ins, idx) => ({
            id: ins.id ?? idx,
            newsletterTitulo: ins.Nombre_Newsletter_Relacionado || '',
            newsletterId: ins.id_newsletter ?? '',
            fechaRelacion: ins.Fecha_Relación || new Date().toISOString(),
            trendTitulo: ins.Título_del_Trend || data.titulo || '',
            trendLink: ins.Link_del_Trend || data.url || '',
            relacionado: !!ins.Relacionado,
            newsletterLink: ins.newsletterLink || '',
            analisisRelacion: '',
            resumenFama: data.resumenFama || '',
            autor: data.autor || '',
          }))
        : (baseFilas.length > 0 ? baseFilas : [{
            id: 'sin-relacion',
            newsletterTitulo: '',
            newsletterId: '',
            fechaRelacion: '',
            trendTitulo: data.titulo || '',
            trendLink: data.url || '',
            relacionado: false,
          }]);

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
              <th>Título del Trend</th>
              <th>Link del Trend</th>
              <th>Nombre Newsletter Relacionado</th>
              <th>ID Newsletter</th>
              <th>Fecha Relación</th>
              <th>Relacionado</th>
              <th>Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((trend) => (
              <tr key={`${trend.id}-${trend.trendLink || ''}`}>
                <td>
                  <Link to={`/trends/${trend.id || ''}`}>
                    <button className="info-btn-outline">
                      <img src="../src/assets/ojito.png" alt="Ojo" />
                    </button>
                  </Link>
                </td>
                <td>{trend.trendTitulo || '—'}</td>
                <td>
                  {trend.trendLink ? (
                    <a href={trend.trendLink} target="_blank" rel="noreferrer">{trend.trendLink}</a>
                  ) : '—'}
                </td>
                <td>{trend.newsletterTitulo || '—'}</td>
                <td>{trend.newsletterId || '—'}</td>
                <td>{trend.fechaRelacion ? new Date(trend.fechaRelacion).toLocaleString() : '—'}</td>
                <td style={{ textAlign: 'center' }}>{trend.relacionado ? '✔️' : '✖️'}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(trend.id || `${trend.trendTitulo}-${trend.trendLink}`)}
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


