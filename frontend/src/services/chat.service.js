import chatApi from "../api/chat.api";

const chatService = {
  async getConversations() {
    const response = await chatApi.getConversations();

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response.data?.data)) {
      return response.data.data;
    }

    return [];
  },

  async getMessages(conversationId) {
    const response = await chatApi.getMessages(conversationId);

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response.data?.data)) {
      return response.data.data;
    }

    return [];
  },

  async sendMessage(conversationId, content) {
    const payload = {
      conversationId: Number(conversationId),
      content: content,
    };

    const response = await chatApi.sendMessage(payload);
    return response.data;
  },
};

export default chatService;