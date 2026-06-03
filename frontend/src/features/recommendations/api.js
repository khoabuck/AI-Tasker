import { axiosClient } from '../../lib/axiosClient'

export const recommendationApi = {
  getRecommendedExperts: (jobId) => axiosClient.get(`/recommendations/job/${jobId}`),
  getRecommendedJobs: () => axiosClient.get('/recommendations/expert/me'),
}
