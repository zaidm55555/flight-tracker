import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toggleRoute, deleteRoute } from '../api'
import Spinner from '../components/Spinner'

export default function ManageRoutes() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  function loadRoutes() {
    setLoading(true)
    fetch('/api/routes')
      .then(r => r.json())
      .then(data => { setRoutes(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(loadRoutes, [])

  async function handleToggle(id) {
    try {
      await toggleRoute(id)
      loadRoutes()
    } catch {}
  }

  async function handleDelete(id) {
    if (!confirm('Delete this route from your tracking?')) return
    setDeletingId(id)
    try {
      await deleteRoute(id)
      loadRoutes()
    } catch {}
    setDeletingId(null)
  }

  return (
    <div className="manage-body">
      <div className="container">
        <Link to="/" className="back-link">← Back</Link>
        <h1>Manage Routes</h1>
        <p className="subtitle">Pause, resume, or delete tracked routes</p>

        {loading ? (
          <Spinner text="Loading routes..." />
        ) : routes.length > 0 ? (
          routes.map((r, i) => (
            <div className="route-card" key={r._id} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="card-info">
                <div className="route"><span className="code-chip" style={{ fontSize: '0.95rem', padding: '2px 9px' }}>{r.origin}</span> <span className="plane-arrow">✈</span> <span className="code-chip" style={{ fontSize: '0.95rem', padding: '2px 9px' }}>{r.destination}</span></div>
                <div className="meta">
                  {r.date} · Flights: {r.flight_count || 0} · Updates: {r.scrape_count || 0}
                  {r.last_scraped_at ? ' · Last: ' + (() => {
                    try {
                      return new Date(r.last_scraped_at.replace('Z', '+00:00')).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    } catch { return r.last_scraped_at }
                  })() : ''}
                </div>
              </div>
              <span className={`badge ${r.status}`} style={{ marginRight: 4 }}>{r.status}</span>
              <div className="card-actions">
                <Link to={`/search?from=${r.origin}&to=${r.destination}&date=${r.date}`} className="btn-action btn-view">View</Link>
                {r.status === 'active' ? (
                  <button className="btn-action btn-pause" onClick={() => handleToggle(r._id)}>Pause</button>
                ) : (
                  <button className="btn-action btn-resume" onClick={() => handleToggle(r._id)}>Resume</button>
                )}
                <button className="btn-action btn-del" onClick={() => handleDelete(r._id)} disabled={deletingId === r._id}>
                  {deletingId === r._id && <span className="btn-spinner" />}
                  {deletingId === r._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">No routes yet.</div>
        )}
      </div>
    </div>
  )
}
