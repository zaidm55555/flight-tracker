import { useRef, useEffect } from 'react'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

export default function PriceChart({ data }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!data || data.length === 0) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(x => {
          const dt = new Date(x.t)
          return dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) + ' ' +
            dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }),
        datasets: [{
          label: 'Price',
          data: data.map(x => x.p),
          borderColor: '#1a73e8',
          backgroundColor: 'rgba(26,115,232,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#1a73e8'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => 'Rs.' + ctx.parsed.y.toLocaleString()
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 6, font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: v => 'Rs.' + v.toLocaleString()
            }
          }
        }
      }
    })

    return () => {
      if (chartRef.current) chartRef.current.destroy()
    }
  }, [data])

  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No price history yet</div>
  }

  return (
    <div style={{ position: 'relative', height: 160 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
