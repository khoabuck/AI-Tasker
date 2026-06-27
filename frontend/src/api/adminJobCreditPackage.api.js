import axiosInstance from "./axiosInstance";

const adminJobCreditPackageApi = {
  getPackages() {
    return axiosInstance.get("/admin/job-credit-packages");
  },

  getPackageById(packageId) {
    return axiosInstance.get(`/admin/job-credit-packages/${packageId}`);
  },

  createPackage(data) {
    return axiosInstance.post("/admin/job-credit-packages", data);
  },

  updatePackage(packageId, data) {
    return axiosInstance.put(`/admin/job-credit-packages/${packageId}`, data);
  },

  activatePackage(packageId, data) {
    return axiosInstance.patch(
      `/admin/job-credit-packages/${packageId}/activate`,
      data
    );
  },

  deactivatePackage(packageId, data) {
    return axiosInstance.patch(
      `/admin/job-credit-packages/${packageId}/deactivate`,
      data
    );
  },
};

export default adminJobCreditPackageApi;