import conversationApi from "../api/conversation.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.conversation) return data.data.conversation;
  if (data?.data?.message) return data.data.message;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.conversation) return data.conversation;
  if (data?.message) return data.message;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.Result)) return data.Result;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.Results)) return data.Results;

  if (Array.isArray(data?.conversations)) return data.conversations;
  if (Array.isArray(data?.Conversations)) return data.Conversations;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.Messages)) return data.Messages;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.Items)) return data.data.Items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.Result)) return data.data.Result;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  if (Array.isArray(data?.data?.Results)) return data.data.Results;

  if (Array.isArray(data?.data?.conversations)) {
    return data.data.conversations;
  }

  if (Array.isArray(data?.data?.Conversations)) {
    return data.data.Conversations;
  }

  if (Array.isArray(data?.data?.messages)) {
    return data.data.messages;
  }

  if (Array.isArray(data?.data?.Messages)) {
    return data.data.Messages;
  }

  return [];
};

const normalizeConversation = (item) => {
  if (!item) return null;

  const conversationId = getValue(
    item.conversationId,
    item.ConversationId,
    item.id,
    item.Id
  );

  const otherUserName = getValue(
    item.otherUserName,
    item.OtherUserName,
    item.participantName,
    item.ParticipantName,
    item.receiverName,
    item.ReceiverName,
    item.senderName,
    item.SenderName,
    item.clientName,
    item.ClientName,
    item.expertName,
    item.ExpertName,
    "User"
  );

  return {
    conversationId,
    id: conversationId,

    projectId: getValue(item.projectId, item.ProjectId),
    proposalId: getValue(item.proposalId, item.ProposalId),
    contractId: getValue(item.contractId, item.ContractId),

    title: getValue(
      item.title,
      item.Title,
      item.projectTitle,
      item.ProjectTitle,
      item.jobTitle,
      item.JobTitle,
      otherUserName
    ),

    otherUserId: getValue(
      item.otherUserId,
      item.OtherUserId,
      item.participantUserId,
      item.ParticipantUserId,
      item.receiverUserId,
      item.ReceiverUserId,
      item.senderUserId,
      item.SenderUserId
    ),

    otherUserName,

    otherUserAvatarUrl: getValue(
      item.otherUserAvatarUrl,
      item.OtherUserAvatarUrl,
      item.participantAvatarUrl,
      item.ParticipantAvatarUrl,
      item.receiverAvatarUrl,
      item.ReceiverAvatarUrl,
      item.senderAvatarUrl,
      item.SenderAvatarUrl,
      ""
    ),

    lastMessage: getValue(
      item.lastMessage,
      item.LastMessage,
      item.lastMessageContent,
      item.LastMessageContent,
      item.latestMessage,
      item.LatestMessage,
      ""
    ),

    unreadCount: Number(
      getValue(item.unreadCount, item.UnreadCount, item.unreadMessages, 0)
    ),

    lastMessageAt: getValue(
      item.lastMessageAt,
      item.LastMessageAt,
      item.updatedAt,
      item.UpdatedAt,
      item.createdAt,
      item.CreatedAt,
      ""
    ),

    createdAt: getValue(item.createdAt, item.CreatedAt, ""),
    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),

    raw: item,
  };
};

const normalizeMessage = (item) => {
  if (!item) return null;

  const messageId = getValue(
    item.messageId,
    item.MessageId,
    item.conversationMessageId,
    item.ConversationMessageId,
    item.id,
    item.Id
  );

  const senderUserId = getValue(
    item.senderUserId,
    item.SenderUserId,
    item.userId,
    item.UserId,
    item.createdByUserId,
    item.CreatedByUserId
  );

  return {
    messageId,
    id: messageId,

    conversationId: getValue(item.conversationId, item.ConversationId),

    senderUserId,

    senderName: getValue(
      item.senderName,
      item.SenderName,
      item.userName,
      item.UserName,
      item.createdByName,
      item.CreatedByName,
      "User"
    ),

    senderAvatarUrl: getValue(
      item.senderAvatarUrl,
      item.SenderAvatarUrl,
      item.userAvatarUrl,
      item.UserAvatarUrl,
      ""
    ),

    content: getValue(
      item.content,
      item.Content,
      item.message,
      item.Message,
      item.messageText,
      item.MessageText,
      item.body,
      item.Body,
      ""
    ),

    attachmentUrl: getValue(
      item.attachmentUrl,
      item.AttachmentUrl,
      item.fileUrl,
      item.FileUrl,
      ""
    ),

    isMine: Boolean(getValue(item.isMine, item.IsMine, false)),

    createdAt: getValue(item.createdAt, item.CreatedAt, item.sentAt, item.SentAt, ""),

    raw: item,
  };
};

const buildCreateConversationPayload = (payload = {}) => {
  return {
    participantUserId: getValue(
      payload.participantUserId,
      payload.receiverUserId,
      payload.otherUserId
    ),
    projectId: getValue(payload.projectId, null),
    proposalId: getValue(payload.proposalId, null),
    contractId: getValue(payload.contractId, null),
    initialMessage: trim(
      getValue(payload.initialMessage, payload.message, payload.content, "")
    ),
  };
};

const buildSendMessagePayload = (payload = {}) => {
  return {
    content: trim(getValue(payload.content, payload.message, payload.messageText, "")),
    messageText: trim(
      getValue(payload.messageText, payload.message, payload.content, "")
    ),
    attachmentUrl: trim(getValue(payload.attachmentUrl, payload.fileUrl, "")),
  };
};

const conversationService = {
  async createConversation(payload) {
    const request = buildCreateConversationPayload(payload);
    const response = await conversationApi.createConversation(request);

    return normalizeConversation(unwrapData(response));
  },

  async getMyConversations(params = {}) {
    const response = await conversationApi.getMyConversations(params);

    return unwrapListData(response).map(normalizeConversation).filter(Boolean);
  },

  async getConversation(conversationId) {
    if (!conversationId) {
      throw new Error("conversationId is required.");
    }

    const response = await conversationApi.getConversation(conversationId);

    return normalizeConversation(unwrapData(response));
  },

  async getConversationMessages(conversationId, params = {}) {
    if (!conversationId) {
      throw new Error("conversationId is required.");
    }

    const response = await conversationApi.getConversationMessages(
      conversationId,
      params
    );

    return unwrapListData(response).map(normalizeMessage).filter(Boolean);
  },

  async sendMessage(conversationId, payload) {
    if (!conversationId) {
      throw new Error("conversationId is required.");
    }

    const request = buildSendMessagePayload(payload);

    if (!request.content && !request.messageText && !request.attachmentUrl) {
      throw new Error("Message content is required.");
    }

    const response = await conversationApi.sendMessage(conversationId, request);

    return normalizeMessage(unwrapData(response));
  },

  normalizeConversation,
  normalizeMessage,
};

export default conversationService;