const BASE = ''

export function authFetch(url, options = {}) {
  return fetch(url, options).then(r => {
    if (r.status === 401) window.dispatchEvent(new CustomEvent('auth-expired'))
    return r
  })
}

export async function fetchStats() {
  const r = await authFetch(`${BASE}/api/stats`)
  if (!r.ok) throw new Error('Failed to fetch stats')
  return r.json()
}

export async function fetchRoutes() {
  const r = await authFetch(`${BASE}/api/routes`)
  if (!r.ok) throw new Error('Failed to fetch routes')
  return r.json()
}

export async function addRoute(origin, destination, date) {
  const r = await authFetch(`${BASE}/api/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination, date })
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || 'Failed to add route')
  return data
}

export async function deleteRoute(id) {
  const r = await authFetch(`${BASE}/api/routes/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Failed to delete route')
  return r.json()
}

export async function deleteRouteByParams(from, to, date) {
  const params = new URLSearchParams({ from, to, date })
  const r = await authFetch(`${BASE}/api/routes?${params}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Failed to delete route')
  return r.json()
}

export async function toggleRoute(id) {
  const r = await authFetch(`${BASE}/api/routes/${id}/toggle`, { method: 'POST' })
  if (!r.ok) throw new Error('Failed to toggle route')
  return r.json()
}

export async function searchFlights(from, to, date) {
  const params = new URLSearchParams({ from: from.toUpperCase(), to: to.toUpperCase(), date })
  const r = await authFetch(`${BASE}/search?${params}`)
  return r.json()
}

export async function fetchHistory(flightId, from, to, date) {
  const params = new URLSearchParams({ flight_id: flightId, from, to, date })
  const r = await authFetch(`${BASE}/api/history?${params}`)
  if (!r.ok) throw new Error('Failed to fetch history')
  return r.json()
}
