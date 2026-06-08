import axiosInstance from "./axiosInstance";

const adminUserApi = {
  getAllUsers() {
    return axiosInstance.get("/admin/users");
  },

  updateUserStatus(userId, data) {
    return axiosInstance.patch(`/admin/users/${userId}/status`, data);
  },

  updateUserRole(userId, data) {
    return axiosInstance.patch(`/admin/users/${userId}/role`, data);
  },
};

export default adminUserApi;