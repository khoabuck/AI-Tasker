import axiosInstance from "./axiosInstance";

export const aiMatchingApi = {
  findExpertsFromPrompt: (payload) =>
    axiosInstance.post("/recommendations/experts/from-prompt", payload),

  createConversation: (payload) =>
    axiosInstance.post("/conversations", payload),
};