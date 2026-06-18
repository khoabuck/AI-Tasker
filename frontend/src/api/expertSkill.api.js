import axiosInstance from "./axiosInstance";

const expertSkillApi = {
  getMySkills() {
    return axiosInstance.get("/expert-skills/my");
  },

  updateMySkills(data) {
    return axiosInstance.put("/expert-skills/my", data);
  },

  getExpertSkills(expertProfileId) {
    return axiosInstance.get(`/expert-skills/expert/${expertProfileId}`);
  },
};

export default expertSkillApi;