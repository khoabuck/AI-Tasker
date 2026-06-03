import { Navigate } from 'react-router-dom'
import { getCurrentUser } from '../../lib/auth'

export default function RoleBasedRoute({ allowedRoles = [], children }) {
  const user = getCurrentUser()
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children
}
