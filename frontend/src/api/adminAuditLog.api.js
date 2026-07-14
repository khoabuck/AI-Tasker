import axiosInstance from "./axiosInstance";

const hasValue = (value) => {
  return value !== undefined && value !== null && value !== "";
};

const adminAuditLogApi = {
  getAuditLogs(params = {}) {
    const query = {};

    if (hasValue(params.AdminId)) query.AdminId = params.AdminId;
    if (hasValue(params.adminId)) query.AdminId = params.adminId;

    if (hasValue(params.Action)) query.Action = params.Action;
    if (hasValue(params.action)) query.Action = params.action;

    if (hasValue(params.EntityName)) query.EntityName = params.EntityName;
    if (hasValue(params.entityName)) query.EntityName = params.entityName;

    if (hasValue(params.EntityId)) query.EntityId = params.EntityId;
    if (hasValue(params.entityId)) query.EntityId = params.entityId;

    if (hasValue(params.From)) query.From = params.From;
    if (hasValue(params.from)) query.From = params.from;

    if (hasValue(params.To)) query.To = params.To;
    if (hasValue(params.to)) query.To = params.to;

    if (hasValue(params.PageNumber)) query.PageNumber = params.PageNumber;
    else if (hasValue(params.pageNumber)) query.PageNumber = params.pageNumber;
    else query.PageNumber = 1;

    if (hasValue(params.PageSize)) query.PageSize = params.PageSize;
    else if (hasValue(params.pageSize)) query.PageSize = params.pageSize;
    else query.PageSize = 10;

    return axiosInstance.get("/admin/audit-logs", { params: query });
  },

  getAuditLogById(auditLogId) {
    return axiosInstance.get(`/admin/audit-logs/${auditLogId}`);
  },
};

export default adminAuditLogApi;