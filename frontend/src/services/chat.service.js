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
      conversation.ClientUserId,
      conversation.expertUserId,
      conversation.ExpertUserId
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

    clientUserId: getValue(conversation.clientUserId, conversation.ClientUserId),
    clientName: getValue(conversation.clientName, conversation.ClientName, ""),
    clientAvatarUrl: getValue(
      conversation.clientAvatarUrl,
      conversation.ClientAvatarUrl,
      ""
    ),

    expertUserId: getValue(conversation.expertUserId, conversation.ExpertUserId),
    expertName: getValue(conversation.expertName, conversation.ExpertName, ""),
    expertAvatarUrl: getValue(
      conversation.expertAvatarUrl,
      conversation.ExpertAvatarUrl,
      ""
    ),

    conversationType: getValue(
      conversation.conversationType,
      conversation.ConversationType,
      ""
    ),
    status: getValue(conversation.status, conversation.Status, ""),

    lastMessage: getValue(
      conversation.lastMessage,
      conversation.LastMessage,
      conversation.lastMessageContent,
      conversation.LastMessageContent,
      conversation.latestMessage,
      conversation.LatestMessage,
      conversation.messagePreview,
      conversation.MessagePreview,
      "No message yet"
    ),

    jobId: getValue(
      conversation.jobId,
      conversation.JobId,
      conversation.relatedJobId,
      conversation.RelatedJobId
    ),
    jobTitle: getValue(
      conversation.jobTitle,
      conversation.JobTitle,
      conversation.relatedJobTitle,
      conversation.RelatedJobTitle,
      ""
    ),
    projectId: getValue(
      conversation.projectId,
      conversation.ProjectId,
      conversation.relatedProjectId,
      conversation.RelatedProjectId
    ),
    projectTitle: getValue(
      conversation.projectTitle,
      conversation.ProjectTitle,
      conversation.relatedProjectTitle,
      conversation.RelatedProjectTitle,
      ""
    ),
    proposalId: getValue(
      conversation.proposalId,
      conversation.ProposalId,
      conversation.relatedProposalId,
      conversation.RelatedProposalId
    ),
    contractId: getValue(
      conversation.contractId,
      conversation.ContractId,
      conversation.relatedContractId,
      conversation.RelatedContractId
    ),
    milestoneId: getValue(
      conversation.milestoneId,
      conversation.MilestoneId,
      conversation.relatedMilestoneId,
      conversation.RelatedMilestoneId
    ),
    disputeId: getValue(
      conversation.disputeId,
      conversation.DisputeId,
      conversation.relatedDisputeId,
      conversation.RelatedDisputeId
    ),

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
    message.conversationMessageId,
    message.ConversationMessageId,
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
      message.senderUserId,
      message.SenderUserId,
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
    messageType: getValue(message.messageType, message.MessageType, "TEXT"),
    attachmentUrl: getValue(message.attachmentUrl, message.AttachmentUrl, ""),

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

const toNumberOrNull = (value) => {
  const number = Number(value);
  return Number.isNaN(number) || number <= 0 ? null : number;
};

const setNumberField = (payload, key, value) => {
  const number = toNumberOrNull(value);

  if (number !== null) {
    payload[key] = number;
  }
};

const buildCreateConversationPayload = (data = {}) => {
  const payload = {};

  const participantUserId =
    data.participantUserId ||
    data.ParticipantUserId ||
    data.receiverUserId ||
    data.ReceiverUserId ||
    data.targetUserId ||
    data.TargetUserId;

  const participantRole = String(
    getValue(data.participantRole, data.ParticipantRole, data.targetRole, "")
  )
    .trim()
    .toUpperCase();

  const conversationType = getValue(
    data.conversationType,
    data.ConversationType,
    data.type,
    data.Type
  );

  if (conversationType) {
    payload.conversationType = String(conversationType).trim().toUpperCase();
  }

  setNumberField(
    payload,
    "clientUserId",
    getValue(data.clientUserId, data.ClientUserId)
  );
  setNumberField(
    payload,
    "expertUserId",
    getValue(data.expertUserId, data.ExpertUserId)
  );

  if (participantUserId) {
    const targetKey = participantRole === "EXPERT" ? "expertUserId" : "clientUserId";
    setNumberField(payload, targetKey, participantUserId);
  }

  setNumberField(
    payload,
    "clientProfileId",
    getValue(
      data.clientProfileId,
      data.ClientProfileId,
      data.participantClientProfileId,
      data.ParticipantClientProfileId
    )
  );
  setNumberField(
    payload,
    "expertProfileId",
    getValue(
      data.expertProfileId,
      data.ExpertProfileId,
      data.participantExpertProfileId,
      data.ParticipantExpertProfileId
    )
  );
  setNumberField(
    payload,
    "relatedJobId",
    getValue(data.relatedJobId, data.RelatedJobId, data.jobPostingId, data.JobPostingId, data.jobId, data.JobId)
  );
  setNumberField(
    payload,
    "relatedProposalId",
    getValue(data.relatedProposalId, data.RelatedProposalId, data.proposalId, data.ProposalId)
  );
  setNumberField(
    payload,
    "relatedContractId",
    getValue(data.relatedContractId, data.RelatedContractId, data.contractId, data.ContractId)
  );
  setNumberField(
    payload,
    "relatedProjectId",
    getValue(data.relatedProjectId, data.RelatedProjectId, data.projectId, data.ProjectId)
  );
  setNumberField(
    payload,
    "relatedMilestoneId",
    getValue(data.relatedMilestoneId, data.RelatedMilestoneId, data.milestoneId, data.MilestoneId)
  );
  setNumberField(
    payload,
    "relatedDisputeId",
    getValue(data.relatedDisputeId, data.RelatedDisputeId, data.disputeId, data.DisputeId)
  );

  const initialMessage = getValue(data.initialMessage, data.InitialMessage);

  if (initialMessage) {
    payload.initialMessage = String(initialMessage).trim();
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