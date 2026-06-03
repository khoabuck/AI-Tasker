export default function ErrorMessage({ message }) {
  if (!message) return null
  return <p className="text-red-600">{message}</p>
}
