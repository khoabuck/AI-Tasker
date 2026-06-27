import axiosInstance from "./axiosInstance";

const adminSkillApi = {
  getSkills(params = {}) {
    const query = {};

    if (params.keyword) {
      query.keyword = params.keyword;
    }

    if (params.category) {
      query.category = params.category;
    }

    if (
      params.activeOnly !== undefined &&
      params.activeOnly !== null &&
      params.activeOnly !== ""
    ) {
      query.activeOnly = params.activeOnly;
    }

    return axiosInstance.get("/skills", { params: query });
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

  deleteSkill(skillId) {
    return axiosInstance.delete(`/skills/${skillId}`);
  },

  activateSkill(skillId) {
    return axiosInstance.put(`/skills/${skillId}/activate`);
  },
};

export default adminSkillApi;