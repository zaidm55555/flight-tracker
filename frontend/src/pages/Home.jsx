import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '../components/Spinner'
import PlaneMark from '../components/PlaneMark'
import { TrashIcon } from '../components/Icons'
import { deleteRoute } from '../api'

export default function Home({ routes, reloadRoutes }) {
  const [refreshing, setRefreshing] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [deletingAllExpired, setDeletingAllExpired] = useState(false)
  const loadingRoutes = refreshing || routes === null

  useEffect(() => {
    let mounted = true
    setRefreshing(true)
    Promise.resolve(reloadRoutes()).finally(() => { if (mounted) setRefreshing(false) })
    return () => { mounted = false }
  }, [reloadRoutes])

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      await deleteRoute(id)
      reloadRoutes()
    } catch {}
    setDeletingId(null)
  }

  async function handleDeleteAllExpired() {
    const expired = routes.filter(r => r.is_expired)
    if (!confirm(`Remove ${expired.length} expired route${expired.length > 1 ? 's' : ''}?`)) return
    setDeletingAllExpired(true)
    for (const r of expired) {
      try { await deleteRoute(r._id) } catch {}
    }
    reloadRoutes()
    setDeletingAllExpired(false)
  }

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
            <div className="brand-mark"><PlaneMark /></div>
            <div>
              <div className="brand-name"><span className="wm-safar">Safar</span><span className="wm-vibe">Vibe</span></div>
              <div className="brand-tag">Track flight prices across routes</div>
            </div>
          </div>
        </div>
      </div>

      {loadingRoutes ? (
        <Spinner text="Loading routes..." />
      ) : routes.length > 0 ? (
        <>
          {routes.filter(r => !r.is_expired).length > 0 && (
            routes.filter(r => !r.is_expired).map((r, i) => (
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
          )}
          {routes.filter(r => r.is_expired).length > 0 && (
            <div className="route-section route-section-expired">
              <div className="expired-header">
                <div>
                  <h2 className="route-section-title route-section-title-expired">Expired</h2>
                  <p className="expired-sub">Past dates can no longer be tracked</p>
                </div>
                <button className="btn-expired-clear" onClick={handleDeleteAllExpired} disabled={deletingAllExpired}>
                  {deletingAllExpired ? <span className="btn-spinner" /> : 'Remove all'}
                </button>
              </div>
              {routes.filter(r => r.is_expired).map((r, i) => (
                <div
                  key={r._id}
                  className={`expired-card${deletingId === r._id ? ' expired-card-deleting' : ''}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="expired-card-left">
                    <div className="route-cities" style={{ fontSize: '0.9rem' }}>
                      <span className="code-chip" style={{ fontSize: '0.85rem', padding: '2px 8px' }}>{r.origin}</span>
                      <span className="plane-arrow" style={{ fontSize: '0.85rem' }}>✈</span>
                      <span className="code-chip" style={{ fontSize: '0.85rem', padding: '2px 8px' }}>{r.destination}</span>
                    </div>
                    <span className="expired-date">{r.date}</span>
                  </div>
                  <button className="btn-expired-remove" onClick={() => handleDelete(r._id)} disabled={deletingId === r._id} aria-label="Remove route">
                    {deletingId === r._id ? <span className="btn-spinner" /> : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <p>No routes being tracked yet.<br />Add your first route to start monitoring flight prices.</p>
        </div>
      )}

      <Link to="/add-route" className="btn-add" style={{ marginTop: 12 }}>+ Add Route</Link>

      <div className="guides">
        <div className="guides-title">Guides & Help</div>
        <div className="guides-grid">
          <a className="guide-card" href="/blog/how-to-use-safarvibe/">
            <span className="guide-card-title">How to use SafarVibe</span>
            <span className="guide-card-sub">Get started with tracking</span>
          </a>
          <a className="guide-card" href="/blog/how-to-track-flight-prices/">
            <span className="guide-card-title">How to track flight prices</span>
            <span className="guide-card-sub">Tips for booking cheaper</span>
          </a>
          <a className="guide-card" href="/blog/install-safarvibe-app-android-ios/">
            <span className="guide-card-title">Install as an app</span>
            <span className="guide-card-sub">Android & iOS home screen</span>
          </a>
        </div>
      </div>
    </div>
  )
}
