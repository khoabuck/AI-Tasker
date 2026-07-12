import adminJobApi from "../api/adminJob.api";

import { compareDateDesc } from "../utils/dateTime.utils";
const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
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

    clientName: getValue(
      job.clientName,
      job.ClientName,
      job.client?.fullName,
      job.Client?.FullName,
      job.client?.name,
      job.Client?.Name,
      "Client"
    ),

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

    budgetMin: Number(
      getValue(job.budgetMin, job.BudgetMin, job.minBudget, job.MinBudget, 0)
    ),

    budgetMax: Number(
      getValue(job.budgetMax, job.BudgetMax, job.maxBudget, job.MaxBudget, 0)
    ),

    budget: Number(getValue(job.budget, job.Budget, job.amount, job.Amount, 0)),

    proposalCount: Number(
      getValue(
        job.proposalCount,
        job.ProposalCount,
        job.totalProposals,
        job.TotalProposals,
        0
      )
    ),

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

    expertProfileId: getValue(
      proposal.expertProfileId,
      proposal.ExpertProfileId,
      null
    ),

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

    proposedBudget: Number(
      getValue(
        proposal.proposedBudget,
        proposal.ProposedBudget,
        proposal.amount,
        proposal.Amount,
        0
      )
    ),

    status: String(getValue(proposal.status, proposal.Status, "PENDING")).toUpperCase(),
    createdAt: getValue(proposal.createdAt, proposal.CreatedAt, ""),

    raw: proposal,
  };
};

const adminJobService = {
  async getAllJobs() {
    const response = await adminJobApi.getAllJobs();
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