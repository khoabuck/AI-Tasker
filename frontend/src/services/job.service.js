import jobApi, { saveJobDraftApi, submitJobApi } from "../api/job.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const getNestedValue = (...values) => {
  const value = getValue(...values);

  if (typeof value === "object" && value !== null) {
    return getValue(
      value.name,
      value.Name,
      value.title,
      value.Title,
      value.fullName,
      value.FullName,
      value.email,
      value.Email,
      value.skillName,
      value.SkillName,
      value.category,
      value.Category
    );
  }

  return value;
};

const toArray = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return getValue(
            item.name,
            item.Name,
            item.skillName,
            item.SkillName,
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
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.jobs)) return data.jobs;
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
    job.jobID,
    job.JobID,
    job.projectId,
    job.ProjectId,
    job.projectID,
    job.ProjectID
  );

  return {
    id,
    jobPostingId: id,
    clientProfileId: getValue(job.clientProfileId, job.ClientProfileId, 0),

    title: getValue(
      job.title,
      job.Title,
      job.jobTitle,
      job.JobTitle,
      job.projectTitle,
      job.ProjectTitle,
      job.name,
      job.Name,
      "Untitled job"
    ),

    description: getValue(
      job.description,
      job.Description,
      job.jobDescription,
      job.JobDescription,
      job.requirement,
      job.Requirement,
      job.requirements,
      job.Requirements,
      job.summary,
      job.Summary,
      "No description provided."
    ),

    aiGeneratedDescription: getValue(
      job.aiGeneratedDescription,
      job.AiGeneratedDescription,
      ""
    ),

    status: getValue(
      job.status,
      job.Status,
      job.jobStatus,
      job.JobStatus,
      "OPEN"
    ),

    category: getNestedValue(
      job.category,
      job.Category,
      job.categoryName,
      job.CategoryName,
      job.skillCategory,
      job.SkillCategory,
      job.projectCategory,
      job.ProjectCategory,
      job.projectType,
      job.ProjectType,
      "General"
    ),

    projectType: getValue(job.projectType, job.ProjectType, ""),
    complexity: getValue(job.complexity, job.Complexity, ""),
    expectedDeliverables: getValue(
      job.expectedDeliverables,
      job.ExpectedDeliverables,
      ""
    ),
    isAiAssisted: Boolean(getValue(job.isAiAssisted, job.IsAiAssisted, false)),

    skills: toArray(
      getValue(
        job.skills,
        job.Skills,
        job.requiredSkills,
        job.RequiredSkills,
        job.skillNames,
        job.SkillNames,
        job.tags,
        job.Tags,
        ""
      )
    ),

    budgetMin: getValue(
      job.budgetMin,
      job.BudgetMin,
      job.minBudget,
      job.MinBudget,
      job.expectedBudgetMin,
      job.ExpectedBudgetMin,
      job.projectBudgetMin,
      job.ProjectBudgetMin,
      job.budgetFrom,
      job.BudgetFrom,
      0
    ),

    budgetMax: getValue(
      job.budgetMax,
      job.BudgetMax,
      job.maxBudget,
      job.MaxBudget,
      job.expectedBudgetMax,
      job.ExpectedBudgetMax,
      job.projectBudgetMax,
      job.ProjectBudgetMax,
      job.budgetTo,
      job.BudgetTo,
      job.budget,
      job.Budget,
      0
    ),

    durationDays: getValue(
      job.durationDays,
      job.DurationDays,
      job.projectDurationDays,
      job.ProjectDurationDays,
      job.preferredProjectDurationDays,
      job.PreferredProjectDurationDays,
      job.estimatedDurationDays,
      job.EstimatedDurationDays,
      job.duration,
      job.Duration,
      0
    ),

    deadline: getValue(
      job.deadline,
      job.Deadline,
      job.dueDate,
      job.DueDate,
      job.expiredAt,
      job.ExpiredAt,
      job.applicationDeadline,
      job.ApplicationDeadline,
      ""
    ),

    createdAt: getValue(
      job.createdAt,
      job.CreatedAt,
      job.postedAt,
      job.PostedAt,
      job.createdDate,
      job.CreatedDate,
      ""
    ),

    updatedAt: getValue(job.updatedAt, job.UpdatedAt, ""),

    clientName: getNestedValue(
      job.client,
      job.Client,
      job.clientName,
      job.ClientName,
      job.clientFullName,
      job.ClientFullName,
      job.ownerName,
      job.OwnerName,
      job.createdByName,
      job.CreatedByName,
      job.customerName,
      job.CustomerName,
      "Client"
    ),

    raw: job,
  };
};

const jobService = {
  async getOpenJobs(params = {}) {
    const response = await jobApi.getOpenJobs(params);

    console.log("GET OPEN JOBS RESPONSE:", response?.data);

    const list = unwrapListData(response);

    return list.map(normalizeJob).filter(Boolean);
  },

  async getRecommendedJobs() {
    const response = await jobApi.getRecommendedJobs();

    console.log("GET RECOMMENDED JOBS RESPONSE:", response?.data);

    const list = unwrapListData(response);

    return list.map(normalizeJob).filter(Boolean);
  },

  async getJobById(jobId) {
    if (!jobId || jobId === "undefined" || jobId === "null") {
      throw new Error("Invalid job id.");
    }

    const response = await jobApi.getJobById(jobId);

    console.log("GET JOB DETAIL RESPONSE:", response?.data);

    const data = unwrapDetailData(response);

    return normalizeJob(data);
  },

  async getMyJobs() {
    const response = await jobApi.getMyJobs();

    console.log("GET MY JOBS RESPONSE:", response?.data);

    const list = unwrapListData(response);

    return list.map(normalizeJob).filter(Boolean);
  },

  async saveJobDraft(payload) {
    const response = await saveJobDraftApi(payload);

    console.log("SAVE JOB DRAFT RESPONSE:", response?.data);

    return unwrapDetailData(response);
  },

  async submitJob(payload) {
    const response = await submitJobApi(payload);

    console.log("SUBMIT JOB RESPONSE:", response?.data);

    return unwrapDetailData(response);
  },
};

export default jobService;