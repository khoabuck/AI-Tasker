import { axiosClient } from '../../lib/axiosClient'

export const reviewApi = {
  createReview: (payload) => axiosClient.post('/reviews', payload),
}
