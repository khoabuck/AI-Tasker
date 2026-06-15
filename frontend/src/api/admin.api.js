import axiosInstance from "./axiosInstance";

const adminApi = {
  getDashboardSummary() {
    return axiosInstance.get("/admin/dashboard/summary");
  },

  getDashboardRevenue() {
    return axiosInstance.get("/admin/dashboard/revenue");
  },

  getDashboardProjects() {
    return axiosInstance.get("/admin/dashboard/projects");
  },

  getPendingBusinessVerifications() {
    return axiosInstance.get("/admin/business-verifications/pending");
  },

  approveBusinessVerification(businessProfileId) {
    return axiosInstance.post(
      `/admin/business-verifications/${businessProfileId}/approve`
    );
  },

  rejectBusinessVerification(businessProfileId, data) {
    return axiosInstance.post(
      `/admin/business-verifications/${businessProfileId}/reject`,
      data
    );
  },
};

export default adminApi;