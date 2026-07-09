import axiosInstance from "./axiosInstance";

const adminAuditLogApi = {
  getAuditLogs(params = {}) {
    const query = {};

    if (params.AdminId || params.adminId) {
      query.AdminId = params.AdminId ?? params.adminId;
    }

    if (params.Action || params.action) {
      query.Action = params.Action ?? params.action;
    }

    if (params.EntityName || params.entityName) {
      query.EntityName = params.EntityName ?? params.entityName;
    }

    if (params.EntityId || params.entityId) {
      query.EntityId = params.EntityId ?? params.entityId;
    }

    if (params.From || params.from) {
      query.From = params.From ?? params.from;
    }

    if (params.To || params.to) {
      query.To = params.To ?? params.to;
    }

    if (params.PageNumber || params.pageNumber) {
      query.PageNumber = params.PageNumber ?? params.pageNumber;
    }

    if (params.PageSize || params.pageSize) {
      query.PageSize = params.PageSize ?? params.pageSize;
    }

    return axiosInstance.get("/admin/audit-logs", { params: query });
  },

  getAuditLogById(auditLogId) {
    return axiosInstance.get(`/admin/audit-logs/${auditLogId}`);
  },
};

export default adminAuditLogApi;