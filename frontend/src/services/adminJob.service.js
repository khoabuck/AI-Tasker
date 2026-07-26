import adminJobApi from "../api/adminJob.api";

import { compareDateDesc } from "../utils/dateTime.utils";
const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.job) return data.data.job;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data !== undefined) return data.data;

  if (data?.job) return data.job;
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
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.proposals)) return data.proposals;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.jobs)) return data.data.jobs;
  if (Array.isArray(data?.data?.proposals)) return data.data.proposals;

  return [];
};

const normalizeJob = (job) => {
  if (!job) return null;

  const jobId = getValue(
    job.jobPostingId,
    job.JobPostingId,
    job.jobId,
    job.JobId,
    job.id,
    job.Id,
    job.jobID,
    job.JobID
  );

  return {
    jobId,
    id: jobId,

    title: getValue(
      job.title,
      job.Title,
      job.jobTitle,
      job.JobTitle,
      "Untitled Job"
    ),

    description: getValue(
      job.description,
      job.Description,
      job.jobDescription,
      job.JobDescription,
      job.summary,
      job.Summary,
      ""
    ),

    status: String(getValue(job.status, job.Status, "OPEN")).toUpperCase(),

    clientId: getValue(job.clientId, job.ClientId, null),

    clientProfileId: getValue(job.clientProfileId, job.ClientProfileId, null),
    clientUserId: getValue(job.clientUserId, job.ClientUserId, null),

    clientName: getValue(
      job.clientName,
      job.ClientName,
      job.client?.fullName,
      job.Client?.FullName,
      job.client?.name,
      job.Client?.Name,
      "Client"
    ),

    clientEmail: getValue(job.clientEmail, job.ClientEmail, ""),
    clientType: getValue(job.clientType, job.ClientType, ""),

    category: getValue(
      job.category,
      job.Category,
      job.expertCategory,
      job.ExpertCategory,
      ""
    ),

    level: getValue(
      job.level,
      job.Level,
      job.experienceLevel,
      job.ExperienceLevel,
      ""
    ),

    projectType: getValue(job.projectType, job.ProjectType, ""),

    complexity: getValue(job.complexity, job.Complexity, ""),

    expectedDeliverables: getValue(
      job.expectedDeliverables,
      job.ExpectedDeliverables,
      ""
    ),

    budgetMin: toNumber(
      getValue(job.budgetMin, job.BudgetMin, job.minBudget, job.MinBudget, 0)
    ),

    budgetMax: toNumber(
      getValue(job.budgetMax, job.BudgetMax, job.maxBudget, job.MaxBudget, 0)
    ),

    budget: toNumber(getValue(job.budget, job.Budget, job.amount, job.Amount, 0)),

    deadline: getValue(job.deadline, job.Deadline, ""),
    publishedAt: getValue(job.publishedAt, job.PublishedAt, ""),

    isAiAssisted: Boolean(getValue(job.isAiAssisted, job.IsAiAssisted, false)),
    aiGeneratedDescription: getValue(
      job.aiGeneratedDescription,
      job.AiGeneratedDescription,
      ""
    ),
    postingChargeType: getValue(
      job.postingChargeType,
      job.PostingChargeType,
      ""
    ),

    proposalCount: toNumber(
      getValue(
        job.proposalCount,
        job.ProposalCount,
        job.totalProposals,
        job.TotalProposals,
        0
      )
    ),

    submittedProposalCount: toNumber(
      getValue(job.submittedProposalCount, job.SubmittedProposalCount, 0)
    ),
    acceptedProposalCount: toNumber(
      getValue(job.acceptedProposalCount, job.AcceptedProposalCount, 0)
    ),
    rejectedProposalCount: toNumber(
      getValue(job.rejectedProposalCount, job.RejectedProposalCount, 0)
    ),
    withdrawnProposalCount: toNumber(
      getValue(job.withdrawnProposalCount, job.WithdrawnProposalCount, 0)
    ),

    skills: getValue(job.skills, job.Skills, []),

    createdAt: getValue(job.createdAt, job.CreatedAt, job.postedAt, job.PostedAt, ""),
    updatedAt: getValue(job.updatedAt, job.UpdatedAt, ""),

    raw: job,
  };
};

const normalizeProposal = (proposal) => {
  if (!proposal) return null;

  const proposalId = getValue(
    proposal.proposalId,
    proposal.ProposalId,
    proposal.id,
    proposal.Id
  );

  return {
    proposalId,
    id: proposalId,

    jobId: getValue(proposal.jobId, proposal.JobId, null),
    jobTitle: getValue(proposal.jobTitle, proposal.JobTitle, ""),

    clientProfileId: getValue(
      proposal.clientProfileId,
      proposal.ClientProfileId,
      null
    ),
    clientUserId: getValue(proposal.clientUserId, proposal.ClientUserId, null),
    clientName: getValue(proposal.clientName, proposal.ClientName, "Client"),
    clientAvatarUrl: getValue(
      proposal.clientAvatarUrl,
      proposal.ClientAvatarUrl,
      ""
    ),

    expertProfileId: getValue(
      proposal.expertProfileId,
      proposal.ExpertProfileId,
      null
    ),
    expertUserId: getValue(proposal.expertUserId, proposal.ExpertUserId, null),

    expertName: getValue(
      proposal.expertName,
      proposal.ExpertName,
      proposal.expert?.fullName,
      proposal.Expert?.FullName,
      "Expert"
    ),

    coverLetter: getValue(
      proposal.coverLetter,
      proposal.CoverLetter,
      proposal.description,
      proposal.Description,
      ""
    ),

    expertAvatarUrl: getValue(
      proposal.expertAvatarUrl,
      proposal.ExpertAvatarUrl,
      ""
    ),

    proposedBudget: toNumber(
      getValue(
        proposal.proposedPrice,
        proposal.ProposedPrice,
        proposal.proposedBudget,
        proposal.ProposedBudget,
        proposal.amount,
        proposal.Amount,
        0
      )
    ),

    proposedPrice: toNumber(
      getValue(
        proposal.proposedPrice,
        proposal.ProposedPrice,
        proposal.proposedBudget,
        proposal.ProposedBudget,
        proposal.amount,
        proposal.Amount,
        0
      )
    ),

    proposedTimelineDays: toNumber(
      getValue(
        proposal.proposedTimelineDays,
        proposal.ProposedTimelineDays,
        proposal.timelineDays,
        proposal.TimelineDays,
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
      ""
    ),
    preliminaryMilestonePlan: getValue(
      proposal.preliminaryMilestonePlan,
      proposal.PreliminaryMilestonePlan,
      ""
    ),
    milestones: getValue(proposal.milestones, proposal.Milestones, []),

    status: String(getValue(proposal.status, proposal.Status, "PENDING")).toUpperCase(),
    statusReason: getValue(proposal.statusReason, proposal.StatusReason, ""),
    contractId: getValue(proposal.contractId, proposal.ContractId, null),
    clientMissSignCount: toNumber(
      getValue(proposal.clientMissSignCount, proposal.ClientMissSignCount, 0)
    ),
    expertMissSignCount: toNumber(
      getValue(proposal.expertMissSignCount, proposal.ExpertMissSignCount, 0)
    ),
    latestVersionNumber: toNumber(
      getValue(proposal.latestVersionNumber, proposal.LatestVersionNumber, 1)
    ),
    totalVersions: toNumber(
      getValue(proposal.totalVersions, proposal.TotalVersions, 1)
    ),
    lastResubmittedAt: getValue(
      proposal.lastResubmittedAt,
      proposal.LastResubmittedAt,
      null
    ),
    latestVersion: getValue(proposal.latestVersion, proposal.LatestVersion, null),

    createdAt: getValue(proposal.createdAt, proposal.CreatedAt, ""),

    raw: proposal,
  };
};

const adminJobService = {
  async getAllJobs(params = {}) {
    const response = await adminJobApi.getAllJobs(params);
    return unwrapListData(response)
      .map(normalizeJob)
      .filter(Boolean)
      .sort((a, b) =>
        compareDateDesc(
          a.updatedAt || a.createdAt,
          b.updatedAt || b.createdAt
        )
      );
  },

  async getJobById(jobId) {
    if (!jobId || jobId === "undefined" || jobId === "null") {
      throw new Error("Invalid job id.");
    }

    const response = await adminJobApi.getJobById(jobId);
    return normalizeJob(unwrapData(response));
  },

  async getJobProposals(jobId) {
    if (!jobId || jobId === "undefined" || jobId === "null") {
      throw new Error("Invalid job id.");
    }

    const response = await adminJobApi.getJobProposals(jobId);
    return unwrapListData(response)
      .map(normalizeProposal)
      .filter(Boolean)
      .sort((a, b) => compareDateDesc(a.createdAt, b.createdAt));
  },

  async cancelJob(jobId, reason = "") {
    if (!jobId || jobId === "undefined" || jobId === "null") {
      throw new Error("Invalid job id.");
    }

    const payload = {
      reason: String(reason || "").trim(),
    };

    const response = await adminJobApi.cancelJob(jobId, payload);
    return normalizeJob(unwrapData(response));
  },

  normalizeJob,
  normalizeProposal,
};

export default adminJobService;