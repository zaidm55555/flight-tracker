import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import AddRoute from './pages/AddRoute'
import ManageRoutes from './pages/ManageRoutes'
import LoginScreen from './components/LoginScreen'
import Navbar from './components/Navbar'
import Splash from './components/Splash'
import Spinner from './components/Spinner'

export default function App() {
  const [user, setUser] = useState(null)
  const [routes, setRoutes] = useState(null)
  const [loading, setLoading] = useState(true)
  const seen = localStorage.getItem('sv_seen') === '1'

  const loadRoutes = useCallback(() => {
    return fetch('/api/routes')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setRoutes(Array.isArray(data) ? data : []))
      .catch(() => setRoutes([]))
  }, [])

  useEffect(() => {
    let mounted = true
    const boot = fetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(async data => {
        if (!mounted) return
        setUser(data)
        if (data) await loadRoutes()
        else if (mounted) setRoutes([])
      })
      .catch(() => { if (mounted) setRoutes([]) })

    if (seen) {
      boot.then(() => { if (mounted) setLoading(false) })
    } else {
      const minSplash = new Promise(resolve => setTimeout(resolve, 3000))
      Promise.all([boot, minSplash]).then(() => {
        if (!mounted) return
        localStorage.setItem('sv_seen', '1')
        setLoading(false)
      })
    }

    const onAuthExpired = () => setUser(null)
    window.addEventListener('auth-expired', onAuthExpired)
    return () => { mounted = false; window.removeEventListener('auth-expired', onAuthExpired) }
  }, [seen, loadRoutes])

  if (loading) {
    return seen ? <Spinner text="Loading..." /> : <Splash />
  }

  if (!user) return <LoginScreen />

  return (
    <>
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Home routes={routes} reloadRoutes={loadRoutes} />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/add-route" element={<AddRoute />} />
        <Route path="/manage-routes" element={<ManageRoutes />} />
      </Routes>
    </>
  )
}
