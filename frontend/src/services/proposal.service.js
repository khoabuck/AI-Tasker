import proposalApi from "../api/proposal.api";

const proposalService = {
  async submitProposal(jobId, formData) {
    const payload = {
      jobId: Number(jobId),
      coverLetter: formData.coverLetter,
      proposedBudget: Number(formData.proposedBudget),
      estimatedDurationDays: Number(formData.estimatedDurationDays),
      workPlan: formData.workPlan,
    };

    const response = await proposalApi.submitProposal(payload);
    return response.data;
  },

  async getMyProposals() {
    const response = await proposalApi.getMyProposals();

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

  async withdrawProposal(proposalId) {
    const response = await proposalApi.withdrawProposal(proposalId);
    return response.data;
  },
};

export default proposalService;