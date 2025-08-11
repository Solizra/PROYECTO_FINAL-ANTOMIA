import { useParams, Link } from "react-router-dom";
import "./InfoTrend.css";

function InfoTrend() {
  const { id } = useParams();
  const saved = localStorage.getItem('trends');
  const list = saved ? JSON.parse(saved) : [];
  const current = list.find((t) => String(t.id) === String(id)) || {};

  const trend = {
    titulo: current.trendTitulo || `Trend ${id}`,
    descripcion: current.resumenFama || '—',
    razonamientoIA: current.analisisRelacion || '—',
    fecha: current.fechaRelacion ? new Date(current.fechaRelacion).toLocaleString() : '—',
    fuente: current.trendLink || '—',
    personas: current.autor || '',
    newsletterLink: current.newsletterLink || '',
    newsletterTitulo: current.newsletterTitulo || '',
  };

  return (
    <div className="infotrend-container">
      <div className="infotrend-inner">
        <header className="infotrend-header">
          <Link to="/Home" className="back-btn">
            ⬅ Volver
          </Link>
          <h1 className="infotrend-title">{trend.titulo}</h1>
        </header>

        <section className="infotrend-section">
          <p className="infotrend-descripcion">{trend.descripcion}</p>

          <div className="infotrend-razonamiento">
            <h2>Razonamiento de la IA</h2>
            <p>{trend.razonamientoIA}</p>
          </div>

          <div className="infotrend-cards">
            <div className="infotrend-card">
              <h3>📅 Fecha</h3>
              <p>{trend.fecha}</p>
            </div>
            <div className="infotrend-card">
              <h3>🔗 Fuente</h3>
              <a href={trend.fuente} target="_blank" rel="noreferrer">
                {trend.fuente}
              </a>
            </div>
            {trend.newsletterLink && (
              <div className="infotrend-card">
                <h3>📧 Newsletter</h3>
                <a href={trend.newsletterLink} target="_blank" rel="noreferrer">
                  {trend.newsletterTitulo || trend.newsletterLink}
                </a>
              </div>
            )}
            <div className="infotrend-card">
              <h3>👥 Personas involucradas</h3>
              <p>{trend.personas}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default InfoTrend;
