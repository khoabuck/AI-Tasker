import axiosInstance from "./axiosInstance";

const adminUserApi = {
  getAllUsers(params = {}) {
    return axiosInstance.get("/admin/users", { params });
  },

  getUserById(userId) {
    return axiosInstance.get(`/admin/users/${userId}`);
  },

  lockUser(userId, data = {}) {
    return axiosInstance.patch(`/admin/users/${userId}/lock`, data);
  },

  unlockUser(userId, data = undefined) {
    return axiosInstance.patch(`/admin/users/${userId}/unlock`, data);
  },

  banUser(userId, data = {}) {
    return axiosInstance.patch(`/admin/users/${userId}/ban`, data);
  },

  // Legacy aliases giữ tương thích với page cũ nếu còn gọi
  updateUserStatus(userId, data) {
    return axiosInstance.patch(`/admin/users/${userId}/status`, data);
  },

  updateUserRole(userId, data) {
    return axiosInstance.patch(`/admin/users/${userId}/role`, data);
  },
};

export default adminUserApi;