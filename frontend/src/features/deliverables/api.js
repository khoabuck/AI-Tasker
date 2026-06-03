import { axiosClient } from '../../lib/axiosClient'

export const deliverableApi = {
  submit: (payload) => axiosClient.post('/deliverables', payload),
}
