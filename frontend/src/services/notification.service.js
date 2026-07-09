import notificationApi from "../api/notification.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const isInvalidId = (value) => {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined" ||
    value === "null"
  );
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.notification) return data.data.notification;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.notification) return data.notification;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.notifications)) return data.notifications;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.notifications)) return data.data.notifications;

  return [];
};

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;

  const text = String(value || "").trim().toUpperCase();

  return ["TRUE", "1", "YES", "READ"].includes(text);
};

const normalizeText = (value) => String(value || "").trim();

export const normalizeNotification = (notification) => {
  if (!notification) return null;

  const raw = notification.raw || notification.Raw || notification;

  const notificationId = getValue(
    notification.notificationId,
    notification.NotificationId,
    notification.notificationID,
    notification.NotificationID,
    notification.id,
    notification.Id,
    raw.notificationId,
    raw.NotificationId,
    raw.id,
    raw.Id
  );

  const type = String(
    getValue(
      notification.type,
      notification.Type,
      notification.notificationType,
      notification.NotificationType,
      raw.type,
      raw.Type,
      "GENERAL"
    )
  )
    .trim()
    .toUpperCase();

  const status = String(
    getValue(notification.status, notification.Status, raw.status, raw.Status, "")
  )
    .trim()
    .toUpperCase();

  const message = getValue(
    notification.message,
    notification.Message,
    notification.content,
    notification.Content,
    notification.body,
    notification.Body,
    raw.message,
    raw.Message,
    raw.content,
    raw.Content,
    raw.body,
    raw.Body,
    ""
  );

  const isRead = normalizeBoolean(
    getValue(
      notification.isRead,
      notification.IsRead,
      notification.read,
      notification.Read,
      notification.readAt,
      notification.ReadAt,
      raw.isRead,
      raw.IsRead,
      raw.read,
      raw.Read,
      raw.readAt,
      raw.ReadAt,
      status === "READ" ? "READ" : ""
    )
  );

  const normalized = {
    notificationId,
    id: notificationId,

    userId: getValue(
      notification.userId,
      notification.UserId,
      raw.userId,
      raw.UserId,
      ""
    ),

    title: getValue(
      notification.title,
      notification.Title,
      notification.subject,
      notification.Subject,
      raw.title,
      raw.Title,
      raw.subject,
      raw.Subject,
      "Notification"
    ),

    message,
    content: message,

    type,
    status,
    isRead,

    relatedEntityType: String(
      getValue(
        notification.relatedEntityType,
        notification.RelatedEntityType,
        notification.entityType,
        notification.EntityType,
        raw.relatedEntityType,
        raw.RelatedEntityType,
        raw.entityType,
        raw.EntityType,
        ""
      )
    )
      .trim()
      .toUpperCase(),

    relatedEntityId: getValue(
      notification.relatedEntityId,
      notification.RelatedEntityId,
      notification.entityId,
      notification.EntityId,
      raw.relatedEntityId,
      raw.RelatedEntityId,
      raw.entityId,
      raw.EntityId,
      ""
    ),

    relatedJobId: getValue(
      notification.relatedJobId,
      notification.RelatedJobId,
      notification.jobId,
      notification.JobId,
      notification.jobPostingId,
      notification.JobPostingId,
      raw.relatedJobId,
      raw.RelatedJobId,
      raw.jobId,
      raw.JobId,
      raw.jobPostingId,
      raw.JobPostingId,
      ""
    ),

    relatedProposalId: getValue(
      notification.relatedProposalId,
      notification.RelatedProposalId,
      notification.proposalId,
      notification.ProposalId,
      notification.projectProposalId,
      notification.ProjectProposalId,
      raw.relatedProposalId,
      raw.RelatedProposalId,
      raw.proposalId,
      raw.ProposalId,
      raw.projectProposalId,
      raw.ProjectProposalId,
      ""
    ),

    relatedContractId: getValue(
      notification.relatedContractId,
      notification.RelatedContractId,
      notification.contractId,
      notification.ContractId,
      notification.projectContractId,
      notification.ProjectContractId,
      raw.relatedContractId,
      raw.RelatedContractId,
      raw.contractId,
      raw.ContractId,
      raw.projectContractId,
      raw.ProjectContractId,
      ""
    ),

    relatedProjectId: getValue(
      notification.relatedProjectId,
      notification.RelatedProjectId,
      notification.projectId,
      notification.ProjectId,
      raw.relatedProjectId,
      raw.RelatedProjectId,
      raw.projectId,
      raw.ProjectId,
      ""
    ),

    relatedMilestoneId: getValue(
      notification.relatedMilestoneId,
      notification.RelatedMilestoneId,
      notification.milestoneId,
      notification.MilestoneId,
      notification.projectMilestoneId,
      notification.ProjectMilestoneId,
      raw.relatedMilestoneId,
      raw.RelatedMilestoneId,
      raw.milestoneId,
      raw.MilestoneId,
      raw.projectMilestoneId,
      raw.ProjectMilestoneId,
      ""
    ),

    relatedDeliverableId: getValue(
      notification.relatedDeliverableId,
      notification.RelatedDeliverableId,
      notification.deliverableId,
      notification.DeliverableId,
      notification.submissionId,
      notification.SubmissionId,
      raw.relatedDeliverableId,
      raw.RelatedDeliverableId,
      raw.deliverableId,
      raw.DeliverableId,
      raw.submissionId,
      raw.SubmissionId,
      ""
    ),

    relatedDisputeId: getValue(
      notification.relatedDisputeId,
      notification.RelatedDisputeId,
      notification.disputeId,
      notification.DisputeId,
      raw.relatedDisputeId,
      raw.RelatedDisputeId,
      raw.disputeId,
      raw.DisputeId,
      ""
    ),

    relatedConversationId: getValue(
      notification.relatedConversationId,
      notification.RelatedConversationId,
      notification.conversationId,
      notification.ConversationId,
      raw.relatedConversationId,
      raw.RelatedConversationId,
      raw.conversationId,
      raw.ConversationId,
      ""
    ),

    createdAt: getValue(
      notification.createdAt,
      notification.CreatedAt,
      notification.createdAtUtc,
      notification.CreatedAtUtc,
      raw.createdAt,
      raw.CreatedAt,
      raw.createdAtUtc,
      raw.CreatedAtUtc,
      ""
    ),

    createdAtUtc: getValue(
      notification.createdAtUtc,
      notification.CreatedAtUtc,
      raw.createdAtUtc,
      raw.CreatedAtUtc,
      ""
    ),

    readAt: getValue(
      notification.readAt,
      notification.ReadAt,
      raw.readAt,
      raw.ReadAt,
      ""
    ),

    raw: notification,
  };

  normalized.target = getNotificationTarget(normalized);

  return normalized;
};

export function getNotificationTarget(notification) {
  if (!notification) return null;

  const type = normalizeText(notification.type).toUpperCase();
  const entityType = normalizeText(notification.relatedEntityType).toUpperCase();

  const proposalId = getValue(notification.relatedProposalId, "");
  const contractId = getValue(notification.relatedContractId, "");
  const projectId = getValue(notification.relatedProjectId, "");
  const milestoneId = getValue(notification.relatedMilestoneId, "");
  const deliverableId = getValue(notification.relatedDeliverableId, "");
  const disputeId = getValue(notification.relatedDisputeId, "");
  const conversationId = getValue(notification.relatedConversationId, "");
  const jobId = getValue(notification.relatedJobId, "");
  const entityId = getValue(notification.relatedEntityId, "");

  const isProposal = type.includes("PROPOSAL") || entityType === "PROPOSAL";
  const isContract = type.includes("CONTRACT") || entityType === "CONTRACT";
  const isProject = type.includes("PROJECT") || entityType === "PROJECT";
  const isMilestone = type.includes("MILESTONE") || entityType === "MILESTONE";

  const isDeliverable =
    type.includes("DELIVERABLE") ||
    type.includes("SUBMISSION") ||
    type.includes("REVISION") ||
    entityType === "DELIVERABLE" ||
    entityType === "SUBMISSION";

  const isConversation =
    type.includes("CHAT") ||
    type.includes("MESSAGE") ||
    entityType === "CONVERSATION";

  const isDispute = type.includes("DISPUTE") || entityType === "DISPUTE";

  const isWallet =
    type.includes("WALLET") ||
    type.includes("PAYMENT") ||
    type.includes("ESCROW") ||
    type.includes("WITHDRAW");

  const isReview = type.includes("REVIEW") || entityType === "REVIEW";

  const isJob =
    type.includes("JOB") ||
    entityType === "JOB" ||
    entityType === "JOBPOSTING";

  if (isProposal) {
    const id = !isInvalidId(proposalId)
      ? proposalId
      : entityType === "PROPOSAL"
      ? entityId
      : "";

    if (!isInvalidId(id)) {
      return {
        path: `/expert/proposals/${id}`,
        label: "View proposal",
        kind: "PROPOSAL",
      };
    }
  }

  if (isContract) {
    const id = !isInvalidId(contractId)
      ? contractId
      : entityType === "CONTRACT"
      ? entityId
      : "";

    if (!isInvalidId(id)) {
      return {
        path: `/expert/contracts/${id}`,
        label: "View agreement",
        kind: "CONTRACT",
      };
    }

    if (!isInvalidId(proposalId)) {
      return {
        path: `/expert/proposals/${proposalId}/contract`,
        label: "View agreement",
        kind: "CONTRACT",
      };
    }
  }

  if (
    type.includes("REVISION") ||
    type.includes("RESUBMIT") ||
    type.includes("REWORK")
  ) {
    const id = !isInvalidId(milestoneId)
      ? milestoneId
      : entityType === "MILESTONE"
      ? entityId
      : "";

    if (!isInvalidId(id)) {
      return {
        path: `/expert/milestones/${id}`,
        label: "Resubmit work",
        kind: "MILESTONE",
      };
    }
  }

  if (isProject) {
    const id = !isInvalidId(projectId)
      ? projectId
      : entityType === "PROJECT"
      ? entityId
      : "";

    if (!isInvalidId(id)) {
      return {
        path: `/expert/projects/${id}`,
        label: "View project",
        kind: "PROJECT",
      };
    }
  }

  if (isMilestone) {
    const id = !isInvalidId(milestoneId)
      ? milestoneId
      : entityType === "MILESTONE"
      ? entityId
      : "";

    if (!isInvalidId(id)) {
      return {
        path: `/expert/milestones/${id}`,
        label: "View milestone",
        kind: "MILESTONE",
      };
    }

    if (!isInvalidId(projectId)) {
      return {
        path: `/expert/projects/${projectId}`,
        label: "View project",
        kind: "PROJECT",
      };
    }
  }

  if (isDeliverable) {
    const id = !isInvalidId(deliverableId)
      ? deliverableId
      : entityType === "DELIVERABLE" || entityType === "SUBMISSION"
      ? entityId
      : "";

    if (!isInvalidId(id)) {
      return {
        path: `/expert/deliverables/${id}`,
        label: "View submission",
        kind: "SUBMISSION",
      };
    }

    if (!isInvalidId(milestoneId)) {
      return {
        path: `/expert/milestones/${milestoneId}`,
        label: "View milestone",
        kind: "MILESTONE",
      };
    }
  }

  if (isConversation) {
    if (!isInvalidId(conversationId)) {
      return {
        path: `/expert/messages?conversationId=${conversationId}`,
        label: "Open message",
        kind: "MESSAGE",
      };
    }

    return {
      path: "/expert/messages",
      label: "Open messages",
      kind: "MESSAGE",
    };
  }

  if (isDispute) {
    const id = !isInvalidId(disputeId)
      ? disputeId
      : entityType === "DISPUTE"
      ? entityId
      : "";

    if (!isInvalidId(id)) {
      return {
        path: `/expert/disputes/${id}`,
        label: "View dispute",
        kind: "DISPUTE",
      };
    }

    return {
      path: "/expert/disputes",
      label: "View disputes",
      kind: "DISPUTE",
    };
  }

  if (isWallet) {
    return {
      path: "/expert/wallet",
      label: "View wallet",
      kind: "WALLET",
    };
  }

  if (isReview) {
    return {
      path: "/expert/reviews",
      label: "View reviews",
      kind: "REVIEW",
    };
  }

  if (isJob) {
    const id = !isInvalidId(jobId)
      ? jobId
      : entityType === "JOB" || entityType === "JOBPOSTING"
      ? entityId
      : "";

    if (!isInvalidId(id)) {
      return {
        path: `/expert/jobs/${id}`,
        label: "View job",
        kind: "JOB",
      };
    }
  }

  return {
    path: "/expert/notifications",
    label: "View notification",
    kind: "GENERAL",
  };
}

export function formatNotificationTime(value, options = {}) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No date";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  const timeText = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!options.full) {
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";

    if (diffDays < 7) {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
      });
    }

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (diffMinutes < 1) return `Just now`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  if (diffDays === 1) {
    return `Yesterday ${timeText}`;
  }

  if (diffDays < 7) {
    const weekday = date.toLocaleDateString("en-US", {
      weekday: "short",
    });

    return `${weekday} ${timeText}`;
  }

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const notificationService = {
  async getMyNotifications() {
    const response = await notificationApi.getMyNotifications();

    return unwrapListData(response)
      .map(normalizeNotification)
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.createdAtUtc || 0).getTime();
        const dateB = new Date(b.createdAt || b.createdAtUtc || 0).getTime();

        return dateB - dateA;
      });
  },

  async getNotificationById(notificationId) {
    if (isInvalidId(notificationId)) {
      throw new Error("Invalid notification id.");
    }

    const response = await notificationApi.getNotificationById(notificationId);

    return normalizeNotification(unwrapData(response));
  },

  async markAsRead(notificationId) {
    if (isInvalidId(notificationId)) {
      throw new Error("Invalid notification id.");
    }

    const response = await notificationApi.markAsRead(notificationId);
    const data = unwrapData(response);

    if (!data) return true;

    return normalizeNotification(data) || true;
  },

  async markAllAsRead() {
    const response = await notificationApi.markAllAsRead();
    return unwrapData(response) || true;
  },

  async getUnreadCount() {
    const response = await notificationApi.getUnreadCount();
    const data = unwrapData(response);

    if (typeof data === "number") return data;
    if (typeof data?.unreadCount === "number") return data.unreadCount;
    if (typeof response?.data?.unreadCount === "number") {
      return response.data.unreadCount;
    }

    return 0;
  },

  getNotificationTarget,
  normalizeNotification,
  formatNotificationTime,
};

export default notificationService;