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

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [];
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
  if (Array.isArray(data?.versions)) return data.versions;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.proposals)) return data.data.proposals;
  if (Array.isArray(data?.data?.versions)) return data.data.versions;
  if (Array.isArray(data?.data?.proposalVersions)) {
    return data.data.proposalVersions;
  }

  return [];
};

export const normalizeMilestone = (milestone = {}, index = 0) => {
  const milestoneId = getValue(
    milestone.milestoneId,
    milestone.MilestoneId,
    milestone.proposalMilestoneId,
    milestone.ProposalMilestoneId,
    milestone.id,
    milestone.Id,
    null
  );

  return {
    milestoneId,
    id: milestoneId,

    title: trim(getValue(milestone.title, milestone.Title, "")),

    description: trim(
      getValue(milestone.description, milestone.Description, "")
    ),

    expectedDeliverable: trim(
      getValue(
        milestone.expectedDeliverable,
        milestone.ExpectedDeliverable,
        milestone.deliverable,
        milestone.Deliverable,
        ""
      )
    ),

    acceptanceCriteria: trim(
      getValue(
        milestone.acceptanceCriteria,
        milestone.AcceptanceCriteria,
        milestone.criteria,
        milestone.Criteria,
        ""
      )
    ),

    amount: Number(getValue(milestone.amount, milestone.Amount, 0)),

    orderIndex: Number(
      getValue(milestone.orderIndex, milestone.OrderIndex, index + 1)
    ),

    deadlineOffsetDays: Number(
      getValue(
        milestone.deadlineOffsetDays,
        milestone.DeadlineOffsetDays,
        milestone.durationDays,
        milestone.DurationDays,
        0
      )
    ),

    revisionLimit: Number(
      getValue(milestone.revisionLimit, milestone.RevisionLimit, 0)
    ),

    status: String(getValue(milestone.status, milestone.Status, ""))
      .trim()
      .toUpperCase(),

    createdAt: getValue(milestone.createdAt, milestone.CreatedAt, ""),
    updatedAt: getValue(milestone.updatedAt, milestone.UpdatedAt, ""),

    raw: milestone,
  };
};

export const normalizeMilestones = (milestones = []) => {
  return toArray(milestones).map(normalizeMilestone).filter(Boolean);
};

const buildMilestonesPayload = (milestones = []) => {
  return toArray(milestones)
    .map((item, index) => ({
      title: trim(item.title),
      description: trim(item.description),
      expectedDeliverable: trim(item.expectedDeliverable),
      acceptanceCriteria: trim(item.acceptanceCriteria),
      amount: toNumber(item.amount),
      orderIndex: toNumber(item.orderIndex || index + 1),
      deadlineOffsetDays: toNumber(item.deadlineOffsetDays),
      revisionLimit: toNumber(item.revisionLimit),
    }))
    .filter((item) => {
      return (
        item.title ||
        item.description ||
        item.expectedDeliverable ||
        item.acceptanceCriteria ||
        item.amount > 0 ||
        item.deadlineOffsetDays > 0
      );
    });
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
    proposal.jobPostingId,
    proposal.JobPostingId,
    proposal.job?.jobId,
    proposal.Job?.JobId,
    proposal.job?.jobPostingId,
    proposal.Job?.JobPostingId
  );

  const status = String(getValue(proposal.status, proposal.Status, "SUBMITTED"))
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
    jobPostingId: jobId,

    version: getValue(proposal.version, proposal.Version, null),

    jobTitle: getValue(
      proposal.jobTitle,
      proposal.JobTitle,
      proposal.title,
      proposal.Title,
      proposal.job?.title,
      proposal.Job?.Title,
      "Untitled Project"
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

    expertName: getValue(proposal.expertName, proposal.ExpertName, "Expert"),

    coverLetter: getValue(
      proposal.coverLetter,
      proposal.CoverLetter,
      proposal.proposalText,
      proposal.ProposalText,
      proposal.message,
      proposal.Message,
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

    milestones,

    resubmitNote: getValue(
      proposal.resubmitNote,
      proposal.ResubmitNote,
      proposal.changeNote,
      proposal.ChangeNote,
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
      proposal.clientMessage,
      proposal.ClientMessage,
      proposal.revisionReason,
      proposal.RevisionReason,
      ""
    ),

    status,

    contractId: getValue(proposal.contractId, proposal.ContractId, null),

    submittedAt: getValue(proposal.submittedAt, proposal.SubmittedAt, ""),
    createdAt: getValue(proposal.createdAt, proposal.CreatedAt, ""),
    updatedAt: getValue(proposal.updatedAt, proposal.UpdatedAt, ""),

    raw: proposal,
  };
};

export const normalizeProposalVersion = (version) => {
  if (!version) return null;

  const milestones = normalizeMilestones(
    getValue(
      version.milestones,
      version.Milestones,
      version.proposalMilestones,
      version.ProposalMilestones,
      []
    )
  );

  return {
    proposalVersionId: getValue(
      version.proposalVersionId,
      version.ProposalVersionId,
      version.versionId,
      version.VersionId,
      version.id,
      version.Id
    ),

    proposalId: getValue(version.proposalId, version.ProposalId),

    version: getValue(version.version, version.Version, null),

    coverLetter: getValue(
      version.coverLetter,
      version.CoverLetter,
      version.proposalText,
      version.ProposalText,
      ""
    ),

    proposedPrice: Number(
      getValue(version.proposedPrice, version.ProposedPrice, 0)
    ),

    proposedTimelineDays: Number(
      getValue(version.proposedTimelineDays, version.ProposedTimelineDays, 0)
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

    milestones,

    changeNote: getValue(
      version.changeNote,
      version.ChangeNote,
      version.resubmitNote,
      version.ResubmitNote,
      ""
    ),

    createdAt: getValue(version.createdAt, version.CreatedAt, ""),
    updatedAt: getValue(version.updatedAt, version.UpdatedAt, ""),

    raw: version,
  };
};

const buildSubmitPayload = (jobId, formData) => ({
  jobId: Number(jobId),
  coverLetter: trim(formData.coverLetter),
  proposedPrice: toNumber(formData.proposedPrice),
  proposedTimelineDays: toNumber(formData.proposedTimelineDays),
  expectedOutputs: trim(formData.expectedOutputs),
  workingApproach: trim(formData.workingApproach),
  preliminaryMilestonePlan: trim(formData.preliminaryMilestonePlan),
  milestones: buildMilestonesPayload(formData.milestones),
});

const buildResubmitPayload = (formData) => ({
  coverLetter: trim(formData.coverLetter),
  proposedPrice: toNumber(
    getValue(formData.proposedPrice, formData.proposedBudget)
  ),
  proposedTimelineDays: toNumber(
    getValue(formData.proposedTimelineDays, formData.estimatedDurationDays)
  ),
  expectedOutputs: trim(formData.expectedOutputs),
  workingApproach: trim(formData.workingApproach),
  preliminaryMilestonePlan: trim(formData.preliminaryMilestonePlan),
  milestones: buildMilestonesPayload(formData.milestones),
  resubmitNote: trim(getValue(formData.resubmitNote, formData.resubmitReason)),
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

  async getJobProposals(jobId) {
    const response = await proposalApi.getJobProposals(jobId);

    console.log("GET JOB PROPOSALS RESPONSE:", response?.data);

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

  async getProposalVersions(proposalId) {
    if (!proposalId || proposalId === "undefined" || proposalId === "null") {
      throw new Error("Invalid proposal id.");
    }

    const response = await proposalApi.getProposalVersions(proposalId);

    console.log("GET PROPOSAL VERSIONS RESPONSE:", response?.data);

    return unwrapListData(response)
      .map(normalizeProposalVersion)
      .filter(Boolean);
  },

  async resubmitProposal(proposalId, formData) {
    if (!proposalId || proposalId === "undefined" || proposalId === "null") {
      throw new Error("Invalid proposal id.");
    }

    const payload = buildResubmitPayload(formData);

    console.log("RESUBMIT PROPOSAL PAYLOAD:", payload);

    const response = await proposalApi.resubmitProposal(proposalId, payload);
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