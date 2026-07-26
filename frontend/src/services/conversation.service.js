import conversationApi from "../api/conversation.api";
import { compareDateAsc, compareDateDesc } from "../utils/dateTime.utils";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

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

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.conversation) return data.data.conversation;
  if (data?.data?.message) return data.data.message;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data !== undefined) return data.data;

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
    item.Id,
    item.conversationID,
    item.ConversationID
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
    item.otherUser?.fullName,
    item.OtherUser?.FullName,
    item.otherUser?.name,
    item.OtherUser?.Name,
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
      item.SenderUserId,
      item.otherUser?.userId,
      item.OtherUser?.UserId,
      item.otherUser?.id,
      item.OtherUser?.Id
    ),

    otherUserName,

    otherUserEmail: getValue(
      item.otherUserEmail,
      item.OtherUserEmail,
      item.participantEmail,
      item.ParticipantEmail,
      item.receiverEmail,
      item.ReceiverEmail,
      item.senderEmail,
      item.SenderEmail,
      item.clientEmail,
      item.ClientEmail,
      item.expertEmail,
      item.ExpertEmail,
      item.otherUser?.email,
      item.OtherUser?.Email,
      ""
    ),

    otherUserAvatarUrl: getValue(
      item.otherUserAvatarUrl,
      item.OtherUserAvatarUrl,
      item.participantAvatarUrl,
      item.ParticipantAvatarUrl,
      item.receiverAvatarUrl,
      item.ReceiverAvatarUrl,
      item.senderAvatarUrl,
      item.SenderAvatarUrl,
      item.otherUser?.avatarUrl,
      item.OtherUser?.AvatarUrl,
      ""
    ),

    lastMessage: getValue(
      item.lastMessage,
      item.LastMessage,
      item.lastMessageContent,
      item.LastMessageContent,
      item.latestMessage,
      item.LatestMessage,
      item.messagePreview,
      item.MessagePreview,
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
    item.senderId,
    item.SenderId,
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
    senderId: senderUserId,

    senderName: getValue(
      item.senderName,
      item.SenderName,
      item.userName,
      item.UserName,
      item.createdByName,
      item.CreatedByName,
      "User"
    ),

    senderRole: String(
      getValue(item.senderRole, item.SenderRole, "")
    ).toUpperCase(),

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

    createdAt: getValue(
      item.createdAt,
      item.CreatedAt,
      item.sentAt,
      item.SentAt,
      ""
    ),

    raw: item,
  };
};

const buildCreateConversationPayload = (data = {}) => {
  const request = {};

  const participantUserId = getValue(
    data.participantUserId,
    data.ParticipantUserId,
    data.receiverUserId,
    data.ReceiverUserId,
    data.otherUserId,
    data.OtherUserId,
    data.targetUserId,
    data.TargetUserId
  );

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
    request.conversationType = String(conversationType).trim().toUpperCase();
  }

  setNumberField(
    request,
    "clientUserId",
    getValue(data.clientUserId, data.ClientUserId)
  );
  setNumberField(
    request,
    "expertUserId",
    getValue(data.expertUserId, data.ExpertUserId)
  );

  if (participantUserId) {
    const targetKey =
      participantRole === "EXPERT" ? "expertUserId" : "clientUserId";
    setNumberField(request, targetKey, participantUserId);
  }

  setNumberField(
    request,
    "clientProfileId",
    getValue(
      data.clientProfileId,
      data.ClientProfileId,
      data.participantClientProfileId,
      data.ParticipantClientProfileId
    )
  );
  setNumberField(
    request,
    "expertProfileId",
    getValue(
      data.expertProfileId,
      data.ExpertProfileId,
      data.participantExpertProfileId,
      data.ParticipantExpertProfileId
    )
  );
  setNumberField(
    request,
    "relatedJobId",
    getValue(
      data.relatedJobId,
      data.RelatedJobId,
      data.jobPostingId,
      data.JobPostingId,
      data.jobId,
      data.JobId
    )
  );
  setNumberField(
    request,
    "relatedProposalId",
    getValue(data.relatedProposalId, data.RelatedProposalId, data.proposalId, data.ProposalId)
  );
  setNumberField(
    request,
    "relatedContractId",
    getValue(data.relatedContractId, data.RelatedContractId, data.contractId, data.ContractId)
  );
  setNumberField(
    request,
    "relatedProjectId",
    getValue(data.relatedProjectId, data.RelatedProjectId, data.projectId, data.ProjectId)
  );
  setNumberField(
    request,
    "relatedMilestoneId",
    getValue(data.relatedMilestoneId, data.RelatedMilestoneId, data.milestoneId, data.MilestoneId)
  );
  setNumberField(
    request,
    "relatedDisputeId",
    getValue(data.relatedDisputeId, data.RelatedDisputeId, data.disputeId, data.DisputeId)
  );

  const initialMessage = trim(
    getValue(data.initialMessage, data.InitialMessage, data.message, data.content, "")
  );

  if (initialMessage) {
    request.initialMessage = initialMessage;
  }

  return request;
};

const buildSendMessagePayload = (payload = {}) => {
  if (typeof payload === "string") {
    return {
      content: trim(payload),
    };
  }

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

    const hasParticipant =
      request.clientUserId ||
      request.expertUserId ||
      request.clientProfileId ||
      request.expertProfileId;
    const hasRelatedEntity =
      request.relatedJobId ||
      request.relatedProposalId ||
      request.relatedContractId ||
      request.relatedProjectId ||
      request.relatedMilestoneId ||
      request.relatedDisputeId;

    if (!hasParticipant && !hasRelatedEntity) {
      throw new Error("A participant or related item is required to create conversation.");
    }

    const response = await conversationApi.createConversation(request);

    return normalizeConversation(unwrapData(response));
  },

  async getMyConversations(params = {}) {
    const response = await conversationApi.getMyConversations(params);

    return unwrapListData(response)
      .map(normalizeConversation)
      .filter(Boolean)
      .sort((first, second) =>
        compareDateDesc(first.lastMessageAt, second.lastMessageAt)
      );
  },

  async getConversations(params = {}) {
    return conversationService.getMyConversations(params);
  },

  async getConversation(conversationId) {
    if (!conversationId) {
      throw new Error("conversationId is required.");
    }

    const response = await conversationApi.getConversation(conversationId);

    return normalizeConversation(unwrapData(response));
  },

  async getConversationById(conversationId) {
    return conversationService.getConversation(conversationId);
  },

  async getConversationMessages(conversationId, params = {}) {
    if (!conversationId) {
      throw new Error("conversationId is required.");
    }

    const response = await conversationApi.getConversationMessages(
      conversationId,
      params
    );

    return unwrapListData(response)
      .map(normalizeMessage)
      .filter(Boolean)
      .sort((first, second) =>
        compareDateAsc(first.createdAt, second.createdAt)
      );
  },

  async getMessages(conversationId, params = {}) {
    return conversationService.getConversationMessages(conversationId, params);
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