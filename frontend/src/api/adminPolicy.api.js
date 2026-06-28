import axiosInstance from "./axiosInstance";

const adminPolicyApi = {
  getExpertProfileScoringPolicy() {
    return axiosInstance.get("/admin/expert-profile-scoring-policy");
  },

  updateExpertProfileScoringPolicy(data) {
    return axiosInstance.put("/admin/expert-profile-scoring-policy", data);
  },

  getPlatformFeePolicy() {
    return axiosInstance.get("/admin/platform-fee-policy");
  },

  updatePlatformFeePolicy(data) {
    return axiosInstance.put("/admin/platform-fee-policy", data);
  },
};

export default adminPolicyApi;