import PlaneMark from './PlaneMark'

export default function LoginScreen() {
  return (
    <div className="login-page">
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-flight" aria-hidden="true"><div className="login-plane">✈</div></div>
      <div className="login-wrap">
        <section className="landing">
          <div className="landing-logo">
            <div className="login-logo-mark"><PlaneMark /></div>
            <h1><span className="wm-safar">Safar</span><span className="wm-vibe">Vibe</span></h1>
          </div>
          <h2>Stop guessing. <span className="landing-grad">Track flight prices.</span></h2>
          <p className="landing-lead">
            Add a route and travel date, and SafarVibe watches the fares for you. See price
            history charts, spot the trend, and know exactly when to book. Free, forever.
          </p>
          <ul className="landing-features">
            <li>
              <span className="feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l4 2v3l-3 4v4l3 2v3H6a7 7 0 0 1-7-7V3z"/><path d="M13 5l4 2v3l-3 4v4l3 2v3h-2a7 7 0 0 1-7-7V5z"/></svg>
              </span>
              <span>
                <strong>Track any route &amp; date</strong>
                <small>Airports across India and beyond — add as many as you like.</small>
              </span>
            </li>
            <li>
              <span className="feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-6"/></svg>
              </span>
              <span>
                <strong>Price history charts</strong>
                <small>See the fare trend for your exact flight over days and weeks.</small>
              </span>
            </li>
            <li>
              <span className="feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>
              </span>
              <span>
                <strong>Automatic price checks</strong>
                <small>Fares refreshed every few hours, around the clock.</small>
              </span>
            </li>
            <li>
              <span className="feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4L12 14l-3-3"/></svg>
              </span>
              <span>
                <strong>Catch drops before you book</strong>
                <small>Spot low prices early and save on every trip.</small>
              </span>
            </li>
          </ul>
          <div className="landing-stats">
            <span><strong>Free</strong> forever</span>
            <span className="dot" aria-hidden="true">·</span>
            <span>No card required</span>
            <span className="dot" aria-hidden="true">·</span>
            <span><strong>4h</strong> refresh</span>
          </div>
        </section>
        <div className="login-card">
          <div className="login-logo-mark login-card-mark"><PlaneMark /></div>
          <p className="login-card-title">Sign in to start tracking</p>
          <a href="/login" className="google-btn">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 40.7 44 36 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
            Login with Google
          </a>
          <div className="login-note">Free to use · No credit card required · Your routes stay private</div>
        </div>
      </div>
    </div>
  )
}
