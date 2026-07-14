import axiosInstance from "./axiosInstance";

const adminReviewReportApi = {
  getReports(params = {}) {
    return axiosInstance.get("/admin/review-reports", {
      params,
    });
  },

  getReportById(reviewReportId) {
    return axiosInstance.get(`/admin/review-reports/${reviewReportId}`);
  },

  resolveReport(reviewReportId, data) {
    return axiosInstance.post(
      `/admin/review-reports/${reviewReportId}/resolve`,
      data
    );
  },
};

export default adminReviewReportApi;