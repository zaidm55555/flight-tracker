import { useState, useEffect } from 'react'
import PlaneMark from './PlaneMark'

const TAGLINES = [
  'Track every fare, land the best deal ✈',
  'Prices drop? We will catch them 🎯',
  'Your pocket-friendly flight radar 📡',
  'Book smart, fly happy 🌤️',
  'Watching prices, so you don\u2019t have to 👀',
  'Fly more, worry less 🚀'
]

export default function Splash() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % TAGLINES.length), 3500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="splash">
      <div className="splash-sky">
        <div className="sun" />
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
        <div className="cloud cloud-3" />
        <div className="splash-flight" aria-hidden="true">
          <div className="splash-plane">✈</div>
        </div>
      </div>
      <div className="splash-logo"><PlaneMark /></div>
      <div className="splash-name"><span className="wm-safar">Safar</span><span className="wm-vibe">Vibe</span></div>
      <div className="splash-tagline" key={index}>{TAGLINES[index]}</div>
      <div className="splash-dots">
        {TAGLINES.map((_, i) => (
          <span key={i} className={`splash-dot${i === index ? ' active' : ''}`} />
        ))}
      </div>
    </div>
  )
}
