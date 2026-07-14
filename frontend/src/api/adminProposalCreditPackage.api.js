import axiosInstance from "./axiosInstance";

const adminProposalCreditPackageApi = {
  getPackages() {
    return axiosInstance.get("/admin/proposal-credit-packages");
  },

  getPackageById(packageId) {
    return axiosInstance.get(`/admin/proposal-credit-packages/${packageId}`);
  },

  createPackage(data) {
    return axiosInstance.post("/admin/proposal-credit-packages", data);
  },

  updatePackage(packageId, data) {
    return axiosInstance.put(`/admin/proposal-credit-packages/${packageId}`, data);
  },

  activatePackage(packageId, reason) {
    return axiosInstance.patch(`/admin/proposal-credit-packages/${packageId}/activate`, {
      reason,
    });
  },

  deactivatePackage(packageId, reason) {
    return axiosInstance.patch(`/admin/proposal-credit-packages/${packageId}/deactivate`, {
      reason,
    });
  },
};

export default adminProposalCreditPackageApi;