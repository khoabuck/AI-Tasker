// src/api/job.api.js
import axiosInstance from "./axiosInstance";

// POST /api/jobs — tạo job mới
export const createJobApi = (data) => axiosInstance.post("/jobs", data);

// GET /api/jobs — lấy danh sách jobs (có filter)
export const getJobsApi = (params) => axiosInstance.get("/jobs", { params });

// TODO (BE): thêm khi BE làm xong
// export const getJobByIdApi = (id) => axiosInstance.get(`/jobs/${id}`);
// export const updateJobApi = (id, data) => axiosInstance.put(`/jobs/${id}`, data);
// export const deleteJobApi = (id) => axiosInstance.delete(`/jobs/${id}`);
// export const getMyJobsApi = () => axiosInstance.get("/jobs/my-jobs");