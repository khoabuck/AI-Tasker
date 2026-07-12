import axiosInstance from "./axiosInstance";

const conversationApi = {
  createConversation(data) {
    return axiosInstance.post("/conversations", data);
  },

  getMyConversations(params = {}) {
    return axiosInstance.get("/conversations/me", { params });
  },

  getConversation(conversationId) {
    return axiosInstance.get(`/conversations/${conversationId}`);
  },

  getConversationMessages(conversationId, params = {}) {
    return axiosInstance.get(`/conversations/${conversationId}/messages`, {
      params,
    });
  },

  sendMessage(conversationId, data) {
    return axiosInstance.post(
      `/conversations/${conversationId}/messages`,
      data
    );
  },
};

export default conversationApi;
