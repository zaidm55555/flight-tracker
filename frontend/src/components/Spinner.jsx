export default function Spinner({ text = 'Loading...' }) {
  return (
    <div className="spinner">
      <div className="spinner-ring" />
      <p>{text}</p>
    </div>
  )
}
