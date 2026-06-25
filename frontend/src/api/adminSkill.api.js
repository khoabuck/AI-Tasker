import axiosInstance from "./axiosInstance";

const adminSkillApi = {
  getSkills({ keyword = "", category = "", activeOnly = false } = {}) {
    const params = {
      activeOnly,
    };

    if (keyword) {
      params.keyword = keyword;
    }

    if (category) {
      params.category = category;
    }

    return axiosInstance.get("/skills", { params });
  },

  getSkillById(skillId) {
    return axiosInstance.get(`/skills/${skillId}`);
  },

  createSkill(data) {
    return axiosInstance.post("/skills", data);
  },

  updateSkill(skillId, data) {
    return axiosInstance.put(`/skills/${skillId}`, data);
  },

  deactivateSkill(skillId) {
    return axiosInstance.delete(`/skills/${skillId}`);
  },

  activateSkill(skillId) {
    return axiosInstance.put(`/skills/${skillId}/activate`);
  },
};

export default adminSkillApi;