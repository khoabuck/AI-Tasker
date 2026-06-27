import axiosInstance from "./axiosInstance";

const adminUserApi = {
  getAllUsers(params = {}) {
    const query = {};

    if (params.search) query.search = params.search;
    if (params.role && params.role !== "ALL") query.role = params.role;
    if (params.status && params.status !== "ALL") query.status = params.status;

    return axiosInstance.get("/admin/users", { params: query });
  },

  getUserById(userId) {
    return axiosInstance.get(`/admin/users/${userId}`);
  },

  lockUser(userId, data = {}) {
    return axiosInstance.patch(`/admin/users/${userId}/lock`, data);
  },

  unlockUser(userId, data = {}) {
    return axiosInstance.patch(`/admin/users/${userId}/unlock`, data);
  },

  banUser(userId, data = {}) {
    return axiosInstance.patch(`/admin/users/${userId}/ban`, data);
  },
};

export default adminUserApi;