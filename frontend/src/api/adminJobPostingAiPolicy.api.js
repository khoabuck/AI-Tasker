import axiosInstance from "./axiosInstance";

const adminJobPostingAiPolicyApi = {
  getPolicy() {
    return axiosInstance.get("/admin/job-posting-ai-policy");
  },

  updatePolicy(data) {
    return axiosInstance.put("/admin/job-posting-ai-policy", data);
  },
};

export default adminJobPostingAiPolicyApi;