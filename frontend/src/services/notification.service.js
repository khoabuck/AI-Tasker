import notificationApi from "../api/notification.api";

const notificationService = {
  async getMyNotifications(params = {}) {
    const response = await notificationApi.getMyNotifications(params);
    const data = unwrap(response);
    const list = unwrapList(data);

    return list.map(normalizeNotification);
  },

  async getUnreadCount() {
    const response = await notificationApi.getUnreadCount();
    const data = unwrap(response);

    return Number(
      data?.unreadCount ??
        data?.UnreadCount ??
        data?.count ??
        data?.Count ??
        data ??
        0
    );
  },

  async markAsRead(notificationId) {
    if (!notificationId) {
      throw new Error("notificationId is required.");
    }

    const response = await notificationApi.markAsRead(notificationId);

    return unwrap(response);
  },

  async markAllAsRead() {
    const response = await notificationApi.markAllAsRead();

    return unwrap(response);
  },
};

function unwrap(response) {
  return response?.data ?? response;
}

function unwrapList(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.Notifications)) return data.Notifications;

  return [];
}

function normalizeNotification(item) {
  const notificationId =
    item?.notificationId ??
    item?.NotificationId ??
    item?.id ??
    item?.Id ??
    item?.notificationID ??
    item?.NotificationID;

  const isRead =
    item?.isRead ??
    item?.IsRead ??
    item?.read ??
    item?.Read ??
    false;

  return {
    notificationId,
    id: notificationId,
    title:
      item?.title ||
      item?.Title ||
      getTitleFromType(item?.type || item?.Type) ||
      "Notification",
    message:
      item?.message ||
      item?.Message ||
      item?.content ||
      item?.Content ||
      item?.body ||
      item?.Body ||
      "",
    type: item?.type || item?.Type || "INFO",
    isRead: Boolean(isRead),
    createdAt:
      item?.createdAt ||
      item?.CreatedAt ||
      item?.createdDate ||
      item?.CreatedDate ||
      null,
    relatedEntityId:
      item?.relatedEntityId ??
      item?.RelatedEntityId ??
      item?.entityId ??
      item?.EntityId ??
      null,
    relatedEntityType:
      item?.relatedEntityType ||
      item?.RelatedEntityType ||
      item?.entityType ||
      item?.EntityType ||
      "",
  };
}

function getTitleFromType(type) {
  const value = String(type || "").toUpperCase();

  if (value.includes("PROPOSAL")) return "Proposal update";
  if (value.includes("CONTRACT")) return "Contract update";
  if (value.includes("PROJECT")) return "Project update";
  if (value.includes("MILESTONE")) return "Milestone update";
  if (value.includes("DELIVERABLE")) return "Deliverable update";
  if (value.includes("DISPUTE")) return "Dispute update";

  if (value.includes("WALLET") || value.includes("WITHDRAW")) {
    return "Wallet update";
  }

  return "Notification";
}

export default notificationService;