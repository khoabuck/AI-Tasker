import chatApi from "../api/chat.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.item !== undefined) return data.data.item;
  if (data?.data?.result !== undefined) return data.data.result;
  if (data?.data !== undefined) return data.data;

  if (data?.item !== undefined) return data.item;
  if (data?.result !== undefined) return data.result;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.conversations)) return data.conversations;
  if (Array.isArray(data?.messages)) return data.messages;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.conversations)) return data.data.conversations;
  if (Array.isArray(data?.data?.messages)) return data.data.messages;

  return [];
};

const normalizeConversation = (conversation) => {
  if (!conversation) return null;

  const conversationId = getValue(
    conversation.conversationId,
    conversation.ConversationId,
    conversation.id,
    conversation.Id,
    conversation.conversationID,
    conversation.ConversationID
  );

  return {
    conversationId,
    id: conversationId,

    otherUserId: getValue(
      conversation.otherUserId,
      conversation.OtherUserId,
      conversation.participantUserId,
      conversation.ParticipantUserId,
      conversation.receiverId,
      conversation.ReceiverId,
      conversation.clientUserId,
      conversation.ClientUserId
    ),

    otherUserName: getValue(
      conversation.otherUserName,
      conversation.OtherUserName,
      conversation.otherUser?.fullName,
      conversation.OtherUser?.FullName,
      conversation.otherUser?.name,
      conversation.OtherUser?.Name,
      conversation.clientName,
      conversation.ClientName,
      conversation.expertName,
      conversation.ExpertName,
      conversation.receiverName,
      conversation.ReceiverName,
      conversation.userName,
      conversation.UserName,
      "Conversation"
    ),

    otherUserEmail: getValue(
      conversation.otherUserEmail,
      conversation.OtherUserEmail,
      conversation.otherUser?.email,
      conversation.OtherUser?.Email,
      conversation.clientEmail,
      conversation.ClientEmail,
      conversation.expertEmail,
      conversation.ExpertEmail,
      ""
    ),

    lastMessage: getValue(
      conversation.lastMessage,
      conversation.LastMessage,
      conversation.latestMessage,
      conversation.LatestMessage,
      conversation.messagePreview,
      conversation.MessagePreview,
      "No message yet"
    ),

    projectId: getValue(conversation.projectId, conversation.ProjectId),
    projectTitle: getValue(conversation.projectTitle, conversation.ProjectTitle, ""),
    proposalId: getValue(conversation.proposalId, conversation.ProposalId),
    contractId: getValue(conversation.contractId, conversation.ContractId),

    unreadCount: Number(
      getValue(conversation.unreadCount, conversation.UnreadCount, 0)
    ),

    createdAt: getValue(conversation.createdAt, conversation.CreatedAt, ""),
    updatedAt: getValue(
      conversation.updatedAt,
      conversation.UpdatedAt,
      conversation.lastMessageAt,
      conversation.LastMessageAt,
      conversation.createdAt,
      conversation.CreatedAt,
      ""
    ),

    raw: conversation,
  };
};

const normalizeMessage = (message) => {
  if (!message) return null;

  const messageId = getValue(
    message.messageId,
    message.MessageId,
    message.id,
    message.Id
  );

  return {
    messageId,
    id: messageId,

    conversationId: getValue(
      message.conversationId,
      message.ConversationId
    ),

    senderId: getValue(
      message.senderId,
      message.SenderId,
      message.userId,
      message.UserId
    ),

    senderName: getValue(
      message.senderName,
      message.SenderName,
      message.userName,
      message.UserName,
      ""
    ),

    senderRole: String(
      getValue(message.senderRole, message.SenderRole, "")
    ).toUpperCase(),

    content: getValue(
      message.content,
      message.Content,
      message.message,
      message.Message,
      message.text,
      message.Text,
      ""
    ),

    isMine: Boolean(getValue(message.isMine, message.IsMine, false)),

    createdAt: getValue(
      message.createdAt,
      message.CreatedAt,
      message.sentAt,
      message.SentAt,
      ""
    ),

    raw: message,
  };
};

const buildCreateConversationPayload = (data) => {
  const payload = {};

  const participantUserId =
    data.participantUserId ||
    data.ParticipantUserId ||
    data.clientUserId ||
    data.ClientUserId ||
    data.receiverUserId ||
    data.ReceiverUserId ||
    data.targetUserId ||
    data.TargetUserId;

  const clientProfileId =
    data.clientProfileId ||
    data.ClientProfileId ||
    data.participantClientProfileId ||
    data.ParticipantClientProfileId;

  const jobPostingId =
    data.jobPostingId ||
    data.JobPostingId ||
    data.jobId ||
    data.JobId;

  if (participantUserId) {
    payload.participantUserId = Number(participantUserId);
  }

  if (!payload.participantUserId && clientProfileId) {
    payload.participantUserId = Number(clientProfileId);
  }

  if (clientProfileId) {
    payload.clientProfileId = Number(clientProfileId);
  }

  if (jobPostingId) {
    payload.jobPostingId = Number(jobPostingId);
    payload.jobId = Number(jobPostingId);
  }

  if (data.projectId) {
    payload.projectId = Number(data.projectId);
  }

  if (data.proposalId) {
    payload.proposalId = Number(data.proposalId);
  }

  if (data.contractId) {
    payload.contractId = Number(data.contractId);
  }

  if (data.initialMessage) {
    payload.initialMessage = String(data.initialMessage).trim();
  }

  return payload;
};

const buildSendMessagePayload = (content) => {
  return {
    content: String(content || "").trim(),
  };
};

const chatService = {
  async createConversation(data) {
    const payload = buildCreateConversationPayload(data);

    console.log("CREATE CONVERSATION PAYLOAD:", payload);

    const response = await chatApi.createConversation(payload);

    return normalizeConversation(unwrapData(response));
  },

  async getConversations() {
    const response = await chatApi.getConversations();

    return unwrapListData(response).map(normalizeConversation).filter(Boolean);
  },

  async getConversationById(conversationId) {
    const response = await chatApi.getConversationById(conversationId);

    return normalizeConversation(unwrapData(response));
  },

  async getMessages(conversationId) {
    const response = await chatApi.getMessages(conversationId);

    return unwrapListData(response).map(normalizeMessage).filter(Boolean);
  },

  async sendMessage(conversationId, content) {
    const payload = buildSendMessagePayload(content);
    const response = await chatApi.sendMessage(conversationId, payload);

    return normalizeMessage(unwrapData(response));
  },
};

export default chatService;