import axiosInstance from "./axiosInstance";

const expertProfileApi = {
  getMyExpertProfile() {
    return axiosInstance.get("/expert-profiles/me");
  },

  createExpertProfile(data) {
    return axiosInstance.post("/expert-profiles", data);
  },

  resubmitExpertProfile(data) {
    return axiosInstance.put("/expert-profiles/resubmit", data);
  },

  updateBasicExpertProfile(data) {
    return axiosInstance.put("/expert-profiles/me/basic", data);
  },

  updateVerificationExpertProfile(data) {
    return axiosInstance.put("/expert-profiles/me/verification", data);
  },
};

export default expertProfileApi;