import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Archivados.css";
import { supabase } from "../supabaseClient";

// Función para obtener datos del localStorage
const getArchivadosFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem('archivados') || '[]');
  } catch (error) {
    console.error('Error al leer archivados del localStorage:', error);
    return [];
  }
};

function Archivados() {
  const navigate = useNavigate();
  const [archivados, setArchivados] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData) {
        navigate("/");
        return;
      }
      
      // Cargar archivados desde localStorage
      const archivadosData = getArchivadosFromStorage();
      setArchivados(archivadosData);
      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  const handleRestaurar = (id) => {
    const archivado = archivados.find(item => item.id === id);
    if (archivado) {
      // Remover del localStorage
      const archivadosActualizados = archivados.filter(item => item.id !== id);
      localStorage.setItem('archivados', JSON.stringify(archivadosActualizados));
      
      // Actualizar estado
      setArchivados(archivadosActualizados);
      
      alert('Elemento restaurado correctamente');
    }
  };

  const handleEliminar = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar permanentemente este elemento?')) {
      // Remover del localStorage
      const archivadosActualizados = archivados.filter(item => item.id !== id);
      localStorage.setItem('archivados', JSON.stringify(archivadosActualizados));
      
      // Actualizar estado
      setArchivados(archivadosActualizados);
      
      alert('Elemento eliminado permanentemente');
    }
  };

  const filteredArchivados = archivados.filter(item => {
    // Solo mostrar trends (no publicaciones)
    if (item.tipo !== 'trend') return false;
    
    const matchesSearch = item.trendTitulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.newsletterTitulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.analisisRelacion?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Debug: mostrar en consola qué se está cargando
  console.log('📁 Archivados cargados:', archivados);
  console.log('📁 Archivados filtrados:', filteredArchivados);
  console.log('📁 Archivados con tipo trend:', archivados.filter(item => item.tipo === 'trend'));



  if (loading) {
    return (
      <div className="archivados-container">
        <div className="loading">Cargando elementos archivados...</div>
      </div>
    );
  }

  return (
    <div className="archivados-container">
      <div className="archivados-header">
        <h1>Elementos Archivados</h1>
        <p>Gestiona y organiza tu contenido archivado</p>
      </div>

      <div className="archivados-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Buscar en archivados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="debug-section">
          <button 
            onClick={() => {
              console.log('🧹 Limpiando localStorage...');
              localStorage.removeItem('archivados');
              setArchivados([]);
              alert('localStorage limpiado');
            }}
            style={{
              padding: '0.5rem 1rem',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🧹 Limpiar
          </button>
        </div>
      </div>

      <div className="archivados-stats">
        <div className="stat-card">
          <div className="stat-number">{archivados.filter(item => item.tipo === 'trend').length}</div>
          <div className="stat-label">Total Archivados</div>
        </div>
      </div>

      <div className="archivados-content">
        {filteredArchivados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>No hay elementos archivados</h3>
            <p>Los elementos que archives aparecerán aquí para su gestión posterior.</p>
          </div>
        ) : (
          <div className="archivados-grid">
            {filteredArchivados.map((item) => (
              <div key={item.id} className="archivado-card">
                <div className="archivado-header">
                  <div className="tipo-badge">
                    📊 Trend Archivado
                  </div>
                  <div className="fecha-archivado">
                    Archivado: {new Date(item.fechaArchivado).toLocaleDateString('es-ES')}
                  </div>
                </div>
                
                <div className="archivado-content">
                  <h3 className="archivado-titulo">{item.trendTitulo || 'Sin título'}</h3>
                  <div className="archivado-info">
                    <div className="info-row">
                      <strong>Link del Trend:</strong>
                      <a href={item.trendLink} target="_blank" rel="noreferrer" className="trend-link">
                        {item.trendLink || 'Sin link'}
                      </a>
                    </div>
                    <div className="info-row">
                      <strong>Newsletter Relacionado:</strong>
                      <span>{item.newsletterTitulo || 'Sin newsletter'}</span>
                    </div>
                    <div className="info-row">
                      <strong>Fecha de Relación:</strong>
                      <span>{item.fechaRelacion ? new Date(item.fechaRelacion).toLocaleDateString('es-ES') : 'Sin fecha'}</span>
                    </div>
                    <div className="info-row">
                      <strong>Análisis de Relación:</strong>
                      <span>{item.analisisRelacion || 'Sin análisis'}</span>
                    </div>
                    {item.resumenFama && (
                      <div className="info-row">
                        <strong>Resumen de Fama:</strong>
                        <span>{item.resumenFama}</span>
                      </div>
                    )}
                    {item.autor && (
                      <div className="info-row">
                        <strong>Autor:</strong>
                        <span>{item.autor}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="archivado-actions">
                  <button
                    className="restaurar-btn"
                    onClick={() => handleRestaurar(item.id)}
                  >
                    🔄 Restaurar
                  </button>
                  <button
                    className="eliminar-btn"
                    onClick={() => handleEliminar(item.id)}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filteredArchivados.length > 0 && (
        <div className="bulk-actions">
          <button className="bulk-restaurar-btn">
            🔄 Restaurar Todos
          </button>
          <button className="bulk-eliminar-btn">
            🗑️ Eliminar Todos
          </button>
        </div>
      )}
    </div>
  );
}

export default Archivados;
