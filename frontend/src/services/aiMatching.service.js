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

  async createConversationWithExpert(expert) {
    // Không tạo mới nếu đã có sẵn hội thoại với đúng expert này (theo
    // expertUserId — field duy nhất response /conversations/me trả về để
    // nhận diện expert), tránh cùng 1 người bị tách thành nhiều thread.
    const existing = await findExistingConversationWithExpert(axiosInstance, {
      expertUserId: expert.userId,
    });

    if (existing?.conversationId) {
      return existing.conversationId;
    }

    const res = await aiMatchingApi.createConversation({
      type: "DIRECT",
      expertUserId: expert.userId,
      expertProfileId: expert.expertProfileId,
      initialMessage: `Hi ${expert.fullName}, I want to discuss a project with you.`,
    });

    const data = unwrap(res);

    return data?.conversationId || data?.id || null;
  },
};