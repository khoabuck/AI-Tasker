import { useQuery } from '@tanstack/react-query'
import { authApi } from '../features/auth/api'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await authApi.me()
      return res.data
    },
  })
}
