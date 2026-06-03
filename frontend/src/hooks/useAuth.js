import { getCurrentUser } from '../lib/auth'

export function useAuth() {
  return {
    user: getCurrentUser(),
    isAuthenticated: Boolean(localStorage.getItem('accessToken')),
  }
}
