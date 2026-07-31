import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '../components/Spinner'

export default function Home() {
  const [routes, setRoutes] = useState([])
  const [loadingRoutes, setLoadingRoutes] = useState(true)

  useEffect(() => {
    fetch('/api/routes')
      .then(r => r.json())
      .then(data => { setRoutes(data); setLoadingRoutes(false) })
      .catch(() => setLoadingRoutes(false))
  }, [])

  return (
    <div className="container">
      <div className="hero">
        <div className="hero-sky">
          <div className="sun" />
          <div className="cloud cloud-1" />
          <div className="cloud cloud-2" />
          <div className="cloud cloud-3" />
          <div className="hero-flight" aria-hidden="true">
            <svg className="hero-flight-svg" viewBox="0 0 320 90" preserveAspectRatio="none">
              <path className="flight-dash" d="M -10 84 Q 160 -26 330 84" />
            </svg>
            <div className="hero-plane">✈</div>
          </div>
        </div>
        <div className="hero-content">
          <div className="hero-top">
            <div className="brand-mark">✈</div>
            <div>
              <div className="brand-name">FlightPulse</div>
              <div className="brand-tag">Track flight prices across routes</div>
            </div>
          </div>
        </div>
      </div>

      {loadingRoutes ? (
        <Spinner text="Loading routes..." />
      ) : routes.filter(r => r.status === 'active').length > 0 ? (
        routes.filter(r => r.status === 'active').map((r, i) => (
          <Link
            key={r._id}
            to={`/search?from=${r.origin}&to=${r.destination}&date=${r.date}`}
            className="card route-card-link"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="route-header">
              <div className="route-cities">
                <span className="code-chip">{r.origin}</span>
                <span className="plane-arrow">✈</span>
                <span className="code-chip">{r.destination}</span>
              </div>
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
                  <span className="live-dot" />
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
