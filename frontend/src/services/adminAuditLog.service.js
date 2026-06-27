import adminAuditLogApi from "../api/adminAuditLog.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const unwrapSingleData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.auditLog) return data.data.auditLog;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.auditLog) return data.auditLog;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const getListSource = (data) => {
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

export const normalizeAuditLog = (item) => {
  if (!item) return null;

  const auditLogId = getValue(
    item.auditLogId,
    item.AuditLogId,
    item.auditLogID,
    item.AuditLogID,
    item.adminAuditLogId,
    item.AdminAuditLogId,
    item.adminAuditLogID,
    item.AdminAuditLogID,
    item.auditId,
    item.AuditId,
    item.auditID,
    item.AuditID,
    item.logId,
    item.LogId,
    item.logID,
    item.LogID,
    item.id,
    item.Id
  );

  const admin = getValue(item.admin, item.Admin, null);
  const user = getValue(item.user, item.User, null);

  return {
    auditLogId,
    id: auditLogId,

    adminId: getValue(
      item.adminId,
      item.AdminId,
      admin?.adminId,
      admin?.AdminId,
      user?.userId,
      user?.UserId,
      item.userId,
      item.UserId
    ),

    adminEmail: getValue(
      item.adminEmail,
      item.AdminEmail,
      admin?.email,
      admin?.Email,
      user?.email,
      user?.Email,
      item.email,
      item.Email,
      ""
    ),

    adminName: getValue(
      item.adminName,
      item.AdminName,
      admin?.fullName,
      admin?.FullName,
      user?.fullName,
      user?.FullName,
      item.fullName,
      item.FullName,
      item.name,
      item.Name,
      ""
    ),

    action: getValue(item.action, item.Action, "UNKNOWN"),

    entityName: getValue(
      item.entityName,
      item.EntityName,
      item.tableName,
      item.TableName,
      item.moduleName,
      item.ModuleName,
      "N/A"
    ),

    entityId: getValue(
      item.entityId,
      item.EntityId,
      item.recordId,
      item.RecordId,
      item.targetId,
      item.TargetId,
      "N/A"
    ),

    description: getValue(
      item.description,
      item.Description,
      item.message,
      item.Message,
      item.details,
      item.Details,
      ""
    ),

    reason: getValue(item.reason, item.Reason, ""),

    oldValues: getValue(
      item.oldValues,
      item.OldValues,
      item.oldValue,
      item.OldValue,
      item.beforeValue,
      item.BeforeValue,
      ""
    ),

    newValues: getValue(
      item.newValues,
      item.NewValues,
      item.newValue,
      item.NewValue,
      item.afterValue,
      item.AfterValue,
      ""
    ),

    ipAddress: getValue(
      item.ipAddress,
      item.IpAddress,
      item.ip,
      item.IP,
      ""
    ),

    userAgent: getValue(item.userAgent, item.UserAgent, ""),

    createdAt: getValue(
      item.createdAt,
      item.CreatedAt,
      item.timestamp,
      item.Timestamp,
      item.loggedAt,
      item.LoggedAt,
      item.createdDate,
      item.CreatedDate,
      ""
    ),

    raw: item,
  };
};

const normalizeAuditLogListResponse = (response, fallbackParams = {}) => {
  const data = response?.data;
  const items = getListSource(data).map(normalizeAuditLog).filter(Boolean);

  const metaSource = data?.data && !Array.isArray(data.data) ? data.data : data;

  const pageNumber = toNumber(
    getValue(
      metaSource?.pageNumber,
      metaSource?.PageNumber,
      metaSource?.currentPage,
      metaSource?.CurrentPage,
      fallbackParams.pageNumber,
      fallbackParams.PageNumber,
      1
    ),
    1
  );

  const pageSize = toNumber(
    getValue(
      metaSource?.pageSize,
      metaSource?.PageSize,
      fallbackParams.pageSize,
      fallbackParams.PageSize,
      10
    ),
    10
  );

  const totalCount = toNumber(
    getValue(
      metaSource?.totalCount,
      metaSource?.TotalCount,
      metaSource?.totalItems,
      metaSource?.TotalItems,
      metaSource?.count,
      metaSource?.Count,
      items.length
    ),
    items.length
  );

  const totalPages = toNumber(
    getValue(
      metaSource?.totalPages,
      metaSource?.TotalPages,
      Math.ceil(totalCount / Math.max(pageSize, 1))
    ),
    Math.ceil(totalCount / Math.max(pageSize, 1)) || 1
  );

  return {
    items,
    pageNumber,
    pageSize,
    totalCount,
    totalPages: Math.max(totalPages, 1),
  };
};

const adminAuditLogService = {
  async getAuditLogs(params = {}) {
    const response = await adminAuditLogApi.getAuditLogs(params);
    return normalizeAuditLogListResponse(response, params);
  },

  async getAuditLogById(auditLogId) {
    const response = await adminAuditLogApi.getAuditLogById(auditLogId);
    return normalizeAuditLog(unwrapSingleData(response));
  },
};

export default adminAuditLogService;