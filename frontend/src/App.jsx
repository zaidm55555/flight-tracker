import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import AddRoute from './pages/AddRoute'
import ManageRoutes from './pages/ManageRoutes'
import Admin from './pages/Admin'
import LoginScreen from './components/LoginScreen'
import Navbar from './components/Navbar'
import Splash from './components/Splash'
import Footer from './components/Footer'

export default function App() {
  const [user, setUser] = useState(null)
  const [routes, setRoutes] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  const showFooter = location.pathname === '/'

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
        if (data) {
          await loadRoutes()
          if (!sessionStorage.getItem('sfv_splash_seen')) {
            const minSplash = new Promise(resolve => setTimeout(resolve, 3000))
            await minSplash
            sessionStorage.setItem('sfv_splash_seen', '1')
          }
        } else if (mounted) {
          setRoutes([])
        }
      })
      .catch(() => { if (mounted) setRoutes([]) })

    boot.then(() => { if (mounted) setLoading(false) })

    const onAuthExpired = () => setUser(null)
    window.addEventListener('auth-expired', onAuthExpired)
    return () => { mounted = false; window.removeEventListener('auth-expired', onAuthExpired) }
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
        <Route path="/add-route" element={<AddRoute />} />
        <Route path="/manage-routes" element={<ManageRoutes />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      {showFooter && <Footer />}
    </>
  )
}
