import proposalApi from "../api/proposal.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const toInteger = (value, fallback = 0) => {
  const number = Number(value);

  if (Number.isNaN(number)) return fallback;

  return Math.trunc(number);
};

const isInvalidId = (value) => {
  return !value || value === "undefined" || value === "null";
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.proposal) return data.data.proposal;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.proposal) return data.proposal;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.proposals)) return data.proposals;
  if (Array.isArray(data?.versions)) return data.versions;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.proposals)) return data.data.proposals;
  if (Array.isArray(data?.data?.versions)) return data.data.versions;

  return [];
};

const hasAnyMilestoneValue = (milestone = {}) => {
  return (
    trim(milestone.title) ||
    trim(milestone.amount) ||
    trim(milestone.durationDays) ||
    trim(milestone.deadlineOffsetDays)
  );
};

export const normalizeProposalMilestone = (milestone, index = 0) => {
  if (!milestone) return null;

  const durationDays = getValue(
    milestone.durationDays,
    milestone.DurationDays,
    milestone.deadlineOffsetDays,
    milestone.DeadlineOffsetDays,
    0
  );

  return {
    title: getValue(milestone.title, milestone.Title, `Milestone ${index + 1}`),

    amount: toNumber(getValue(milestone.amount, milestone.Amount, 0)),

    durationDays: toInteger(durationDays, 0),

    // Giữ raw + field cũ để UI cũ nếu còn đọc thì không vỡ
    description: getValue(milestone.description, milestone.Description, ""),
    expectedDeliverable: getValue(
      milestone.expectedDeliverable,
      milestone.ExpectedDeliverable,
      ""
    ),
    acceptanceCriteria: getValue(
      milestone.acceptanceCriteria,
      milestone.AcceptanceCriteria,
      ""
    ),
    orderIndex: toInteger(
      getValue(milestone.orderIndex, milestone.OrderIndex, index + 1),
      index + 1
    ),
    deadlineOffsetDays: toInteger(durationDays, 0),
    revisionLimit: toInteger(
      getValue(milestone.revisionLimit, milestone.RevisionLimit, 0),
      0
    ),

    raw: milestone,
  };
};

const normalizeMilestones = (milestones = []) => {
  if (!Array.isArray(milestones)) return [];

  return milestones
    .map((milestone, index) => normalizeProposalMilestone(milestone, index))
    .filter(Boolean);
};

export const normalizeProposal = (proposal) => {
  if (!proposal) return null;

  const proposalId = getValue(
    proposal.proposalId,
    proposal.ProposalId,
    proposal.id,
    proposal.Id
  );

  const jobId = getValue(proposal.jobId, proposal.JobId, proposal.job?.jobId);

  const status = String(getValue(proposal.status, proposal.Status, "PENDING"))
    .trim()
    .toUpperCase();

  const milestones = normalizeMilestones(
    getValue(
      proposal.milestones,
      proposal.Milestones,
      proposal.proposalMilestones,
      proposal.ProposalMilestones,
      []
    )
  );

  return {
    proposalId,
    id: proposalId,

    jobId,

    jobTitle: getValue(
      proposal.jobTitle,
      proposal.JobTitle,
      proposal.job?.title,
      proposal.Job?.Title,
      "Untitled Job"
    ),

    clientName: getValue(
      proposal.clientName,
      proposal.ClientName,
      proposal.client?.fullName,
      proposal.Client?.FullName,
      proposal.job?.clientName,
      "Client"
    ),

    expertName: getValue(
      proposal.expertName,
      proposal.ExpertName,
      proposal.expert?.fullName,
      proposal.Expert?.FullName,
      "Expert"
    ),

    coverLetter: getValue(proposal.coverLetter, proposal.CoverLetter, ""),

    proposedPrice: toNumber(
      getValue(
        proposal.proposedPrice,
        proposal.ProposedPrice,
        proposal.proposedBudget,
        proposal.ProposedBudget,
        0
      )
    ),

    proposedTimelineDays: toInteger(
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
      proposal.milestonePlan,
      proposal.MilestonePlan,
      ""
    ),

    milestones,

    status,

    rejectionReason: getValue(
      proposal.rejectionReason,
      proposal.RejectionReason,
      proposal.rejectReason,
      proposal.RejectReason,
      ""
    ),

    decisionNote: getValue(
      proposal.decisionNote,
      proposal.DecisionNote,
      proposal.note,
      proposal.Note,
      ""
    ),

    resubmitNote: getValue(
      proposal.resubmitNote,
      proposal.ResubmitNote,
      ""
    ),

    version: getValue(
      proposal.version,
      proposal.Version,
      proposal.versionNumber,
      proposal.VersionNumber,
      null
    ),

    latestVersion: getValue(
      proposal.latestVersion,
      proposal.LatestVersion,
      null
    ),

    contractId: getValue(
      proposal.contractId,
      proposal.ContractId,
      proposal.contract?.contractId,
      proposal.Contract?.ContractId,
      null
    ),

    projectId: getValue(
      proposal.projectId,
      proposal.ProjectId,
      proposal.project?.projectId,
      proposal.Project?.ProjectId,
      null
    ),

    createdAt: getValue(proposal.createdAt, proposal.CreatedAt, ""),
    updatedAt: getValue(proposal.updatedAt, proposal.UpdatedAt, ""),
    submittedAt: getValue(proposal.submittedAt, proposal.SubmittedAt, ""),
    decidedAt: getValue(proposal.decidedAt, proposal.DecidedAt, ""),

    raw: proposal,
  };
};

export const normalizeProposalVersion = (version) => {
  const normalized = normalizeProposal(version);

  if (!normalized) return null;

  return {
    ...normalized,

    proposalVersionId: getValue(
      version.proposalVersionId,
      version.ProposalVersionId,
      version.versionId,
      version.VersionId,
      version.id,
      version.Id,
      null
    ),

    versionNumber: getValue(
      version.versionNumber,
      version.VersionNumber,
      version.version,
      version.Version,
      normalized.version,
      null
    ),

    changeNote: getValue(
      version.changeNote,
      version.ChangeNote,
      version.resubmitNote,
      version.ResubmitNote,
      version.note,
      version.Note,
      ""
    ),
  };
};

const buildMilestonePayload = (milestone = {}) => {
  return {
    title: trim(milestone.title),

    amount: toNumber(milestone.amount, 0),

    durationDays: toInteger(
      getValue(milestone.durationDays, milestone.deadlineOffsetDays, 0),
      0
    ),
  };
};

const buildProposalPayload = (formData = {}, options = {}) => {
  const milestones = Array.isArray(formData.milestones)
    ? formData.milestones
        .filter(hasAnyMilestoneValue)
        .map(buildMilestonePayload)
    : [];

  const payload = {
    jobId: toInteger(formData.jobId, 0),

    coverLetter: trim(formData.coverLetter),

    proposedPrice: toNumber(formData.proposedPrice, 0),

    proposedTimelineDays: toInteger(formData.proposedTimelineDays, 0),

    expectedOutputs: trim(formData.expectedOutputs),

    workingApproach: trim(formData.workingApproach),

    preliminaryMilestonePlan: trim(formData.preliminaryMilestonePlan),

    milestones,
  };

  if (options.isResubmit) {
    return {
      coverLetter: payload.coverLetter,
      proposedPrice: payload.proposedPrice,
      proposedTimelineDays: payload.proposedTimelineDays,
      expectedOutputs: payload.expectedOutputs,
      workingApproach: payload.workingApproach,
      preliminaryMilestonePlan: payload.preliminaryMilestonePlan,
      milestones: payload.milestones,
      resubmitNote: trim(formData.resubmitNote),
    };
  }

  return payload;
};

const proposalService = {
  async submitProposal(formDataOrJobId, maybeFormData) {
    const formData =
      typeof formDataOrJobId === "object"
        ? formDataOrJobId
        : {
            ...(maybeFormData || {}),
            jobId: formDataOrJobId,
          };

    const payload = buildProposalPayload(formData);

    console.log("SUBMIT PROPOSAL PAYLOAD:", payload);

    const response = await proposalApi.submitProposal(payload);

    console.log("SUBMIT PROPOSAL RESPONSE:", response?.data);

    return normalizeProposal(unwrapData(response));
  },

  async getMyProposals(params = {}) {
    const response = await proposalApi.getMyProposals(params);

    console.log("MY PROPOSALS RESPONSE:", response?.data);

    return unwrapListData(response).map(normalizeProposal).filter(Boolean);
  },

  async getProposalById(proposalId) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const response = await proposalApi.getProposalById(proposalId);

    console.log("PROPOSAL DETAIL RESPONSE:", response?.data);

    return normalizeProposal(unwrapData(response));
  },

  async getProposalVersions(proposalId) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const response = await proposalApi.getProposalVersions(proposalId);

    console.log("PROPOSAL VERSIONS RESPONSE:", response?.data);

    return unwrapListData(response)
      .map(normalizeProposalVersion)
      .filter(Boolean);
  },

  async resubmitProposal(proposalId, formData = {}) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const payload = buildProposalPayload(formData, {
      isResubmit: true,
    });

    console.log("RESUBMIT PROPOSAL PAYLOAD:", payload);

    const response = await proposalApi.resubmitProposal(proposalId, payload);

    console.log("RESUBMIT PROPOSAL RESPONSE:", response?.data);

    return normalizeProposal(unwrapData(response));
  },

  async withdrawProposal(proposalId, reasonOrData = {}) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const payload =
      typeof reasonOrData === "string"
        ? { reason: reasonOrData }
        : reasonOrData || {};

    const response = await proposalApi.withdrawProposal(proposalId, payload);

    console.log("WITHDRAW PROPOSAL RESPONSE:", response?.data);

    return normalizeProposal(unwrapData(response));
  },

  // Legacy aliases giữ tương thích với các page cũ nếu còn gọi
  async getProposal(proposalId) {
    return this.getProposalById(proposalId);
  },

  async getMySubmittedProposals(params = {}) {
    return this.getMyProposals(params);
  },

  async cancelProposal(proposalId, reasonOrData = {}) {
    return this.withdrawProposal(proposalId, reasonOrData);
  },

  async submit(formData) {
    return this.submitProposal(formData);
  },

  async resubmit(proposalId, formData) {
    return this.resubmitProposal(proposalId, formData);
  },
};

export default proposalService;