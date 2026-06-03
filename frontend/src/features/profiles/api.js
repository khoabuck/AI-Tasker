import { axiosClient } from '../../lib/axiosClient'

export const profileApi = {
  getClientProfile: () => axiosClient.get('/client-profiles/me'),
  getExpertProfile: () => axiosClient.get('/expert-profiles/me'),
}
