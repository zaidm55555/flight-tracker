export default function PlaneMark({ size = '100%' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-hidden="true">
      <g transform="translate(18.8 17.5) scale(2.6)" fill="#fff">
        <path d="M22,16V14L13.5,9.07V4.5A1.5,1.5 0 0,0 12,3A1.5,1.5 0 0,0 10.5,4.5V9.07L2,14V16L10.5,13.5V19L8,20.5V22L12,21L16,22V20.5L13.5,19V13.5L22,16Z" />
      </g>
      <g fill="#fff">
        <rect x="24" y="78" width="9" height="16" rx="2.5" opacity="0.75" />
        <rect x="38" y="70" width="9" height="24" rx="2.5" opacity="0.85" />
        <rect x="52" y="75" width="9" height="19" rx="2.5" opacity="0.9" />
        <rect x="66" y="62" width="9" height="32" rx="2.5" />
      </g>
    </svg>
  )
}
