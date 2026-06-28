import { aiMatchingApi } from "../api/aiMatching.api";

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