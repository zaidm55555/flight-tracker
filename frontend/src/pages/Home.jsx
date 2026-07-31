import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Spinner from '../components/Spinner'

export default function Home({ user }) {
  const [routes, setRoutes] = useState([])
  const [loadingRoutes, setLoadingRoutes] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/routes')
      .then(r => r.json())
      .then(data => { setRoutes(data); setLoadingRoutes(false) })
      .catch(() => setLoadingRoutes(false))
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!selectedRoute) return
    const r = routes.find(x => x._id === selectedRoute)
    if (r) navigate(`/search?from=${r.origin}&to=${r.destination}&date=${r.date}`)
  }

  return (
    <div className="container">
      <div className="header">
        <h1>FlightPulse</h1>
        <p>Track flight prices across routes</p>
        {user && (
          <div className="user-chip">
            {user.picture
              ? <img className="user-avatar" src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
              : <div className="user-avatar user-avatar-fallback">{user.name?.charAt(0) || 'U'}</div>}
            <span className="user-name">{user.name}</span>
            <a href="/logout" className="user-logout">Log out</a>
          </div>
        )}
      </div>

      <div className="card search-card">
        <form onSubmit={handleSubmit}>
          <select
            className="field-input"
            value={selectedRoute}
            onChange={e => setSelectedRoute(e.target.value)}
            required
          >
            <option value="" disabled>Select your tracked route</option>
            {routes.map(r => (
              <option key={r._id} value={r._id}>
                {r.origin} → {r.destination} · {r.date} ({r.status})
              </option>
            ))}
          </select>
          <button type="submit" className="btn-search">Search Flights</button>
        </form>
      </div>

      {loadingRoutes ? (
        <Spinner text="Loading routes..." />
      ) : routes.filter(r => r.status === 'active').length > 0 ? (
        routes.filter(r => r.status === 'active').map(r => (
          <Link
            key={r._id}
            to={`/search?from=${r.origin}&to=${r.destination}&date=${r.date}`}
            className="card route-card-link"
          >
            <div className="route-header">
              <div className="route-cities">{r.origin} <span className="arrow">→</span> {r.destination}</div>
              <div className="route-actions">
                <span className={`badge ${r.status}`}>{r.status}</span>
                <span className="chevron">›</span>
              </div>
            </div>
            <div className="route-meta">
              <span>{r.date}</span>
              <span>·</span>
              <span>Flights: <span className="count">{r.flight_count || 0}</span></span>
              {r.last_scraped_at && (
                <>
                  <span>·</span>
                  <span>Last: {
                    (() => {
                      try {
                        return new Date(r.last_scraped_at.replace('Z', '+00:00')).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      } catch { return r.last_scraped_at }
                    })()
                  }</span>
                </>
              )}
            </div>
          </Link>
        ))
      ) : (
        <div className="empty">
          <p>No routes being tracked yet.<br />Add your first route to start monitoring flight prices.</p>
        </div>
      )}

      <Link to="/add-route" className="btn-add" style={{ marginTop: 12 }}>+ Add Route</Link>

      <div className="footer">Powered by Google Flights · Updates every 4 hours</div>
    </div>
  )
}
