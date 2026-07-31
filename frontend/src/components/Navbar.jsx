import { Link } from 'react-router-dom'

export default function Navbar({ user }) {
  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand" aria-label="FlightPulse home">
        <div className="navbar-logo">✈</div>
        <span className="navbar-name">FlightPulse</span>
      </Link>

      <div className="navbar-flight" aria-hidden="true">
        <svg className="navbar-path" viewBox="0 0 200 24" preserveAspectRatio="none">
          <path className="navbar-dash" d="M 4 12 H 196" />
        </svg>
        <div className="navbar-plane">✈</div>
      </div>

      {user && (
        <div className="navbar-user">
          {user.picture
            ? <img className="user-avatar" src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
            : <div className="user-avatar user-avatar-fallback">{user.name?.charAt(0) || 'U'}</div>}
          <a href="/logout" className="user-logout" title="Log out">Log out</a>
        </div>
      )}
    </header>
  )
}
