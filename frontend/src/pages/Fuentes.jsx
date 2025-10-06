import { useEffect, useState } from 'react';
import './Fuentes.css';

function Fuentes() {
  const [fuentes, setFuentes] = useState([]);
  const [fuente, setFuente] = useState('');
  const [categoria, setCategoria] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cargarFuentes = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/Fuentes');
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error('No se pudieron cargar las fuentes');
      // Orden: activas primero, luego alfabético por fuente
      const ordered = [...data].sort((a, b) => {
        if (a.activo === b.activo) return a.fuente.localeCompare(b.fuente);
        return a.activo ? -1 : 1;
      });
      setFuentes(ordered);
    } catch (e) {
      setError(e.message || 'Error cargando fuentes');
    }
  };

  useEffect(() => { cargarFuentes(); }, []);

  const agregarFuente = async () => {
    setError(''); setSuccess('');
    const d = fuente.trim().toLowerCase();
    const c = categoria.trim();
    if (!d) { setError('Ingresá una fuente (fuente)'); return; }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/Fuentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fuente: d, categoria: c })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || 'No se pudo agregar la fuente');
      setFuente(''); setCategoria('');
      setSuccess(data?.message || '✅ Fuente agregada');
      await cargarFuentes();
    } catch (e) {
      setError(e.message || 'Error agregando fuente');
    } finally {
      setLoading(false);
    }
  };

  const eliminarFuente = async (d) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`http://localhost:3000/api/Fuentes?fuente=${encodeURIComponent(d)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || 'No se pudo eliminar');
      setSuccess('🗑️ Fuente desactivada');
      await cargarFuentes();
    } catch (e) {
      setError(e.message || 'Error eliminando fuente');
    }
  };

  return (
    <div className="infotrend-container">
      <div className="infotrend-inner">
        <div className="infotrend-header">
          <h1 className="infotrend-title">Fuentes utilizadas por la IA</h1>
        </div>

        <div className="fuentes-actions">
          <input
            type="text"
            placeholder="fuente (ej: bbc.com)"
            value={fuente}
            onChange={(e) => {setFuente(e.target.value); setError(''); setSuccess(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') agregarFuente(); }}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Categoría (opcional)"
            value={categoria}
            onChange={(e) => { setCategoria(e.target.value); setError(''); setSuccess(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') agregarFuente(); }}
            disabled={loading}
          />
          <button onClick={agregarFuente} disabled={loading}>{loading ? '⏳' : 'Agregar'}</button>
        </div>

        {error && <p style={{ color: 'salmon', textAlign: 'center', marginBottom: 12 }}>{error}</p>}
        {success && <p style={{ color: 'lightgreen', textAlign: 'center', marginBottom: 12 }}>{success}</p>}

        <table className="fuentes-table">
          <thead>
            <tr>
              <th>Fuente</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {fuentes.map((f) => (
              <tr key={f.fuente}>
                <td>{f.fuente}</td>
                <td>{f.categoria || '—'}</td>
                <td>
                  <span className={`badge ${f.activo ? 'activo' : 'inactivo'}`}>
                    {f.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <button className="delete-btn" onClick={() => eliminarFuente(f.fuente)} title="Desactivar">
                    🗙
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Fuentes;


