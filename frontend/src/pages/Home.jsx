import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AirportAutocomplete from '../components/AirportAutocomplete'
import { fetchStats } from '../api'
import Spinner from '../components/Spinner'

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

export default function Home() {
  const [routes, setRoutes] = useState([])
  const [loadingRoutes, setLoadingRoutes] = useState(true)
  const [stats, setStats] = useState({ total: 0, routes: 0, last_scrape: 'N/A' })
  const [fromCode, setFromCode] = useState('')
  const [toCode, setToCode] = useState('')
  const [searchDate, setSearchDate] = useState(todayStr())
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/routes')
      .then(r => r.json())
      .then(data => { setRoutes(data); setLoadingRoutes(false) })
      .catch(() => setLoadingRoutes(false))
    fetchStats().then(setStats).catch(() => {})
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!fromCode || !toCode || !searchDate) return
    navigate(`/search?from=${fromCode}&to=${toCode}&date=${searchDate}`)
  }

  return (
    <div className="container">
      <div className="header">
        <h1>FlightPulse</h1>
        <p>Track flight prices across routes</p>
      </div>

      <div className="stats-bar">
        <div>Routes: <span>{stats.routes}</span></div>
        <div>Records: <span>{stats.total}</span></div>
        <div>Last scrape: <span>{stats.last_scrape !== 'N/A' ? new Date(stats.last_scrape).toLocaleString() : '--'}</span></div>
      </div>

      <div className="card search-card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <AirportAutocomplete value={fromCode} onChange={setFromCode} />
            </div>
            <div className="form-group">
              <AirportAutocomplete value={toCode} onChange={setToCode} />
            </div>
          </div>
          <input
            type="date"
            className="search-date"
            value={searchDate}
            min={todayStr()}
            required
            onChange={e => setSearchDate(e.target.value)}
          />
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
            <div className="route-meta" style={{ marginTop: 12, color: '#1a73e8', fontWeight: 500 }}>
              View Prices
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
