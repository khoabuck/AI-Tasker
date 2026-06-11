import axiosInstance from "./axiosInstance";

// POST /api/jobs/draft — lưu nháp
export const saveJobDraftApi = (data) => axiosInstance.post("/jobs/draft", data);

// POST /api/jobs/submit — submit chính thức
export const submitJobApi = (data) => axiosInstance.post("/jobs/submit", data);

// GET /api/jobs/open — danh sách job đang mở cho expert
export const getJobsApi = (params) => axiosInstance.get("/jobs/open", { params });

// GET /api/jobs/my — job của client đang đăng nhập
export const getMyJobsApi = () => axiosInstance.get("/jobs/my");

// GET /api/jobs/{id} — detail job
export const getJobByIdApi = (id) => axiosInstance.get(`/jobs/${id}`);

// PUT /api/jobs/{id} — update job của client
export const updateJobApi = (id, data) => axiosInstance.put(`/jobs/${id}`, data);

// PUT /api/jobs/{id}/cancel — hủy job của client
export const cancelJobApi = (id) => axiosInstance.put(`/jobs/${id}/cancel`);

const jobApi = {
  getOpenJobs(params = {}) {
    return axiosInstance.get("/jobs/open", { params });
  },

  getJobById(jobId) {
    return axiosInstance.get(`/jobs/${jobId}`);
  },

  getMyJobs() {
    return axiosInstance.get("/jobs/my");
  },

  getRecommendedJobs() {
    return axiosInstance.get("/recommendations/experts/me/jobs");
  },
};

export default jobApi;