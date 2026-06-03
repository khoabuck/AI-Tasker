import { axiosClient } from '../../lib/axiosClient'

export const contractApi = {
  getContract: (id) => axiosClient.get(`/contracts/${id}`),
}
