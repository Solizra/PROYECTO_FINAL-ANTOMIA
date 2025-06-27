import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Home.css';

function Home() {
  const location = useLocation();

  const [trends, setTrends] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      titulo: `Trend ${i + 1}`,
      publicado: i % 2 === 0,
      newsletter: i % 2 === 0 ? "Sí" : "No",
      source: "www.google.com",
    }))
  );

  const handleDelete = (id) => {
    setTrends(trends.filter(trend => trend.id !== id));
  };

  return (
    <div className="home-container">
      <aside className="sidebar">
        <h2>AntomIA</h2>
        <nav>
          <ul>
            <li className={location.pathname === '/Home' ? 'active' : ''}>
              <Link to="/Home">Trends</Link>
            </li>
            <li className={location.pathname === '/publicaciones' ? 'active' : ''}>
              <Link to="/publicaciones">Publicaciones</Link>
            </li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        <h1 className="main-title">Últimos trends reconocidos</h1>

        <table className="trends-table">
          <thead>
            <tr>
              <th><input type="checkbox" /></th>
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
                <td><input type="checkbox" /></td>
                <td>{trend.titulo}</td>
                <td>
                  <span className={trend.publicado ? "status published" : "status not-published"}>
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
