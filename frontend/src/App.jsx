import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import AddRoute from './pages/AddRoute'
import ManageRoutes from './pages/ManageRoutes'
import LoginScreen from './components/LoginScreen'
import Navbar from './components/Navbar'
import Splash from './components/Splash'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const minSplash = new Promise(resolve => setTimeout(resolve, 5000))

    const sessionCheck = fetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (mounted) setUser(data) })
      .catch(() => {})

    Promise.all([sessionCheck, minSplash]).then(() => { if (mounted) setLoading(false) })

    const onAuthExpired = () => setUser(null)
    window.addEventListener('auth-expired', onAuthExpired)
    return () => { mounted = false; window.removeEventListener('auth-expired', onAuthExpired) }
  }, [])

  if (loading) {
    return <Splash />
  }

  if (!user) return <LoginScreen />

  return (
    <>
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/add-route" element={<AddRoute />} />
        <Route path="/manage-routes" element={<ManageRoutes />} />
      </Routes>
    </>
  )
}
