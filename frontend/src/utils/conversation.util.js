// src/utils/conversation.util.js
export async function findExistingConversationWithExpert(axiosInstance, { expertUserId } = {}) {
  if (expertUserId == null) return null;

  try {
    const res = await axiosInstance.get("/conversations/me");
    const raw = res.data?.data ?? res.data;
    const list = Array.isArray(raw) ? raw : raw?.items ?? [];

    return list.find((c) => c.expertUserId === expertUserId) || null;
  } catch (err) {
    console.error("Check existing conversation failed:", err);
    return null;
  }
}