// src/utils/conversation.util.js

function unwrapConversationList(response) {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.conversations)) return data.conversations;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.conversations)) {
    return data.data.conversations;
  }

  return [];
}

function getExpertUserId(conversation) {
  return (
    conversation?.expertUserId ??
    conversation?.ExpertUserId ??
    conversation?.expert?.userId ??
    conversation?.Expert?.UserId ??
    null
  );
}

export async function findExistingConversationWithExpert(
  axiosInstance,
  { expertUserId } = {}
) {
  if (!axiosInstance || expertUserId === undefined || expertUserId === null) {
    return null;
  }

  try {
    const response = await axiosInstance.get("/conversations/me");
    const conversations = unwrapConversationList(response);

    return (
      conversations.find(
        (conversation) =>
          String(getExpertUserId(conversation)) === String(expertUserId)
      ) || null
    );
  } catch (error) {
    console.error(
      "CHECK EXISTING CONVERSATION ERROR:",
      error?.response?.data || error
    );
    return null;
  }
}
