import axiosInstance from "./axiosInstance";

const adminProposalCreditApi = {
  getExpertCredits(params = {}) {
    return axiosInstance.get("/admin/proposal-credits/experts", { params });
  },

  getExpertCreditById(expertProfileId) {
    return axiosInstance.get(
      `/admin/proposal-credits/experts/${expertProfileId}`
    );
  },

  adjustCredits(expertProfileId, data) {
    return axiosInstance.patch(
      `/admin/proposal-credits/experts/${expertProfileId}/credits`,
      data
    );
  },
};

export default adminProposalCreditApi;
