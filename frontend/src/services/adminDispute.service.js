import adminDisputeApi from "../api/adminDispute.api";

const adminDisputeService = {
  async getAllDisputes() {
    const response = await adminDisputeApi.getAllDisputes();

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response.data?.data)) {
      return response.data.data;
    }

    return [];
  },

  async resolveDispute(disputeId, formData) {
    const payload = {
      decision: formData.decision,
      adminNote: formData.adminNote,
      refundAmount: Number(formData.refundAmount || 0),
      releaseAmount: Number(formData.releaseAmount || 0),
    };

    const response = await adminDisputeApi.resolveDispute(disputeId, payload);
    return response.data;
  },
};

export default adminDisputeService;