import axiosInstance from "./axiosInstance";

const skillApi = {
  getSkills(params = {}) {
    return axiosInstance.get("/skills", { params });
  },

  getSkill(id) {
    return axiosInstance.get(`/skills/${id}`);
  },
};

export default skillApi;