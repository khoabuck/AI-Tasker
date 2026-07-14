import axiosInstance from "./axiosInstance";

const proposalCreditPackageApi = {
  getPackages() {
    return axiosInstance.get("/proposal-credit-packages");
  },

  getPackagesForMe() {
    return axiosInstance.get("/proposal-credit-packages/me");
  },

  purchasePackage(packageId) {
    return axiosInstance.post(`/proposal-credit-packages/${packageId}/purchase`);
  },

  getMyPurchases() {
    return axiosInstance.get("/proposal-credit-packages/my-purchases");
  },

  getMyProposalCredits() {
    return axiosInstance.get("/proposals/me/credits");
  },
};

export default proposalCreditPackageApi;