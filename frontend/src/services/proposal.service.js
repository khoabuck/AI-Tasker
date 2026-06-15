import proposalApi from "../api/proposal.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

const toNumber = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data?.proposal) return data.data.proposal;
  if (data?.data) return data.data;

  if (data?.item) return data.item;
  if (data?.result) return data.result;
  if (data?.proposal) return data.proposal;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.proposals)) return data.proposals;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.proposals)) return data.data.proposals;

  return [];
};

const normalizeProposal = (proposal) => {
  if (!proposal) return null;

  const proposalId = getValue(
    proposal.proposalId,
    proposal.ProposalId,
    proposal.id,
    proposal.Id
  );

  const jobId = getValue(
    proposal.jobId,
    proposal.JobId,
    proposal.jobPostingId,
    proposal.JobPostingId
  );

  const status = String(
    getValue(proposal.status, proposal.Status, "SUBMITTED")
  )
    .trim()
    .toUpperCase();

  return {
    proposalId,
    id: proposalId,

    jobId,
    jobPostingId: jobId,

    jobTitle: getValue(
      proposal.jobTitle,
      proposal.JobTitle,
      proposal.title,
      proposal.Title,
      proposal.job?.title,
      proposal.Job?.Title,
      "Untitled Job"
    ),

    clientProfileId: getValue(
      proposal.clientProfileId,
      proposal.ClientProfileId,
      proposal.client?.clientProfileId,
      proposal.Client?.ClientProfileId,
      0
    ),

    clientUserId: getValue(
      proposal.clientUserId,
      proposal.ClientUserId,
      proposal.client?.userId,
      proposal.Client?.UserId,
      0
    ),

    clientName: getValue(
      proposal.clientName,
      proposal.ClientName,
      proposal.client?.fullName,
      proposal.Client?.FullName,
      proposal.client?.name,
      proposal.Client?.Name,
      "Client"
    ),

    expertProfileId: getValue(
      proposal.expertProfileId,
      proposal.ExpertProfileId,
      0
    ),

    expertUserId: getValue(proposal.expertUserId, proposal.ExpertUserId, 0),

    expertName: getValue(
      proposal.expertName,
      proposal.ExpertName,
      "Expert"
    ),

    coverLetter: getValue(
      proposal.coverLetter,
      proposal.CoverLetter,
      ""
    ),

    proposedPrice: Number(
      getValue(
        proposal.proposedPrice,
        proposal.ProposedPrice,
        proposal.proposedBudget,
        proposal.ProposedBudget,
        0
      )
    ),

    proposedTimelineDays: Number(
      getValue(
        proposal.proposedTimelineDays,
        proposal.ProposedTimelineDays,
        proposal.estimatedDurationDays,
        proposal.EstimatedDurationDays,
        0
      )
    ),

    expectedOutputs: getValue(
      proposal.expectedOutputs,
      proposal.ExpectedOutputs,
      ""
    ),

    workingApproach: getValue(
      proposal.workingApproach,
      proposal.WorkingApproach,
      proposal.workPlan,
      proposal.WorkPlan,
      ""
    ),

    preliminaryMilestonePlan: getValue(
      proposal.preliminaryMilestonePlan,
      proposal.PreliminaryMilestonePlan,
      ""
    ),

    counterPrice: getValue(proposal.counterPrice, proposal.CounterPrice, null),

    counterTimelineDays: getValue(
      proposal.counterTimelineDays,
      proposal.CounterTimelineDays,
      null
    ),

    counterMessage: getValue(
      proposal.counterMessage,
      proposal.CounterMessage,
      ""
    ),

    status,

    contractId: getValue(proposal.contractId, proposal.ContractId, null),

    createdAt: getValue(proposal.createdAt, proposal.CreatedAt, ""),
    updatedAt: getValue(proposal.updatedAt, proposal.UpdatedAt, ""),

    raw: proposal,
  };
};

const buildSubmitPayload = (jobId, formData) => ({
  jobId: Number(jobId),
  coverLetter: trim(formData.coverLetter),
  proposedPrice: toNumber(formData.proposedPrice),
  proposedTimelineDays: toNumber(formData.proposedTimelineDays),
  expectedOutputs: trim(formData.expectedOutputs),
  workingApproach: trim(formData.workingApproach),
  preliminaryMilestonePlan: trim(formData.preliminaryMilestonePlan) || null,
});

const proposalService = {
  async submitProposal(jobId, formData) {
    const payload = buildSubmitPayload(jobId, formData);

    console.log("SUBMIT PROPOSAL PAYLOAD:", payload);

    const response = await proposalApi.submitProposal(payload);
    return normalizeProposal(unwrapData(response));
  },

  async getMyProposals() {
    const response = await proposalApi.getMyProposals();

    console.log("GET MY PROPOSALS RESPONSE:", response?.data);

    return unwrapListData(response).map(normalizeProposal).filter(Boolean);
  },

  async getProposalById(proposalId) {
    if (!proposalId || proposalId === "undefined" || proposalId === "null") {
      throw new Error("Invalid proposal id.");
    }

    const response = await proposalApi.getProposalById(proposalId);

    console.log("GET PROPOSAL DETAIL RESPONSE:", response?.data);

    return normalizeProposal(unwrapData(response));
  },

  async withdrawProposal(proposalId) {
    if (!proposalId || proposalId === "undefined" || proposalId === "null") {
      throw new Error("Invalid proposal id.");
    }

    const response = await proposalApi.withdrawProposal(proposalId);

    console.log("WITHDRAW PROPOSAL RESPONSE:", response?.data);

    return normalizeProposal(unwrapData(response));
  },
};

export default proposalService;