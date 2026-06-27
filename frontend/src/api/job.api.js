// src/api/job.api.js
import axiosInstance from "./axiosInstance";

// POST /api/jobs/draft — lưu nháp
export const saveJobDraftApi = (data) => axiosInstance.post("/jobs/draft", data);

// POST /api/jobs/submit — submit chính thức
export const submitJobApi = (data) => axiosInstance.post("/jobs/submit", data);

// GET /api/jobs/open — lấy danh sách job đang mở
export const getJobsApi = (params = {}) =>
  axiosInstance.get("/jobs/open", { params });

// Giữ logic của fe/minh: GET /api/jobs — lấy danh sách jobs chung
export const getAllJobsApi = (params = {}) =>
  axiosInstance.get("/jobs", { params });

// GET /api/jobs/my — lấy job của tôi
export const getMyJobsApi = () => axiosInstance.get("/jobs/my");

// GET /api/jobs/{id} — lấy chi tiết job
export const getJobByIdApi = (id) => axiosInstance.get(`/jobs/${id}`);

const jobApi = {
  getOpenJobs(params = {}) {
    return axiosInstance.get("/jobs/open", { params });
  },

  getAllJobs(params = {}) {
    return axiosInstance.get("/jobs", { params });
  },

  getJobById(jobId) {
    return axiosInstance.get(`/jobs/${jobId}`);
  },

  getMyJobs() {
    return axiosInstance.get("/jobs/my");
  },

  getRecommendedJobs(limit = 10) {
    return axiosInstance.get("/recommendations/experts/me/jobs", {
      params: { limit },
    });
  },
};

export default jobApi;

// TODO (BE): thêm khi BE làm xong
// export const updateJobApi = (id, data) => axiosInstance.put(`/jobs/${id}`, data);
// export const deleteJobApi = (id) => axiosInstance.delete(`/jobs/${id}`);