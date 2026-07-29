import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import PriceChart from '../components/PriceChart'
import Spinner from '../components/Spinner'

export default function SearchResults() {
  const [params] = useSearchParams()
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  const date = params.get('date') || ''

  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [historyData, setHistoryData] = useState({})

  useEffect(() => {
    if (!from || !to || !date) { setLoading(false); return }
    setLoading(true)
    fetch(`/search?from=${from}&to=${to}&date=${date}`)
      .then(r => r.json())
      .then(data => { setFlights(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [from, to, date])

  function toggleCard(fid) {
    if (expanded === fid) {
      setExpanded(null)
      return
    }
    setExpanded(fid)
    if (!historyData[fid]) {
      fetch(`/api/history?flight_id=${encodeURIComponent(fid)}&from=${from}&to=${to}`)
        .then(r => r.json())
        .then(data => setHistoryData(prev => ({ ...prev, [fid]: data })))
        .catch(() => {})
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
        <div className="header">
          <h1>{from} → {to} <span>- {date}</span></h1>
          <Link to="/" className="back-link">← Back</Link>
        </div>

        {loading ? (
          <Spinner text="Searching flights..." />
        ) : flights.length > 0 ? (
          flights.map(f => (
            <div key={f.flight_id} className="flight-card" onClick={() => toggleCard(f.flight_id)}>
              <div className="card-row">
                <div className="card-left">
                  <div className="airline-badge">{f.airline?.slice(0, 2)}</div>
                  <div>
                    <div className="airline-name">{f.airline}</div>
                    <div className="times">{f.departure_time} – {f.arrival_time}</div>
                    <div className="meta">{f.duration} · {f.stops}</div>
                  </div>
                </div>
                <div className="card-right">
                  <div className="price">{f.price_formatted}</div>
                  <div className="hint">History ↓</div>
                </div>
              </div>
              {expanded === f.flight_id && (
                <div className="chart-box">
                  <PriceChart data={historyData[f.flight_id] || []} />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-flights">
            <p>No flights found</p>
            <Link to="/">Try again</Link>
          </div>
        )}
      </div>
    </div>
  )
}
