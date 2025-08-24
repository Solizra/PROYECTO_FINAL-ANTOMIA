import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "./InfoTrend.css";

function InfoTrend() {
  const { id } = useParams();
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTrendData = async () => {
      try {
        setLoading(true);
        
        // First try to get from localStorage
        const saved = localStorage.getItem('trends');
        const list = saved ? JSON.parse(saved) : [];
        const current = list.find((t) => String(t.id) === String(id));
        
        console.log('InfoTrend: ID buscado:', id);
        console.log('InfoTrend: Datos en localStorage:', list);
        console.log('InfoTrend: Trend encontrado en localStorage:', current);
        
        if (current) {
          // Data found in localStorage
          const trendData = {
            titulo: current.trendTitulo || `Trend ${id}`,
            descripcion: current.resumenFama || '—',
            razonamientoIA: current.analisisRelacion || '—',
            fecha: current.fechaRelacion ? new Date(current.fechaRelacion).toLocaleString() : '—',
            fuente: current.trendLink || '—',
            personas: current.autor || '',
            newsletterLink: current.newsletterLink || '',
            newsletterTitulo: current.newsletterTitulo || '',
          };
          
          console.log('InfoTrend: Datos mapeados desde localStorage:', trendData);
          console.log('InfoTrend: Campo analisisRelacion original:', current.analisisRelacion);
          console.log('InfoTrend: Campo razonamientoIA mapeado:', trendData.razonamientoIA);
          setTrend(trendData);
        } else {
          // If not in localStorage, try to fetch from backend
          console.log('InfoTrend: No encontrado en localStorage, buscando en backend...');
          const response = await fetch(`http://localhost:3000/api/Trends/${id}`);
          if (response.ok) {
            const trendData = await response.json();
            console.log('InfoTrend: Datos obtenidos del backend:', trendData);
            console.log('InfoTrend: Campo Analisis_relacion original:', trendData.Analisis_relacion);
            
            const mappedTrend = {
              titulo: trendData.Título_del_Trend || `Trend ${id}`,
              descripcion: trendData.Resumen_Fama || '—',
              razonamientoIA: trendData.Analisis_relacion || '—',
              fecha: trendData.Fecha_Relación ? new Date(trendData.Fecha_Relación).toLocaleString() : '—',
              fuente: trendData.Link_del_Trend || '—',
              personas: trendData.Autor || '',
              newsletterLink: trendData.Newsletter_Link || '',
              newsletterTitulo: trendData.Nombre_Newsletter_Relacionado || '',
            };
            
            console.log('InfoTrend: Datos mapeados desde backend:', mappedTrend);
            console.log('InfoTrend: Campo razonamientoIA mapeado:', mappedTrend.razonamientoIA);
            setTrend(mappedTrend);
          } else {
            throw new Error('Trend no encontrado');
          }
        }
      } catch (err) {
        console.error('Error cargando trend:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadTrendData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="infotrend-container">
        <div className="infotrend-inner">
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <p>Cargando información del trend...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="infotrend-container">
        <div className="infotrend-inner">
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <p>Error: {error}</p>
            <Link to="/Home" className="back-btn">
              ⬅ Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!trend) {
    return (
      <div className="infotrend-container">
        <div className="infotrend-inner">
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <p>Trend no encontrado</p>
            <Link to="/Home" className="back-btn">
              ⬅ Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            
          </div>
        </section>
      </div>
    </div>
  );
}

export default InfoTrend;
