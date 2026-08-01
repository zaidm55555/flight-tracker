const GRAD = ['#059669', '#0d9488', '#06b6d4']

function Tile({ children, size = 100, radius = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="safarVibe logo">
      <defs>
        <linearGradient id="sv-tile-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GRAD[0]} />
          <stop offset="0.5" stopColor={GRAD[1]} />
          <stop offset="1" stopColor={GRAD[2]} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="96" height="96" rx={radius} fill="url(#sv-tile-grad)" />
      {children}
    </svg>
  )
}

function Feather({ d, size = 1.8 }) {
  return (
    <g transform="translate(28 28) scale(1.8333)" fill="none" stroke="#fff" strokeWidth={size} strokeLinecap="round" strokeLinejoin="round">
      {d}
    </g>
  )
}

export function PaperPlaneLogo({ size }) {
  return (
    <Tile size={size}>
      <Feather d={<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>} />
    </Tile>
  )
}

export function CompassLogo({ size }) {
  return (
    <Tile size={size}>
      <Feather d={<>
        <circle cx="12" cy="12" r="9.5" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </>} />
    </Tile>
  )
}

export function PinLogo({ size }) {
  return (
    <Tile size={size}>
      <Feather d={<>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </>} />
    </Tile>
  )
}

export function SMonogramLogo({ size }) {
  return (
    <Tile size={size}>
      <text
        x="50" y="57" textAnchor="middle" fill="#fff"
        fontSize="56" fontWeight="800" fontFamily="-apple-system, 'SF Pro Display', Inter, 'Helvetica Neue', Arial, sans-serif"
      >S</text>
      <path d="M30 76 Q 50 90 70 74" fill="none" stroke="#fff" strokeOpacity="0.65" strokeWidth="2.5" strokeLinecap="round" />
    </Tile>
  )
}

export function Wordmark({ style = {} }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', letterSpacing: '-0.5px', lineHeight: 1, ...style }}>
      <span style={{ fontWeight: 800, color: 'var(--ink)', whiteSpace: 'pre' }}>safar</span>
      <span style={{ fontWeight: 800, background: 'linear-gradient(135deg,#059669,#0d9488 50%,#06b6d4)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Vibe</span>
    </span>
  )
}
