import { axiosClient } from '../../lib/axiosClient'

export const jobApi = {
  getOpenJobs: () => axiosClient.get('/jobs/open'),
  getJobById: (id) => axiosClient.get(`/jobs/${id}`),
}
