import { useState, useEffect, useRef, useCallback } from 'react'

const AIRPORTS_URL = '/airports.json'

export default function AirportAutocomplete({ value, onChange }) {
  const [inputValue, setInputValue] = useState('')
  const [airports, setAirports] = useState([])
  const [matches, setMatches] = useState([])
  const [show, setShow] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [selected, setSelected] = useState(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    fetch(AIRPORTS_URL)
      .then(r => r.json())
      .then(data => setAirports(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (selected) {
      setInputValue(`${selected.city} (${selected.code})`)
    }
  }, [selected])

  const filter = useCallback((val) => {
    if (val.length < 1) {
      const m = airports.slice(0, 10)
      setMatches(m)
      setShow(m.length > 0)
      return
    }
    const q = val.toLowerCase()
    const m = airports.filter(a =>
      a.code.toLowerCase().indexOf(q) > -1 ||
      a.city.toLowerCase().indexOf(q) > -1 ||
      a.name.toLowerCase().indexOf(q) > -1
    ).slice(0, 10)
    setMatches(m)
    setShow(m.length > 0)
  }, [airports])

  useEffect(() => {
    if (!selected) filter(inputValue)
  }, [inputValue, selected, filter])

  function handleInput(e) {
    const v = e.target.value
    setInputValue(v)
    setSelected(null)
    onChange('')
    setActiveIdx(-1)
  }

  function selectAirport(a) {
    setSelected(a)
    onChange(a.code)
    setShow(false)
    setActiveIdx(-1)
  }

  function handleKeyDown(e) {
    if (!show || matches.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx > -1) {
      e.preventDefault()
      selectAirport(matches[activeIdx])
    } else if (e.key === 'Escape') {
      setShow(false)
      setActiveIdx(-1)
    }
  }

  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShow(false)
        setActiveIdx(-1)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        className="field-input"
        placeholder="City or airport"
        required
        autoComplete="off"
        value={inputValue}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (selected) {
            setInputValue('')
            setSelected(null)
            onChange('')
          }
          filter(selected ? '' : inputValue)
          setShow(true)
        }}
      />
      <div className={`autocomplete-dropdown ${show ? 'visible' : ''}`}>
        {matches.map((a, i) => (
          <div
            key={a.code}
            className={`autocomplete-item ${i === activeIdx ? 'active' : ''}`}
            onMouseDown={e => e.preventDefault()}
            onClick={() => selectAirport(a)}
          >
            <span className="code">{a.code}</span>{' '}
            <span className="city">{a.city}</span>{' '}
            <span className="name">{a.name}</span>{' '}
            <span className="country">{a.country}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
