export default function Select({ children, className = '', ...props }) {
  return (
    <select className={`border rounded-md px-3 py-2 w-full ${className}`} {...props}>
      {children}
    </select>
  )
}
