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
    proposalMilestoneId: getValue(
      milestone.proposalMilestoneId,
      milestone.ProposalMilestoneId,
      milestone.proposalMilestoneDraftId,
      milestone.ProposalMilestoneDraftId,
      milestone.id,
      milestone.Id,
      index
    ),

    id: getValue(
      milestone.proposalMilestoneId,
      milestone.ProposalMilestoneId,
      milestone.proposalMilestoneDraftId,
      milestone.ProposalMilestoneDraftId,
      milestone.id,
      milestone.Id,
      index
    ),

    title: getValue(milestone.title, milestone.Title, `Milestone ${index + 1}`),

    amount: toNumber(getValue(milestone.amount, milestone.Amount, 0)),

    durationDays: toInteger(durationDays, 0),

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

const parseMilestonePlanJson = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) return normalizeMilestones(value);

  if (typeof value === "object") {
    return normalizeMilestones(extractMilestoneArray(value));
  }

  try {
    const parsed = JSON.parse(String(value));

    if (typeof parsed === "string") {
      return parseMilestonePlanJson(parsed);
    }

    return normalizeMilestones(extractMilestoneArray(parsed));
  } catch {
    return [];
  }
};

const extractMilestoneArray = (value) => {
  if (Array.isArray(value)) return value;

  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value.milestones)) return value.milestones;
  if (Array.isArray(value.Milestones)) return value.Milestones;

  if (Array.isArray(value.milestoneDrafts)) return value.milestoneDrafts;
  if (Array.isArray(value.MilestoneDrafts)) return value.MilestoneDrafts;

  if (Array.isArray(value.proposalMilestones)) return value.proposalMilestones;
  if (Array.isArray(value.ProposalMilestones)) return value.ProposalMilestones;

  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.Items)) return value.Items;

  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.Data)) return value.Data;

  return [];
};

export const normalizeProposal = (proposal) => {
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
    proposal.job?.jobId,
    proposal.Job?.JobId,
    proposal.projectId,
    proposal.ProjectId
  );

  const status = String(getValue(proposal.status, proposal.Status, "PENDING"))
    .trim()
    .toUpperCase();

  const milestonePlanJson = getValue(
    proposal.milestonePlanJson,
    proposal.MilestonePlanJson,
    proposal.milestonesJson,
    proposal.MilestonesJson,
    proposal.milestoneDraftsJson,
    proposal.MilestoneDraftsJson,
    ""
  );

  const directMilestones = getValue(
    proposal.milestones,
    proposal.Milestones,
    proposal.proposalMilestones,
    proposal.ProposalMilestones,
    proposal.milestoneDrafts,
    proposal.MilestoneDrafts,
    []
  );

  const milestones =
    Array.isArray(directMilestones) && directMilestones.length > 0
      ? normalizeMilestones(directMilestones)
      : parseMilestonePlanJson(milestonePlanJson);

  return {
    proposalId,
    id: proposalId,

    jobId,

    jobTitle: getValue(
      proposal.jobTitle,
      proposal.JobTitle,
      proposal.job?.title,
      proposal.Job?.Title,
      proposal.projectTitle,
      proposal.ProjectTitle,
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
        proposal.bidAmount,
        proposal.BidAmount,
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

    milestonePlanJson,

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

    counterMessage: getValue(
      proposal.counterMessage,
      proposal.CounterMessage,
      proposal.clientMessage,
      proposal.ClientMessage,
      ""
    ),

    resubmitNote: getValue(proposal.resubmitNote, proposal.ResubmitNote, ""),

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

    latestVersionNumber: getValue(
      proposal.latestVersionNumber,
      proposal.LatestVersionNumber,
      null
    ),

    totalVersions: getValue(proposal.totalVersions, proposal.TotalVersions, 0),

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

    lastResubmittedAt: getValue(
      proposal.lastResubmittedAt,
      proposal.LastResubmittedAt,
      ""
    ),

    remainingResubmitsInWindow: getValue(
      proposal.remainingResubmitsInWindow,
      proposal.RemainingResubmitsInWindow,
      null
    ),

    resubmitLimit: getValue(proposal.resubmitLimit, proposal.ResubmitLimit, null),

    resubmitWindowHours: getValue(
      proposal.resubmitWindowHours,
      proposal.ResubmitWindowHours,
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
  if (!version) return null;

  const milestonePlanJson = getValue(
    version.milestonePlanJson,
    version.MilestonePlanJson,
    version.milestonesJson,
    version.MilestonesJson,
    version.milestoneDraftsJson,
    version.MilestoneDraftsJson,
    ""
  );

  const directMilestones = getValue(
    version.milestones,
    version.Milestones,
    version.proposalMilestones,
    version.ProposalMilestones,
    version.milestoneDrafts,
    version.MilestoneDrafts,
    []
  );

  const milestones =
    Array.isArray(directMilestones) && directMilestones.length > 0
      ? normalizeMilestones(directMilestones)
      : parseMilestonePlanJson(milestonePlanJson);

  const versionNumber = getValue(
    version.versionNumber,
    version.VersionNumber,
    version.version,
    version.Version,
    null
  );

  return {
    proposalVersionId: getValue(
      version.proposalVersionId,
      version.ProposalVersionId,
      version.versionId,
      version.VersionId,
      version.id,
      version.Id,
      null
    ),

    proposalId: getValue(version.proposalId, version.ProposalId, null),

    versionNumber,

    version: versionNumber,

    coverLetter: getValue(version.coverLetter, version.CoverLetter, ""),

    proposedPrice: toNumber(
      getValue(
        version.proposedPrice,
        version.ProposedPrice,
        version.proposedBudget,
        version.ProposedBudget,
        version.bidAmount,
        version.BidAmount,
        0
      )
    ),

    proposedTimelineDays: toInteger(
      getValue(
        version.proposedTimelineDays,
        version.ProposedTimelineDays,
        version.estimatedDurationDays,
        version.EstimatedDurationDays,
        0
      )
    ),

    expectedOutputs: getValue(
      version.expectedOutputs,
      version.ExpectedOutputs,
      ""
    ),

    workingApproach: getValue(
      version.workingApproach,
      version.WorkingApproach,
      ""
    ),

    preliminaryMilestonePlan: getValue(
      version.preliminaryMilestonePlan,
      version.PreliminaryMilestonePlan,
      ""
    ),

    milestonePlanJson,

    milestones,

    resubmitNote: getValue(
      version.resubmitNote,
      version.ResubmitNote,
      version.changeNote,
      version.ChangeNote,
      version.note,
      version.Note,
      ""
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

    createdByUserId: getValue(
      version.createdByUserId,
      version.CreatedByUserId,
      null
    ),

    createdByName: getValue(
      version.createdByName,
      version.CreatedByName,
      version.expertName,
      version.ExpertName,
      "Expert"
    ),

    createdAt: getValue(version.createdAt, version.CreatedAt, ""),

    raw: version,
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

export const buildProposalPayload = (formData = {}, options = {}) => {
  const milestones = Array.isArray(formData.milestones)
    ? formData.milestones
        .filter(hasAnyMilestoneValue)
        .map((milestone) => buildMilestonePayload(milestone))
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

export const getFriendlyProposalError = (
  error,
  fallback = "Something went wrong."
) => {
  const payload =
    error?.originalError?.response?.data ||
    error?.response?.data ||
    error?.data ||
    error;

  const message =
    typeof payload === "string"
      ? payload
      : payload?.message ||
        payload?.title ||
        payload?.detail ||
        payload?.error ||
        error?.message ||
        "";

  if (message.includes("already submitted")) {
    return "You have already submitted a proposal for this job.";
  }

  if (message.includes("not found")) {
    return "This proposal or job could not be found.";
  }

  if (message.includes("Total milestone amount")) {
    return "Total milestone amount must match the proposed price.";
  }

  if (message.includes("Total milestone duration")) {
    return "Total milestone duration cannot exceed the proposed timeline.";
  }

  if (message.includes("Milestone") || message.includes("milestone")) {
    return "Please check your milestone title, amount, and duration.";
  }

  if (message.includes("RevisionLimit")) {
    return "Backend database still requires an old milestone field. Please ask BE to set a default RevisionLimit.";
  }

  if (message.includes("not open")) {
    return "This job is not open for proposal submission.";
  }

  if (message.includes("withdraw") || message.includes("cancel")) {
    return "This proposal cannot be cancelled right now.";
  }

  return message || fallback;
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

    const response = await proposalApi.submitProposal(payload);

    return normalizeProposal(unwrapData(response));
  },

  async getMyProposals(params = {}) {
    const response = await proposalApi.getMyProposals(params);

    return unwrapListData(response).map(normalizeProposal).filter(Boolean);
  },

  async getProposalById(proposalId) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const response = await proposalApi.getProposalById(proposalId);

    return normalizeProposal(unwrapData(response));
  },

  async getProposalVersions(proposalId) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const response = await proposalApi.getProposalVersions(proposalId);

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

    const response = await proposalApi.resubmitProposal(proposalId, payload);

    return normalizeProposal(unwrapData(response));
  },

  async withdrawProposal(proposalId) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const response = await proposalApi.withdrawProposal(proposalId);

    return normalizeProposal(unwrapData(response));
  },

  async decideProposal(proposalId, payload = {}) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const response = await proposalApi.decideProposal(proposalId, payload);

    return normalizeProposal(unwrapData(response));
  },

  async getJobProposals(jobId) {
    if (isInvalidId(jobId)) {
      throw new Error("Invalid job id.");
    }

    const response = await proposalApi.getJobProposals(jobId);

    return unwrapListData(response).map(normalizeProposal).filter(Boolean);
  },

  async getProposal(proposalId) {
    return this.getProposalById(proposalId);
  },

  async getMySubmittedProposals(params = {}) {
    return this.getMyProposals(params);
  },

  async cancelProposal(proposalId) {
    return this.withdrawProposal(proposalId);
  },

  async submit(formData) {
    return this.submitProposal(formData);
  },

  async resubmit(proposalId, formData) {
    return this.resubmitProposal(proposalId, formData);
  },
};

export default proposalService;