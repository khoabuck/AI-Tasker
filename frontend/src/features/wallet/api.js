import { axiosClient } from '../../lib/axiosClient'

export const walletApi = {
  getMyWallet: () => axiosClient.get('/wallets/me'),
}
