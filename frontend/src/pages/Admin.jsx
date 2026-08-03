import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { TrashIcon } from '../components/Icons'

export default function Admin() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [openUser, setOpenUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)

  function load() {
    fetch('/api/admin')
      .then(r => (r.ok ? r.json() : r.json().then(d => { throw new Error(d.error || 'Forbidden') })))
      .then(setData)
      .catch(e => setError(e.message))
  }

  useEffect(load, [])

  async function handleDeleteUser(email) {
    if (!confirm(`Delete all routes for ${email}? This cannot be undone.`)) return
    setDeletingUser(email)
    try {
      const r = await fetch(`/api/admin/user?email=${encodeURIComponent(email)}`, { method: 'DELETE' })
      if (r.ok) load()
    } catch {}
    setDeletingUser(null)
  }

  if (error) {
    return (
      <div className="manage-body">
        <div className="container">
          <Link to="/" className="back-link">← Back</Link>
          <h1>Admin</h1>
          <div className="empty">{error}</div>
        </div>
      </div>
    )
  }

  if (!data) return <Spinner text="Loading admin data..." />

  const { stats, users, admins = [] } = data
  const cards = [
    { label: 'Total Users', value: stats.total_users },
    { label: 'Total Routes', value: stats.total_routes },
    { label: 'Active Routes', value: stats.active_routes },
    { label: 'Paused Routes', value: stats.paused_routes },
    { label: 'Flight Records', value: stats.total_flights.toLocaleString('en-IN') },
  ]

  return (
    <div className="manage-body admin-body">
      <div className="container admin-container">
        <Link to="/" className="back-link">← Back</Link>
        <h1>Admin Dashboard</h1>
        <p className="subtitle">Statistics &amp; user management</p>

        <div className="admin-stats">
          {cards.map(c => (
            <div className="admin-stat" key={c.label}>
              <div className="admin-stat-value">{c.value}</div>
              <div className="admin-stat-label">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="admin-last-scrape">
          Last scrape: <strong>{stats.last_scrape}</strong>
        </div>

        <h2 className="admin-section-title">Users ({users.length})</h2>

        {users.length === 0 ? (
          <div className="empty">No users yet.</div>
        ) : (
          users.map(u => (
            <div className="route-card admin-user-card" key={u.email}>
              <div className="card-info" onClick={() => setOpenUser(openUser === u.email ? null : u.email)} style={{ cursor: 'pointer' }}>
                <div className="admin-user-head">
                  {u.picture
                    ? <img className="user-avatar admin-avatar" src={u.picture} alt={u.name} referrerPolicy="no-referrer" />
                    : <div className="user-avatar user-avatar-fallback admin-avatar">{u.name?.charAt(0) || u.email.charAt(0).toUpperCase()}</div>}
                  <div>
                    <div className="admin-user-name">{u.name || u.email}</div>
                    <div className="admin-user-email">{u.email}</div>
                  </div>
                </div>
                <div className="meta">
                  {u.route_count} routes · {u.active_count} active · Joined {(() => {
                    try { return new Date(u.joined_at.replace('Z', '+00:00')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return u.joined_at }
                  })()}
                </div>
                <div className="meta">
                  {u.last_login ? 'Last login ' + (() => {
                    try { return new Date(u.last_login.replace('Z', '+00:00')).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return u.last_login }
                  })() : 'No logins recorded yet'}
                </div>
              </div>
              {admins.includes(u.email) ? (
                <span className="admin-badge" title="Admin account — cannot be deleted">Admin</span>
              ) : (
                <button className="btn-action btn-del" onClick={() => handleDeleteUser(u.email)} disabled={deletingUser === u.email} title="Delete user's routes" aria-label="Delete user">
                  {deletingUser === u.email ? <span className="btn-spinner" /> : <TrashIcon />}
                </button>
              )}

              {openUser === u.email && (
                <div className="admin-user-routes">
                  {u.routes.length === 0 ? (
                    <div className="empty" style={{ padding: '10px' }}>No routes.</div>
                  ) : (
                    u.routes.map(r => (
                      <div className="admin-route-row" key={`${r.origin}-${r.destination}-${r.date}`}>
                        <div>
                          <span className="code-chip" style={{ fontSize: '0.85rem', padding: '1px 7px' }}>{r.origin}</span>
                          <span className="plane-arrow">✈</span>
                          <span className="code-chip" style={{ fontSize: '0.85rem', padding: '1px 7px' }}>{r.destination}</span>
                        </div>
                        <div className="admin-route-meta">{r.date} · Updates: {r.scrape_count}</div>
                        <span className={`badge ${r.status}`}>{r.status}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {deletingUser && (
        <div className="admin-delete-overlay">
          <div className="admin-delete-box">
            <span className="btn-spinner" style={{ width: 22, height: 22, borderWidth: 3 }} />
            <p>Deleting user &amp; routes...</p>
          </div>
        </div>
      )}
    </div>
  )
}
