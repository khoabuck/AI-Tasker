import { axiosClient } from '../../lib/axiosClient'

export const proposalApi = {
  submitProposal: (payload) => axiosClient.post('/proposals', payload),
}
