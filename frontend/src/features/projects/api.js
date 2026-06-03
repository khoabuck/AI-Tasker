import { axiosClient } from '../../lib/axiosClient'

export const projectApi = {
  getMyProjects: () => axiosClient.get('/projects/me'),
}
