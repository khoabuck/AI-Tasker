import axiosInstance from "./axiosInstance";

const reviewApi = {
  getMyReviews(params = {}) {
    return axiosInstance.get("/reviews/me", { params });
  },

  getExpertReviews(expertProfileId, params = {}) {
    return axiosInstance.get(`/experts/${expertProfileId}/reviews`, {
      params,
    });
  },

  getProjectReview(projectId) {
    return axiosInstance.get(`/projects/${projectId}/review`);
  },

  createProjectReview(projectId, data) {
    return axiosInstance.post(`/projects/${projectId}/reviews`, data);
  },
};

export default reviewApi;