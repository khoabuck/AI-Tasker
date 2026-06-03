import { axiosClient } from '../../lib/axiosClient'

export const milestoneApi = {
  getByProject: (projectId) => axiosClient.get(`/milestones/project/${projectId}`),
}
