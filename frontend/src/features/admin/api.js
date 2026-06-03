import { axiosClient } from '../../lib/axiosClient'

export const adminApi = {
  getDashboard: () => axiosClient.get('/admin/dashboard'),
}
