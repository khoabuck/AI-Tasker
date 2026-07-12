import { aiMatchingApi } from "../api/aiMatching.api";
import axiosInstance from "../api/axiosInstance";
import { findExistingConversationWithExpert } from "../utils/conversation.util";

const unwrap = (res) => res.data?.data ?? res.data;

export const aiMatchingService = {
  async findExpertsFromPrompt(prompt) {
    const res = await aiMatchingApi.findExpertsFromPrompt({ prompt });

    const data = unwrap(res);
    const items = Array.isArray(data)
      ? data
      : data?.items || data?.data || [];

    return {
      items,
      total: data?.totalItems || items.length,
    };
  },

  // Đổi tên + đổi hành vi: chỉ TÌM conversation cũ, KHÔNG tự tạo mới +
  // gửi tin nhắn soạn sẵn nữa. AIMatchingPage.handleConnect sẽ tự điều
  // hướng sang Messages với thông tin expert nếu hàm này trả về null.
  async findConversationWithExpert(expert) {
    const existing = await findExistingConversationWithExpert(axiosInstance, {
      expertUserId: expert.userId,
    });
    return existing?.conversationId ?? null;
  },
}