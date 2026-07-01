import axiosInstance from "./axiosInstance";

const adminAiManagementApi = {
  getSettings() {
    return axiosInstance.get("/admin/ai-management/settings");
  },

  updateSettings(data) {
    return axiosInstance.put("/admin/ai-management/settings", data);
  },

  getModels() {
    return axiosInstance.get("/admin/ai-management/models");
  },

  createModel(data) {
    return axiosInstance.post("/admin/ai-management/models", data);
  },

  updateModel(aiAllowedModelId, data) {
    return axiosInstance.put(
      `/admin/ai-management/models/${aiAllowedModelId}`,
      data
    );
  },

  testAi(data) {
    return axiosInstance.post("/admin/ai-management/test", data);
  },

  getUsageSummary(days = 30) {
    return axiosInstance.get("/admin/ai-management/usage/summary", {
      params: { days },
    });
  },

  getUsageByFeature(days = 30) {
    return axiosInstance.get("/admin/ai-management/usage/by-feature", {
      params: { days },
    });
  },

  getUsageLogs(take = 100, days = 30) {
    return axiosInstance.get("/admin/ai-management/usage/logs", {
      params: { take, days },
    });
  },
};

export default adminAiManagementApi;