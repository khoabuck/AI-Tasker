import axiosInstance from "./axiosInstance";

const expertProfileApi = {
  getMyProfile() {
    return axiosInstance.get("/expert-profiles/me");
  },

  saveProfile(data) {
    return axiosInstance.post("/expert-profiles", data);
  },
};

export default expertProfileApi;