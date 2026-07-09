import adminAuditLogApi from "../api/adminAuditLog.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const isInvalidId = (value) => {
  return !value || value === "undefined" || value === "null";
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.auditLog) return data.data.auditLog;
  if (data?.data?.log) return data.data.log;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.auditLog) return data.auditLog;
  if (data?.log) return data.log;
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
  if (Array.isArray(data?.auditLogs)) return data.auditLogs;
  if (Array.isArray(data?.logs)) return data.logs;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.auditLogs)) return data.data.auditLogs;
  if (Array.isArray(data?.data?.logs)) return data.data.logs;

  return [];
};

const parseJsonLike = (value) => {
  if (!value) return null;

  if (typeof value === "object") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const normalizeAuditLog = (log) => {
  if (!log) return null;

  const auditLogId = getValue(
    log.auditLogId,
    log.AuditLogId,
    log.id,
    log.Id
  );

  const action = String(
    getValue(
      log.action,
      log.Action,
      log.actionType,
      log.ActionType,
      log.eventType,
      log.EventType,
      "UNKNOWN_ACTION"
    )
  )
    .trim()
    .toUpperCase();

  const entityType = String(
    getValue(
      log.entityType,
      log.EntityType,
      log.targetType,
      log.TargetType,
      log.tableName,
      log.TableName,
      "UNKNOWN_ENTITY"
    )
  )
    .trim()
    .toUpperCase();

  return {
    auditLogId,
    id: auditLogId,

    action,
    entityType,

    entityId: getValue(
      log.entityId,
      log.EntityId,
      log.targetId,
      log.TargetId,
      log.recordId,
      log.RecordId,
      ""
    ),

    actorUserId: getValue(
      log.actorUserId,
      log.ActorUserId,
      log.adminUserId,
      log.AdminUserId,
      log.userId,
      log.UserId,
      ""
    ),

    actorName: getValue(
      log.actorName,
      log.ActorName,
      log.adminName,
      log.AdminName,
      log.userName,
      log.UserName,
      log.actor?.fullName,
      log.Actor?.FullName,
      "System"
    ),

    actorEmail: getValue(
      log.actorEmail,
      log.ActorEmail,
      log.adminEmail,
      log.AdminEmail,
      log.userEmail,
      log.UserEmail,
      log.actor?.email,
      log.Actor?.Email,
      ""
    ),

    description: getValue(
      log.description,
      log.Description,
      log.message,
      log.Message,
      log.note,
      log.Note,
      ""
    ),

    ipAddress: getValue(log.ipAddress, log.IpAddress, log.ip, log.IP, ""),

    userAgent: getValue(log.userAgent, log.UserAgent, ""),

    oldValues: parseJsonLike(
      getValue(log.oldValues, log.OldValues, log.before, log.Before, null)
    ),

    newValues: parseJsonLike(
      getValue(log.newValues, log.NewValues, log.after, log.After, null)
    ),

    metadata: parseJsonLike(
      getValue(log.metadata, log.Metadata, log.extraData, log.ExtraData, null)
    ),

    createdAt: getValue(
      log.createdAt,
      log.CreatedAt,
      log.timestamp,
      log.Timestamp,
      log.loggedAt,
      log.LoggedAt,
      ""
    ),

    raw: log,
  };
};

const adminAuditLogService = {
  async getAuditLogs(params = {}) {
    const response = await adminAuditLogApi.getAuditLogs(params);

    console.log("ADMIN AUDIT LOGS RESPONSE:", response?.data);

    return unwrapListData(response).map(normalizeAuditLog).filter(Boolean);
  },

  async getAuditLogById(auditLogId) {
    if (isInvalidId(auditLogId)) {
      throw new Error("Invalid audit log id.");
    }

    const response = await adminAuditLogApi.getAuditLogById(auditLogId);

    console.log("ADMIN AUDIT LOG DETAIL RESPONSE:", response?.data);

    return normalizeAuditLog(unwrapData(response));
  },
};

export default adminAuditLogService;