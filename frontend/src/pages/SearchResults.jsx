import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import PriceChart from '../components/PriceChart'
import Spinner from '../components/Spinner'
import { BackIcon, TrashIcon } from '../components/Icons'
import { deleteRouteByParams, authFetch } from '../api'

const AIRLINE_COLORS = ['#0d9488', '#10b981', '#0891b2', '#059669', '#d97706', '#e11d48', '#7c3aed', '#db2777', '#4f46e5', '#65a30d']

function airlineColor(name) {
  let h = 0
  for (const c of name || '') h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AIRLINE_COLORS[h % AIRLINE_COLORS.length]
}

function airlineInitials(name) {
  const parts = (name || '').split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return parts.slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (name || '??').slice(0, 2).toUpperCase()
}

export default function SearchResults() {
  const [params] = useSearchParams()
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  const date = params.get('date') || ''
  const navigate = useNavigate()

  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingScrape, setPendingScrape] = useState(false)
  const [scraped, setScraped] = useState(false)
  const [expanded, setExpanded] = useState([])
  const [historyData, setHistoryData] = useState({})
  const [historyLoading, setHistoryLoading] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!from || !to || !date) { setLoading(false); return }
    let cancelled = false
    let timer = null

    const load = () => {
      authFetch(`/api/search?from=${from}&to=${to}&date=${date}`)
        .then(r => r.json())
        .then(data => {
          if (cancelled) return
          if (Array.isArray(data)) {
            setPendingScrape(false)
            setScraped(data.length === 0 ? false : true)
            setFlights(data)
            setLoading(false)
          } else if (data && data.pending_scrape) {
            setPendingScrape(true)
            setFlights([])
            setScraped(false)
            setLoading(false)
            timer = setTimeout(load, 5000)
          } else if (data && Array.isArray(data.flights)) {
            setPendingScrape(false)
            setScraped(!!data.scraped)
            setFlights(data.flights)
            setLoading(false)
          } else {
            setPendingScrape(false)
            setScraped(false)
            setFlights([])
            setLoading(false)
          }
        })
        .catch(() => { if (!cancelled) setLoading(false) })
    }

    setLoading(true)
    load()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [from, to, date])

  async function handleDelete() {
    if (!confirm(`Stop tracking ${from} → ${to} on ${date}?`)) return
    setDeleting(true)
    try {
      await deleteRouteByParams(from, to, date)
      navigate('/')
    } catch {
      setDeleting(false)
    }
  }

  function toggleCard(fid) {
    setExpanded(prev => prev.includes(fid) ? prev.filter(id => id !== fid) : [...prev, fid])
    if (!historyData[fid]) {
      setHistoryLoading(fid)
      authFetch(`/api/history?flight_id=${encodeURIComponent(fid)}&from=${from}&to=${to}&date=${date}`)
        .then(r => r.json())
        .then(data => {
          setHistoryData(prev => ({ ...prev, [fid]: data }))
          setHistoryLoading(null)
        })
        .catch(() => setHistoryLoading(null))
    }
  }

  if (!from || !to || !date) {
    return (
      <div className="no-flights" style={{ maxWidth: 520, margin: '20px auto' }}>
        <p>No search parameters provided</p>
        <Link to="/">Go home</Link>
      </div>
    )
  }

  return (
    <div className="results-body">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="results-header">
          <Link to="/" className="back-btn" aria-label="Back to home"><BackIcon /></Link>
          <div className="route-title">
            <div className="route-codes">{from} <span className="arrow">→</span> {to}</div>
            <div className="route-date">{date}</div>
          </div>
          <button className="route-del" onClick={handleDelete} disabled={deleting} title="Delete route" aria-label="Delete route">
            {deleting && <span className="btn-spinner" />}
            {!deleting && <TrashIcon />}
          </button>
        </div>

        {loading ? (
          <Spinner text="Searching flights..." />
        ) : pendingScrape ? (
          <div className="no-flights">
            <div className="pending-scrape"><span className="btn-spinner" /></div>
            <p>Running your first price check for {from} → {to}...</p>
            <p className="hint">This takes about a minute — we'll show the prices here automatically.</p>
            <Link to="/">Back to home</Link>
          </div>
        ) : flights.length > 0 ? (
          flights.map((f, i) => {
            const hist = historyData[f.flight_id] || []
            const lowest = hist.length ? Math.min(...hist.map(x => x.p)) : null
            const highest = hist.length ? Math.max(...hist.map(x => x.p)) : null
            const last = hist.length ? hist[hist.length - 1] : null
            return (
              <div key={f.flight_id} className={`flight-card${expanded.includes(f.flight_id) ? ' expanded' : ''}`} onClick={() => toggleCard(f.flight_id)} style={{ animationDelay: `${i * 50}ms` }}>
                <div className="card-row">
                  <div className="card-left">
                    <div className="airline-badge" style={{ background: airlineColor(f.airline) }}>{airlineInitials(f.airline)}</div>
                    <div>
                      <div className="airline-name">{f.airline}{f.flight_number && f.flight_number !== 'N/A' ? <span className="flight-num"> · {f.flight_number}</span> : null}</div>
                      <div className="times">{f.departure_time} <span className="time-arrow">→</span> {f.arrival_time}</div>
                      <div className="meta">{f.duration} · {f.stops}</div>
                    </div>
                  </div>
                  <div className="card-right">
                    <div className="price">{f.price_formatted}</div>
                    <div className="hint">View history</div>
                  </div>
                </div>
                {expanded.includes(f.flight_id) && (
                  <div className="chart-box">
                    {historyLoading === f.flight_id ? (
                      <div className="history-loading"><span className="btn-spinner" /> Loading price history...</div>
                    ) : hist.length > 0 ? (
                      <>
                        <div className="chart-stats">
                          <div className="stat-item">
                            <div className="stat-label">Lowest</div>
                            <div className="stat-value">₹{lowest?.toLocaleString()}</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-label">Highest</div>
                            <div className="stat-value">₹{highest?.toLocaleString()}</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-label">Latest</div>
                            <div className="stat-value">{last?.pf || '—'}</div>
                          </div>
                        </div>
                        <PriceChart data={hist} />
                      </>
                    ) : (
                      <PriceChart data={hist} />
                    )}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="no-flights">
            <p>{scraped ? `No flights available for ${from} → ${to} on ${date}.` : `No prices available for this route yet.`}</p>
            <p className="hint">
              {scraped
                ? 'The price check ran, but Google Flights has no flights for this route on this date.'
                : 'The first price check hasn\'t run yet — prices will appear here after the next update.'}
            </p>
            <Link to="/">Back to home</Link>
          </div>
        )}
      </div>
    </div>
  )
}
