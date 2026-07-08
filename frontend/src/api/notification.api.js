import axiosInstance from "./axiosInstance";

const notificationApi = {
  getMyNotifications(params = {}) {
    return axiosInstance.get("/notifications/me", { params });
  },

  getNotificationById(notificationId) {
    return axiosInstance.get(`/notifications/${notificationId}`);
  },

  getUnreadCount() {
    return axiosInstance.get("/notifications/unread-count");
  },

  markAsRead(notificationId) {
    return axiosInstance.post(`/notifications/${notificationId}/read`);
  },

  markAllAsRead() {
    return axiosInstance.post("/notifications/read-all");
  },
};

export default notificationApi;