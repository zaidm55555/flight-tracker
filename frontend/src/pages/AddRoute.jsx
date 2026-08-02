import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AirportAutocomplete from '../components/AirportAutocomplete'
import { addRoute } from '../api'

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

export default function AddRoute() {
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [date, setDate] = useState(todayStr())
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg('')
    if (!origin || !dest) {
      setMsg('Select airports from the suggestions')
      setMsgType('error')
      return
    }
    setLoading(true)
    try {
      await addRoute(origin, dest, date)
      setMsg('Route added! Showing prices...')
      setMsgType('success')
      setTimeout(() => { navigate('/') }, 800)
    } catch (err) {
      setMsg(err.message)
      setMsgType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <div className="container">
        <Link to="/" className="back-link">← Back</Link>
        <div className="card-custom">
          <h2>Add Route</h2>
          <p>Track flight prices for a new route</p>
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label className="field-label">From</label>
                <AirportAutocomplete value={origin} onChange={setOrigin} />
              </div>
              <div className="field">
                <label className="field-label">To</label>
                <AirportAutocomplete value={dest} onChange={setDest} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Date</label>
              <input
                type="date"
                className="field-input"
                required
                min={todayStr()}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <button type="submit" className="form-btn" disabled={loading}>
              {loading ? 'Adding...' : 'Start Tracking'}
            </button>
            {msg && <div className={`msg ${msgType}`}>{msg}</div>}
          </form>
        </div>
      </div>
    </div>
  )
}
