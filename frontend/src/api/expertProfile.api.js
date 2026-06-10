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
};

export default expertProfileApi;