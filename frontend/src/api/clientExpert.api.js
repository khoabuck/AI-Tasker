import axiosInstance from "./axiosInstance";

export const clientExpertApi = {
  getExpertById: (expertProfileId, config = {}) =>
    axiosInstance.get(`/experts/${expertProfileId}`, config),

  createConversation: (payload) =>
    axiosInstance.post("/conversations", payload),
};