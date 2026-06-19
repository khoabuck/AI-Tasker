import axiosInstance from "./axiosInstance";

const adminApi = {
  getDashboardSummary() {
    return axiosInstance.get("/admin/dashboard/summary");
  },

  getDashboardRevenue() {
    return axiosInstance.get("/admin/dashboard/revenue");
  },

  getDashboardProjects() {
    return axiosInstance.get("/admin/dashboard/projects");
  },
};

export default adminApi;