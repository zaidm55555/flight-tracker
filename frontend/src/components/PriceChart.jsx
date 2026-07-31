import { useRef, useEffect } from 'react'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

function themeColors() {
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return {
    line: dark ? '#2dd4bf' : '#0d9488',
    fillTop: dark ? 'rgba(45,212,191,0.25)' : 'rgba(13,148,136,0.18)',
    fillBottom: dark ? 'rgba(45,212,191,0.01)' : 'rgba(13,148,136,0.01)',
    grid: dark ? 'rgba(157,196,176,0.12)' : 'rgba(15,70,45,0.06)',
    tick: dark ? '#9dc4b0' : '#52725f'
  }
}

function fmt(v) {
  return '₹' + v.toLocaleString('en-IN')
}

export default function PriceChart({ data }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!data || data.length === 0) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const build = () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
      const c = themeColors()
      const labels = data.map(x => {
        const dt = new Date(x.t)
        return dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) + ' ' +
          dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      })
      const gradient = ctx.createLinearGradient(0, 0, 0, 160)
      gradient.addColorStop(0, c.fillTop)
      gradient.addColorStop(1, c.fillBottom)
      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Price',
            data: data.map(x => x.p),
            borderColor: c.line,
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointRadius: 3.5,
            pointHoverRadius: 5,
            pointBackgroundColor: c.line,
            borderWidth: 2.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15,23,42,0.9)',
              padding: 10,
              cornerRadius: 10,
              titleColor: '#cbd5e1',
              bodyColor: '#fff',
              callbacks: { label: ctx => '  Price: ' + fmt(ctx.parsed.y) }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: 5, font: { size: 10 }, color: c.tick } },
            y: { grid: { color: c.grid }, ticks: { font: { size: 10 }, color: c.tick, callback: v => '₹' + v.toLocaleString('en-IN') } }
          }
        }
      })
    }

    build()

    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    mq?.addEventListener?.('change', build)

    return () => {
      mq?.removeEventListener?.('change', build)
      if (chartRef.current) chartRef.current.destroy()
    }
  }, [data])

  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No price history yet for this flight</div>
  }

  return (
    <div style={{ position: 'relative', height: 160 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
