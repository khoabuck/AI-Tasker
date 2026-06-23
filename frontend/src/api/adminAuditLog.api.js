import axiosInstance from "./axiosInstance";

const adminAuditLogApi = {
  getAuditLogs(params = {}) {
    return axiosInstance.get("/admin/audit-logs", { params });
  },

  getAuditLogById(auditLogId) {
    return axiosInstance.get(`/admin/audit-logs/${auditLogId}`);
  },
};

export default adminAuditLogApi;