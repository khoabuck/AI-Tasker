import jobApi, { saveJobDraftApi, submitJobApi } from "../api/job.api";

import { compareDateDesc } from "../utils/dateTime.utils";
const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const toArray = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return getValue(
            item.skillName,
            item.SkillName,
            item.name,
            item.Name,
            item.title,
            item.Title,
            item.category,
            item.Category
          );
        }

        return item;
      })
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.jobs)) return data.data.jobs;
  if (Array.isArray(data?.result?.items)) return data.result.items;
  if (Array.isArray(data?.result?.jobs)) return data.result.jobs;

  return [];
};

const unwrapDetailData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.job) return data.data.job;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.job) return data.job;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const normalizeJob = (job) => {
  if (!job) return null;

  const id = getValue(
    job.id,
    job.Id,
    job.ID,
    job.jobPostingId,
    job.JobPostingId,
    job.jobPostingID,
    job.JobPostingID,
    job.jobId,
    job.JobId,
    job.JobID
  );

  return {
    id,
    jobPostingId: id,
    clientProfileId: getValue(job.clientProfileId, job.ClientProfileId, 0),
    clientUserId: getValue(job.clientUserId, job.ClientUserId, 0),
    clientName: getValue(job.clientName, job.ClientName, "Client"),
    clientAvatarUrl: getValue(job.clientAvatarUrl, job.ClientAvatarUrl, ""),

    title: getValue(
      job.title,
      job.Title,
      job.jobTitle,
      job.JobTitle,
      job.projectTitle,
      job.ProjectTitle,
      "Untitled job"
    ),

    description: getValue(
      job.description,
      job.Description,
      job.jobDescription,
      job.JobDescription,
      job.requirements,
      job.Requirements,
      "No description provided."
    ),

    aiGeneratedDescription: getValue(
      job.aiGeneratedDescription,
      job.AiGeneratedDescription,
      ""
    ),

    budgetMin: Number(getValue(job.budgetMin, job.BudgetMin, 0)),
    budgetMax: Number(getValue(job.budgetMax, job.BudgetMax, 0)),
    deadline: getValue(job.deadline, job.Deadline, ""),
    projectType: getValue(job.projectType, job.ProjectType, "General"),
    category: getValue(job.projectType, job.ProjectType, "General"),
    complexity: getValue(job.complexity, job.Complexity, ""),

    expectedDeliverables: getValue(
      job.expectedDeliverables,
      job.ExpectedDeliverables,
      ""
    ),

    status: getValue(job.status, job.Status, "OPEN"),
    isAiAssisted: Boolean(getValue(job.isAiAssisted, job.IsAiAssisted, false)),
    createdAt: getValue(job.createdAt, job.CreatedAt, ""),
    updatedAt: getValue(job.updatedAt, job.UpdatedAt, ""),

    durationDays: Number(
      getValue(
        job.durationDays,
        job.DurationDays,
        job.preferredProjectDurationDays,
        job.PreferredProjectDurationDays,
        0
      )
    ),

    skills: toArray(
      getValue(job.skills, job.Skills, job.requiredSkills, job.RequiredSkills, "")
    ),

    matchScore: Number(getValue(job.matchScore, job.MatchScore, 0)),
    skillMatchScore: Number(getValue(job.skillMatchScore, job.SkillMatchScore, 0)),
    matchedSkillCount: Number(
      getValue(job.matchedSkillCount, job.MatchedSkillCount, 0)
    ),
    requiredSkillCount: Number(
      getValue(job.requiredSkillCount, job.RequiredSkillCount, 0)
    ),
    matchedSkills: toArray(getValue(job.matchedSkills, job.MatchedSkills, [])),
    requiredSkills: toArray(
      getValue(job.requiredSkills, job.RequiredSkills, job.skills, job.Skills, [])
    ),
    matchReason: getValue(job.matchReason, job.MatchReason, ""),
    riskNote: getValue(job.riskNote, job.RiskNote, ""),

    raw: job,
  };
};

const jobService = {
  async getOpenJobs(params = {}) {
    const response = await jobApi.getOpenJobs(params);
    return unwrapListData(response)
      .map(normalizeJob)
      .filter(Boolean)
      .sort((a, b) => compareDateDesc(a.createdAt, b.createdAt));
  },

  async getRecommendedJobs(limit = 10) {
    const response = await jobApi.getRecommendedJobs(limit);
    return unwrapListData(response)
      .map(normalizeJob)
      .filter(Boolean)
      .sort((a, b) => {
        const byScore = Number(b.matchScore || 0) - Number(a.matchScore || 0);
        return byScore !== 0
          ? byScore
          : compareDateDesc(a.createdAt, b.createdAt);
      });
  },

  async getJobById(jobId) {
    if (!jobId || jobId === "undefined" || jobId === "null") {
      throw new Error("Invalid job id.");
    }

    const response = await jobApi.getJobById(jobId);


    return normalizeJob(unwrapDetailData(response));
  },

  async getMyJobs() {
    const response = await jobApi.getMyJobs();


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

  async saveJobDraft(payload) {
    const response = await saveJobDraftApi(payload);
    return unwrapDetailData(response);
  },

  async submitJob(payload) {
    const response = await submitJobApi(payload);
    return unwrapDetailData(response);
  },
};

export default jobService;