import { clientExpertApi } from "../api/clientExpert.api";

const unwrap = (res) => res.data?.data ?? res.data;

export const clientExpertService = {
  async getExpertById(expertProfileId, config = {}) {
    const res = await clientExpertApi.getExpertById(expertProfileId, config);
    return unwrap(res);
  },

  async createConversationWithExpert(expert) {
    const res = await clientExpertApi.createConversation({
      type: "DIRECT",
      expertUserId: expert.userId,
      expertProfileId: expert.expertProfileId,
      initialMessage: `Hi ${expert.fullName}, I want to discuss a project with you.`,
    });

    const data = unwrap(res);

    return (
      data?.conversationId ||
      data?.id ||
      null
    );
  },
};