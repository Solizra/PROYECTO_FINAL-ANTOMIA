import { useParams, Link } from "react-router-dom";
import "./InfoTrend.css";

function InfoTrend() {
  const { id } = useParams();

  // Datos de ejemplo (luego podés reemplazar con fetch desde Supabase)
  const trend = {
    titulo: `Trend ${id}`,
    descripcion:
      "Este es un breve resumen del trend, explicando de qué se trata y cuáles son sus puntos clave. Un párrafo conciso que ayude a entender la temática.",
    razonamientoIA:
      "La IA seleccionó este trend debido a su impacto potencial en el sector tecnológico, su crecimiento exponencial en las búsquedas y su relevancia en medios internacionales.",
    fecha: "11/08/2025",
    fuente: "https://www.google.com",
    personas: "Elon Musk, Sundar Pichai, Satya Nadella",
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
