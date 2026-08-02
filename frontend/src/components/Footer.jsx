import { useState } from 'react'
import PlaneMark from './PlaneMark'

export default function Footer() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setStatus('sent')
        setName(''); setEmail(''); setMessage('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-contact">
          <div className="footer-brand">
            <div className="footer-logo"><PlaneMark /></div>
            <span className="footer-brand-name"><span className="wm-safar">Safar</span><span className="wm-vibe">Vibe</span></span>
          </div>
          <p className="footer-tag">Track flight prices across routes</p>

          <div className="footer-links">
            <a href="mailto:safarvibe2416@gmail.com" className="footer-link">
              <svg className="footer-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5.4 7.7-4.3 4.3a1 1 0 0 1-1.4 0l-2-2a1 1 0 0 1 1.4-1.4l1.3 1.3 3.6-3.6a1 1 0 0 1 1.4 1.4z"/></svg>
              safarvibe2416@gmail.com
            </a>
            <a href="https://www.instagram.com/safarvibe2416" target="_blank" rel="noopener noreferrer" className="footer-link">
              <svg className="footer-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c2.7 0 3 0 4.1.1 1.1.1 1.8.2 2.4.5.6.2 1.2.6 1.7 1.1.5.5.9 1.1 1.1 1.7.3.6.4 1.3.5 2.4.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 1.1-.2 1.8-.5 2.4-.2.6-.6 1.2-1.1 1.7-.5.5-1.1.9-1.7 1.1-.6.3-1.3.4-2.4.5-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1.1-.1-1.8-.2-2.4-.5-.6-.2-1.2-.6-1.7-1.1-.5-.5-.9-1.1-1.1-1.7-.3-.6-.4-1.3-.5-2.4C4 15 4 14.7 4 12s0-3 .1-4.1c.1-1.1.2-1.8.5-2.4.2-.6.6-1.2 1.1-1.7.5-.5 1.1-.9 1.7-1.1.6-.3 1.3-.4 2.4-.5C9 2 9.3 2 12 2zm0 1.8c-2.6 0-2.9 0-4 .1-.9 0-1.4.2-1.8.3-.4.2-.8.4-1.1.8-.4.3-.6.7-.8 1.1-.1.4-.3.9-.3 1.8-.1 1.1-.1 1.4-.1 4s0 2.9.1 4c0 .9.2 1.4.3 1.8.2.4.4.8.8 1.1.3.4.7.6 1.1.8.4.1.9.3 1.8.3 1.1.1 1.4.1 4 .1s2.9 0 4-.1c.9 0 1.4-.2 1.8-.3.4-.2.8-.4 1.1-.8.4-.3.6-.7.8-1.1.1-.4.3-.9.3-1.8.1-1.1.1-1.4.1-4s0-2.9-.1-4c0-.9-.2-1.4-.3-1.8-.2-.4-.4-.8-.8-1.1-.3-.4-.7-.6-1.1-.8-.4-.1-.9-.3-1.8-.3-1.1-.1-1.4-.1-4-.1zm0 3a5.2 5.2 0 1 1 0 10.4 5.2 5.2 0 0 1 0-10.4zm0 1.8a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zm5.4-2.9a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"/></svg>
              safarvibe2416
            </a>
          </div>
        </div>

        <form className="footer-form" onSubmit={handleSubmit}>
          <div className="footer-form-title">Contact us</div>
          <div className="footer-field">
            <input
              className="footer-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="footer-field">
            <input
              className="footer-input"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="footer-field">
            <textarea
              className="footer-input footer-textarea"
              placeholder="Your message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
            />
          </div>
          <button className="footer-submit" type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending...' : 'Send message'}
          </button>
          {status === 'sent' && <div className="footer-msg footer-msg-ok">Message sent. We'll get back to you soon.</div>}
          {status === 'error' && <div className="footer-msg footer-msg-err">Could not send. Please try again or email us directly.</div>}
        </form>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} SafarVibe · Free flight price tracker</div>
    </footer>
  )
}
