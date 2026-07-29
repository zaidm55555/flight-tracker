import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import AddRoute from './pages/AddRoute'
import ManageRoutes from './pages/ManageRoutes'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<SearchResults />} />
      <Route path="/add-route" element={<AddRoute />} />
      <Route path="/manage-routes" element={<ManageRoutes />} />
    </Routes>
  )
}
