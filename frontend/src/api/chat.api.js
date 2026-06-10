import axiosInstance from "./axiosInstance";

const chatApi = {
  getConversations() {
    return axiosInstance.get("/messages/conversations");
  },

  getMessages(conversationId) {
    return axiosInstance.get(`/messages/conversations/${conversationId}`);
  },

  sendMessage(data) {
    return axiosInstance.post("/messages", data);
  },
};

export default chatApi;