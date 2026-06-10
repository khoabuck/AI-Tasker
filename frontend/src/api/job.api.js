// src/api/job.api.js
import axiosInstance from "./axiosInstance";

// POST /api/jobs/draft — lưu nháp
export const saveJobDraftApi = (data) => axiosInstance.post("/jobs/draft", data);

// POST /api/jobs/submit — submit chính thức
export const submitJobApi = (data) => axiosInstance.post("/jobs/submit", data);

// GET /api/jobs — lấy danh sách jobs
export const getJobsApi = (params) => axiosInstance.get("/jobs", { params });

// TODO (BE): thêm khi BE làm xong
// export const getJobByIdApi = (id) => axiosInstance.get(`/jobs/${id}`);
// export const updateJobApi = (id, data) => axiosInstance.put(`/jobs/${id}`, data);
// export const deleteJobApi = (id) => axiosInstance.delete(`/jobs/${id}`);