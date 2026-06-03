import { axiosClient } from '../../lib/axiosClient'

export const disputeApi = {
  openDispute: (payload) => axiosClient.post('/disputes', payload),
}
