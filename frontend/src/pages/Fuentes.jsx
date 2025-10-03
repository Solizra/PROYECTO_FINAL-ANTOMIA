import { useEffect, useState } from 'react';
import './Fuentes.css';

function Fuentes() {
  const [fuentes, setFuentes] = useState([]);
  const [dominio, setDominio] = useState('');
  const [categoria, setCategoria] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cargarFuentes = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/Fuentes');
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error('No se pudieron cargar las fuentes');
      // Orden: activas primero, luego alfabético por dominio
      const ordered = [...data].sort((a, b) => {
        if (a.activo === b.activo) return a.dominio.localeCompare(b.dominio);
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
    const d = dominio.trim().toLowerCase();
    const c = categoria.trim();
    if (!d) { setError('Ingresá un dominio'); return; }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/Fuentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dominio: d, categoria: c })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || 'No se pudo agregar la fuente');
      setDominio(''); setCategoria('');
      setSuccess('✅ Fuente agregada');
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
      const res = await fetch(`http://localhost:3000/api/Fuentes?dominio=${encodeURIComponent(d)}`, { method: 'DELETE' });
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
            placeholder="Dominio (ej: reuters.com)"
            value={dominio}
            onChange={(e) => { setDominio(e.target.value); setError(''); setSuccess(''); }}
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
              <th>Dominio</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {fuentes.map((f) => (
              <tr key={f.dominio}>
                <td>{f.dominio}</td>
                <td>{f.categoria || '—'}</td>
                <td>
                  <span className={`badge ${f.activo ? 'activo' : 'inactivo'}`}>
                    {f.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <button className="delete-btn" onClick={() => eliminarFuente(f.dominio)} title="Desactivar">
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


