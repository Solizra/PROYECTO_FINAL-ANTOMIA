import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Home.css";
import { supabase } from "../supabaseClient";

function Home() {
  const ojo= "https://cdn-icons-png.freepik.com/512/3722/3722014.png";
  const location = useLocation();
  const navigate = useNavigate();

  const [trends, setTrends] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sseConnected, setSseConnected] = useState(false);
  const [procesandoNoticias, setProcesandoNoticias] = useState(false);
  const [trendsCreados, setTrendsCreados] = useState(0);

  const sortByDateDesc = (items) => {
    const parse = (v) => {
      const d = v ? new Date(v) : null;
      return isNaN(d?.getTime?.()) ? 0 : d.getTime();
    };
    return [...items].sort((a, b) => parse(b.fechaRelacion) - parse(a.fechaRelacion));
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      navigate("/"); // si no hay sesión, redirige a login
    }
    // Cargar siempre desde la BDD al iniciar
    (async () => {
      try {
        console.log('🔄 Cargando trends desde la base de datos...');
        const res = await fetch('http://localhost:3000/api/Trends?limit=1000');
        console.log('📡 Respuesta del servidor:', res.status, res.statusText);
        
        if (!res.ok) {
          console.error('❌ Error en la respuesta del servidor:', res.status, res.statusText);
          return;
        }
        
        const data = await res.json();
        console.log('📊 Datos recibidos:', data.length, 'trends');
        console.log('📋 Primer trend:', data[0]);
        
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((t, idx) => ({
            id: t.id ?? idx,
            newsletterTitulo: t.Nombre_Newsletter_Relacionado || '',
            newsletterId: t.id_newsletter ?? '',
            fechaRelacion: t.Fecha_Relación || '',
            trendTitulo: t.Título_del_Trend || '',
            trendLink: t.Link_del_Trend || '',
            relacionado: !!t.Relacionado,
            newsletterLink: '',
            analisisRelacion: t.Analisis_relacion || '',
            resumenFama: '',
            autor: '',
          }));
          console.log('🗂️ Trends mapeados:', mapped.length);
          console.log('📝 Primer trend mapeado:', mapped[0]);
          setTrends(sortByDateDesc(mapped));
        } else {
          console.log('ℹ️ No hay trends en la base de datos');
        }
      } catch (error) {
        console.error('❌ Error cargando trends:', error);
      }
    })();
  }, []);

  // Eliminado: auto-análisis que poblaba tabla sin depender de la BDD

  // Conexión a Server-Sent Events para actualizaciones en tiempo real
  useEffect(() => {
    let eventSource = null;
    let isMounted = true;
    let reconnectAttempts = 0;
    let reconnectTimeout = null;
    const maxReconnectAttempts = 5;

    const connectToSSE = () => {
      try {
        console.log('🔌 Intentando conectar a SSE...');
        eventSource = new EventSource('http://localhost:3000/api/events');
        
        eventSource.onopen = () => {
          console.log('🔌 ✅ Conectado al servidor de eventos SSE');
          setSseConnected(true);
          reconnectAttempts = 0; // Resetear intentos de reconexión
        };

        eventSource.onmessage = (event) => {
          if (!isMounted) return;
          
          console.log('📡 Mensaje SSE recibido (raw):', event.data);
          
          try {
            const data = JSON.parse(event.data);
            console.log('📡 Evento parseado:', data);
            
            switch (data.type) {
              case 'newTrend':
                console.log('🎯 Evento newTrend recibido. Recargando desde BDD.');
                cargarTrendsDesdeBDD();
                break;
                
              case 'newsUpdate':
                console.log('📰 Evento newsUpdate recibido:', data.data);
                console.log('📰 Tipo de notificación:', data.data.tipo);
                console.log('📰 Cantidad de trends:', data.data.count);
                
                // Mostrar notificación visual de que se procesaron nuevas noticias
                if (data.data.count > 0) {
                  setProcesandoNoticias(true);
                  
                  if (data.data.tipo === 'trendsCreados') {
                    // ¡NUEVOS TRENDS CREADOS! Recargar inmediatamente
                    console.log(`🎉 ¡Se crearon ${data.data.count} nuevos trends! Recargando tabla...`);
                    setTrendsCreados(data.data.count);
                    
                    // Recargar la tabla inmediatamente
                    setTimeout(() => {
                      console.log('🔄 Ejecutando cargarTrendsDesdeBDD...');
                      cargarTrendsDesdeBDD();
                      setProcesandoNoticias(false);
                      setTrendsCreados(0);
                    }, 500); // Solo 500ms para trends nuevos
                    
                  } else if (data.data.tipo === 'noticiasProcesadas') {
                    // Solo noticias procesadas, no hay trends nuevos
                    console.log('📰 Noticias procesadas (sin trends nuevos)');
                    setProcesandoNoticias(false);
                    
                  } else {
                    // Tipo no especificado, recargar por si acaso
                    console.log('📰 Tipo de notificación no especificado, recargando tabla...');
                    setTimeout(() => {
                      cargarTrendsDesdeBDD();
                      setProcesandoNoticias(false);
                    }, 2000);
                  }
                }
                break;
                
              case 'connected':
                console.log('✅ Conexión establecida con el servidor');
                break;
                
              case 'heartbeat':
                // Mantener conexión activa
                break;
                
              case 'history':
                // Cargar historial de eventos recientes
                if (data.events && data.events.length > 0) {
                  const recentTrends = data.events
                    .filter(e => e.type === 'newTrend')
                    .map(e => e.data);
                  if (recentTrends.length > 0) {
                    setTrends(prev => {
                      const seen = new Set(prev.map(p => `${p.trendLink}|${p.newsletterId ?? 'null'}`));
                      const uniqueRecent = recentTrends.filter(t => {
                        const k = `${t.trendLink}|${t.newsletterId ?? 'null'}`;
                        if (seen.has(k)) return false;
                        seen.add(k);
                        return true;
                      });
                      const combined = [...uniqueRecent, ...prev];
                      return sortByDateDesc(combined);
                    });
                  }
                }
                break;
                
              default:
                console.log('📡 Evento desconocido:', data.type);
            }
          } catch (parseError) {
            console.error('Error parseando evento:', parseError);
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ Error en conexión SSE:', error);
          console.error('❌ Detalles del error:', {
            readyState: eventSource?.readyState,
            url: eventSource?.url,
            withCredentials: eventSource?.withCredentials
          });
          setSseConnected(false);
          
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          
          // Solo reintentar si no hemos excedido el máximo de intentos
          if (reconnectAttempts < maxReconnectAttempts && isMounted) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
            console.log(`🔄 Reintentando conexión SSE (intento ${reconnectAttempts}/${maxReconnectAttempts}) en ${delay}ms...`);
            
            reconnectTimeout = setTimeout(() => {
              if (isMounted) {
                connectToSSE();
              }
            }, delay);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.error('❌ Máximo de intentos de reconexión alcanzado. Usando fallback de polling.');
            // Aquí podríamos activar un fallback de polling
          }
        };

      } catch (error) {
        console.error('❌ Error conectando a SSE:', error);
      }
    };

    // Conectar al servidor de eventos
    console.log('🚀 Iniciando conexión SSE...');
    connectToSSE();

    // Cleanup al desmontar
    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };
  }, []);

  // Función para cargar trends desde la base de datos
  const cargarTrendsDesdeBDD = async () => {
    try {
      console.log('🔄 Recargando trends desde la base de datos...');
      const res = await fetch('http://localhost:3000/api/Trends?limit=1000');
      console.log('📡 Respuesta cargarTrendsDesdeBDD:', res.status, res.statusText);
      
      if (!res.ok) {
        console.log('⚠️ Backend no disponible para cargar trends');
        return;
      }
      const data = await res.json();
      console.log('📊 Datos cargarTrendsDesdeBDD:', data.length, 'trends');
      
      if (!Array.isArray(data)) {
        console.log('❌ Los datos no son un array:', typeof data, data);
        return;
      }
      
      const mapped = data.map((t, idx) => ({
        id: t.id ?? idx,
        newsletterTitulo: t.Nombre_Newsletter_Relacionado || '',
        newsletterId: t.id_newsletter ?? '',
        fechaRelacion: t.Fecha_Relación || '',
        trendTitulo: t.Título_del_Trend || '',
        trendLink: t.Link_del_Trend || '',
        relacionado: !!t.Relacionado,
        newsletterLink: '',
        analisisRelacion: t.Analisis_relacion || '',
        resumenFama: '',
        autor: '',
      }));
      
      console.log('🗂️ Trends mapeados en cargarTrendsDesdeBDD:', mapped.length);
      
      if (mapped.length) {
        const trendsAnteriores = trends.length;
        setTrends(sortByDateDesc(mapped));
        
        // Solo mostrar mensaje de "nuevos trends" si realmente hay más que antes
        if (trendsAnteriores > 0 && mapped.length > trendsAnteriores) {
          const nuevos = mapped.length - trendsAnteriores;
          console.log(`🎉 ¡Se agregaron ${nuevos} nuevos trends a la tabla!`);
          console.log(`📊 Total anterior: ${trendsAnteriores} → Total actual: ${mapped.length}`);
        } else if (trendsAnteriores === 0) {
          console.log(`✅ Carga inicial: Se cargaron ${mapped.length} trends desde la BDD`);
        } else {
          console.log(`✅ Se recargaron ${mapped.length} trends desde la BDD (sin cambios)`);
        }
      } else {
        console.log('ℹ️ No hay trends en la base de datos');
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.log('⚠️ Backend no disponible - Error de conexión');
      } else {
        console.error('❌ Error cargando trends desde BDD:', error);
      }
    }
  };

  // Fallback: refresco automático cada 60s desde la BDD (solo si no hay SSE)
  useEffect(() => {
    let isMounted = true;
    const cargarTrends = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/Trends?limit=1000');
        if (!res.ok) {
          console.log('⚠️ Fallback: Backend no disponible');
          return;
        }
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const mapped = data.map((t, idx) => ({
          id: t.id ?? idx,
          newsletterTitulo: t.Nombre_Newsletter_Relacionado || '',
          newsletterId: t.id_newsletter ?? '',
          fechaRelacion: t.Fecha_Relación || '',
          trendTitulo: t.Título_del_Trend || '',
          trendLink: t.Link_del_Trend || '',
          relacionado: !!t.Relacionado,
          newsletterLink: '',
          analisisRelacion: t.Analisis_relacion || '',
          resumenFama: '',
          autor: '',
        }));
        if (isMounted && mapped.length) {
          setTrends(mapped);
        }
      } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          console.log('⚠️ Fallback: Backend no disponible - Error de conexión');
        }
      }
    };

    const intervalId = setInterval(cargarTrends, 60 * 1000);
    return () => { isMounted = false; clearInterval(intervalId); };
  }, []);

  const handleArchive = (trend) => {
    console.log('📁 Archivando trend:', trend);
    
    // Obtener archivados existentes
    const archivados = JSON.parse(localStorage.getItem('archivados') || '[]');
    
    // Agregar el nuevo trend archivado
    const trendArchivado = {
      ...trend,
      tipo: 'trend', // Agregar explícitamente el tipo
      fechaArchivado: new Date().toISOString(),
      estado: 'archivado'
    };
    
    archivados.push(trendArchivado);
    localStorage.setItem('archivados', JSON.stringify(archivados));
    
    // Remover de la tabla de trends
    setTrends(prev => prev.filter(t => t.id !== trend.id));
    
    // Mostrar mensaje de éxito
    setSuccess('✅ Trend archivado correctamente');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id) => {
    console.log('🗑️ Intentando eliminar trend con ID:', id);
    
    // Optimista: quitar de UI
    setTrends((prev) => {
      const filtered = prev.filter((trend) => trend.id !== id);
      console.log(`✅ Trend eliminado de UI. Total antes: ${prev.length}, después: ${filtered.length}`);
      return filtered;
    });
    
    // Si es un id válido (número), intentar borrar en backend
    if (id !== undefined && id !== null && !isNaN(Number(id))) {
      try {
        console.log(`🌐 Enviando DELETE a: http://localhost:3000/api/Trends/${id}`);
        const res = await fetch(`http://localhost:3000/api/Trends/${id}`, { method: 'DELETE' });
        
        if (res.ok) {
          console.log('✅ Trend eliminado exitosamente del backend');
        } else {
          console.error('❌ Error al borrar trend en backend. Status:', res.status);
          const errorData = await res.json().catch(() => ({}));
          console.error('Error details:', errorData);
        }
      } catch (e) {
        console.error('❌ Error de conexión al eliminar trend:', e);
      }
    } else {
      console.warn('⚠️ ID inválido para eliminar:', id);
    }
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

      console.log('🔍 Resultado del análisis manual:', data);

      // Mostrar solo filas realmente insertadas en la BDD
      const inserts = Array.isArray(data.inserts) ? data.inserts : [];
      if (inserts.length > 0) {
        await cargarTrendsDesdeBDD();
      }
      
      // Mostrar mensaje de éxito
      if (data.inserts && data.inserts.length > 0) {
        const trendsCreados = data.inserts.length;
        console.log(`✅ Se crearon ${trendsCreados} nuevos trends en la base de datos`);
        
        // Limpiar el input después de agregar exitosamente
        setInput('');
        
        // Mostrar mensaje de éxito
        setError('');
        setSuccess(`✅ Se agregaron ${trendsCreados} nuevos trends a la tabla!`);
        
        // Limpiar mensaje de éxito después de 5 segundos
        setTimeout(() => {
          setSuccess('');
        }, 5000);
      } else {
        // No mostrar nada si no hubo insert; evitar filas sintéticas
        setError('');
        setSuccess('');
      }
      
    } catch (e) {
      console.error('❌ Error en análisis manual:', e);
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

      <main className="main-content">
        <div className="header-section">
          <h1 className="main-title">Últimos trends reconocidos</h1>
                     <div className="connection-status">
             <span className={`status-indicator ${sseConnected ? 'connected' : 'disconnected'}`}>
               {sseConnected ? '🟢' : '🔴'}
             </span>
             <span className="status-text">
               {sseConnected ? 'Actualización en tiempo real' : 'Modo offline'}
             </span>
             {!sseConnected && (
               <span className="backend-status" style={{ 
                 marginLeft: '10px', 
                 padding: '2px 8px', 
                 background: '#ff6b6b', 
                 color: 'white', 
                 borderRadius: '12px', 
                 fontSize: '12px',
                 fontWeight: 'bold'
               }}>
                 ⚠️ Backend Offline
               </span>
             )}
            <button 
              onClick={async () => {
                try {
                  console.log('🧪 Ejecutando búsqueda manual de noticias...');
                  const response = await fetch('http://localhost:3000/api/news/search-now', {
                    method: 'POST'
                  });
                  const data = await response.json();
                  console.log('✅ Búsqueda manual ejecutada:', data);
                  alert(`Búsqueda ejecutada: ${data.message}`);
                } catch (error) {
                  console.error('❌ Error en búsqueda manual:', error);
                  alert('Error ejecutando búsqueda manual');
                }
              }}
              style={{ 
                marginLeft: '10px', 
                padding: '5px 10px', 
                background: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔍 Buscar Noticias
            </button>
                         {procesandoNoticias && (
               <div className="processing-indicator">
                 <span className="spinner">⏳</span>
                 <span>
                   {trendsCreados > 0 
                     ? `¡Se crearon ${trendsCreados} nuevos trends! Actualizando tabla...`
                     : 'Procesando nuevas noticias...'
                   }
                 </span>
               </div>
             )}
          </div>
        </div>

        <table className="trends-table">
          <thead>
            <tr>
              <th>Info</th>
              <th>Título del Trend</th>
              <th>Link del Trend</th>
              <th>Nombre Newsletter Relacionado</th>
              <th>Fecha Relación</th>
              <th>Archivar</th>
              <th>Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((trend, index) => (
              <tr key={`${trend.id ?? 'noid'}|${trend.newsletterId ?? 'none'}|${trend.trendLink ?? 'nolink'}|${trend.fechaRelacion ?? 'nofecha'}|${index}`}>
                <td>
                  <Link to={`/trends/${trend.id || ''}`}>
                    <button 
                      className="info-btn-outline"
                      onClick={() => console.log('InfoTrend: Navegando a trend ID:', trend.id, 'Trend completo:', trend)}
                    >
                      <img src="/ojito.png" alt="Ojo" />
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
                <td>{trend.fechaRelacion ? new Date(trend.fechaRelacion).toLocaleString() : '—'}</td>
                <td>
                  <button
                    type="button"
                    className="archive-btn"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleArchive(trend); }}
                    title="Archivar trend"
                  >
                    ✅
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(trend.id); }}
                  >
                    🗙
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="footer">
          <p>🔗 Pega el link de una noticia climatech</p>
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="https://ejemplo.com/noticia-climatech..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError('');
                setSuccess('');
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') analizar(); }}
              disabled={loading}
            />
            <button onClick={analizar} disabled={loading}>
              {loading ? '⏳ Analizando...' : 'Analizar'}
            </button>
          </div>
          {loading && (
            <div style={{ 
              marginTop: '10px', 
              textAlign: 'center', 
              color: '#666',
              fontSize: '14px'
            }}>
              ⏳ Analizando contenido del link...
            </div>
          )}
          {error && (
            <p style={{ 
              color: error.includes('✅') ? 'green' : 'red', 
              marginTop: 8,
              fontWeight: error.includes('✅') ? 'bold' : 'normal'
            }}>
              {error}
            </p>
          )}
          {success && (
            <p style={{ 
              color: 'green', 
              marginTop: 8,
              fontWeight: 'bold'
            }}>
              {success}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default Home;


