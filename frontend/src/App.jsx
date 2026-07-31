import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import AddRoute from './pages/AddRoute'
import ManageRoutes from './pages/ManageRoutes'
import LoginScreen from './components/LoginScreen'
import Navbar from './components/Navbar'
import Spinner from './components/Spinner'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me')
      .then(r => {
        if (!r.ok) return null
        return r.json()
      })
      .then(data => { setUser(data); setLoading(false) })
      .catch(() => setLoading(false))

    const onAuthExpired = () => setUser(null)
    window.addEventListener('auth-expired', onAuthExpired)
    return () => window.removeEventListener('auth-expired', onAuthExpired)
  }, [])

  if (loading) {
    return (
      <div className="container">
        <Spinner text="Checking session..." />
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <>
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/add-route" element={<AddRoute />} />
        <Route path="/manage-routes" element={<ManageRoutes />} />
      </Routes>
    </>
  )
}
