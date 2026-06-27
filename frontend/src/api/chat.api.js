import axiosInstance from "./axiosInstance";

const chatApi = {
  createConversation(data) {
    return axiosInstance.post("/conversations", data);
  },

  getConversations() {
    return axiosInstance.get("/conversations/me");
  },

  getConversationById(conversationId) {
    return axiosInstance.get(`/conversations/${conversationId}`);
  },

  getMessages(conversationId) {
    return axiosInstance.get(`/conversations/${conversationId}/messages`);
  },

  sendMessage(conversationId, data) {
    return axiosInstance.post(
      `/conversations/${conversationId}/messages`,
      data
    );
  },
};

export default chatApi;