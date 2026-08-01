import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import AddRoute from './pages/AddRoute'
import Admin from './pages/Admin'
import LoginScreen from './components/LoginScreen'
import Navbar from './components/Navbar'
import Splash from './components/Splash'

export default function App() {
  const [user, setUser] = useState(null)
  const [routes, setRoutes] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadRoutes = useCallback(() => {
    return fetch('/api/routes')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setRoutes(Array.isArray(data) ? data : []))
      .catch(() => setRoutes([]))
  }, [])

  useEffect(() => {
    const refreshRoutes = () => {
      loadRoutes()
    }

    window.addEventListener('routes-updated', refreshRoutes)

    let mounted = true
    const boot = fetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(async data => {
        if (!mounted) return
        setUser(data)
        if (data) {
          await loadRoutes()
          const minSplash = new Promise(resolve => setTimeout(resolve, 3000))
          await minSplash
        } else if (mounted) {
          setRoutes([])
        }
      })
      .catch(() => { if (mounted) setRoutes([]) })

    boot.then(() => { if (mounted) setLoading(false) })

    const onAuthExpired = () => setUser(null)
    window.addEventListener('auth-expired', onAuthExpired)
    return () => {
      mounted = false
      window.removeEventListener('routes-updated', refreshRoutes)
      window.removeEventListener('auth-expired', onAuthExpired)
    }
  }, [loadRoutes])

  if (loading) {
    return <Splash />
  }

  if (!user) return <LoginScreen />

  return (
    <>
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Home routes={routes} reloadRoutes={loadRoutes} />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/add-route" element={<AddRoute onRouteAdded={loadRoutes} />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </>
  )
}
