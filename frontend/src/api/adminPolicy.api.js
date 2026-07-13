import axiosInstance from "./axiosInstance";

const adminPolicyApi = {
  // =========================================================
  // EXPERT PROFILE SCORING POLICY
  // =========================================================

  getExpertProfileScoringPolicy() {
    return axiosInstance.get("/admin/expert-profile-scoring-policy");
  },

  updateExpertProfileScoringPolicy(data) {
    return axiosInstance.put(
      "/admin/expert-profile-scoring-policy",
      data
    );
  },

  // =========================================================
  // PLATFORM FEE POLICY
  // =========================================================

  getPlatformFeePolicy() {
    return axiosInstance.get("/admin/platform-fee-policy");
  },

  updatePlatformFeePolicy(data) {
    return axiosInstance.put("/admin/platform-fee-policy", data);
  },

  // =========================================================
  // LOGIN SECURITY POLICY
  // =========================================================

  getLoginSecurityPolicy() {
    return axiosInstance.get("/admin/login-security-policy");
  },

  updateLoginSecurityPolicy(data) {
    return axiosInstance.put("/admin/login-security-policy", data);
  },
};

export default adminPolicyApi;