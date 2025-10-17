import { useEffect, useState } from 'react';
import './Fuentes.css';

function Newsletters() {
  const [items, setItems] = useState([]);
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cargar = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/Newsletter?limit=100');
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error('No se pudieron cargar los newsletters');
      const ordered = [...data].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
      setItems(ordered);
    } catch (e) {
      setError(e.message || 'Error cargando newsletters');
    }
  };

  useEffect(() => { cargar(); }, []);

  const normalizarUrl = (u) => (u || '').trim();

  const agregar = async () => {
    setError(''); setSuccess('');
    const u = normalizarUrl(link);
    if (!u) { setError('Ingresá una URL'); return; }
    if (!/^https?:\/\//i.test(u)) { setError('La URL debe iniciar con http(s)://'); return; }
    if (!u.startsWith('https://pulsobyantom.substack.com/p')) { setError('Solo se aceptan newsletters de Pulso by Antom (Substack)'); return; }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/Newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: u })
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409) {
        setSuccess('⚠️ Ese newsletter ya existe');
        setLink('');
        await cargar();
        return;
      }
      if (!res.ok) throw new Error((data && (data.error || data.message)) || 'No se pudo agregar');
      setLink('');
      setSuccess('✅ Newsletter agregado');
      await cargar();
    } catch (e) {
      setError(e.message || 'Error agregando newsletter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="infotrend-container">
      <div className="infotrend-inner">
        <div className="infotrend-header">
          <h1 className="infotrend-title">Newsletters</h1>
        </div>

        <div className="fuentes-actions">
          <input
            type="text"
            placeholder="https://ejemplo.com/mi-newsletter"
            value={link}
            onChange={(e) => { setLink(e.target.value); setError(''); setSuccess(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') agregar(); }}
            disabled={loading}
          />
          <button onClick={agregar} disabled={loading}>{loading ? '⏳' : 'Agregar'}</button>
        </div>

        {error && <p style={{ color: 'salmon', textAlign: 'center', marginBottom: 12 }}>{error}</p>}
        {success && <p style={{ color: 'lightgreen', textAlign: 'center', marginBottom: 12 }}>{success}</p>}

        <table className="fuentes-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Link</th>
              <th>Título</th>
            </tr>
          </thead>
          <tbody>
            {items.map(n => (
              <tr key={n.id}>
                <td>{n.id}</td>
                <td>{n.link ? <a href={n.link} target="_blank" rel="noreferrer">{n.link}</a> : '—'}</td>
                <td>{n.titulo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Newsletters;


