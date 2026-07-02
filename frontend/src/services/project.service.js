import projectApi from "../api/project.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

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
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined" ||
    value === "null"
  );
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.project) return data.data.project;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.project) return data.project;
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
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.milestones)) return data.milestones;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.projects)) return data.data.projects;
  if (Array.isArray(data?.data?.milestones)) return data.data.milestones;

  return [];
};

export const normalizeMilestone = (milestone, index = 0) => {
  if (!milestone) return null;

  const milestoneId = getValue(
    milestone.milestoneId,
    milestone.MilestoneId,
    milestone.milestoneID,
    milestone.MilestoneID,
    milestone.projectMilestoneId,
    milestone.ProjectMilestoneId,
    milestone.projectMilestoneID,
    milestone.ProjectMilestoneID,
    milestone.id,
    milestone.Id
  );

  const projectId = getValue(
    milestone.projectId,
    milestone.ProjectId,
    milestone.projectID,
    milestone.ProjectID,
    milestone.project?.projectId,
    milestone.Project?.ProjectId,
    null
  );

  const status = String(
    getValue(
      milestone.status,
      milestone.Status,
      milestone.milestoneStatus,
      milestone.MilestoneStatus,
      "PENDING"
    )
  )
    .trim()
    .toUpperCase();

  const order = toInteger(
    getValue(
      milestone.order,
      milestone.Order,
      milestone.orderIndex,
      milestone.OrderIndex,
      milestone.displayOrder,
      milestone.DisplayOrder,
      index + 1
    ),
    index + 1
  );

  return {
    milestoneId,
    id: milestoneId,
    projectId,

    title: getValue(
      milestone.title,
      milestone.Title,
      milestone.name,
      milestone.Name,
      `Milestone ${order || index + 1}`
    ),

    description: getValue(
      milestone.description,
      milestone.Description,
      milestone.expectedDeliverable,
      milestone.ExpectedDeliverable,
      ""
    ),

    acceptanceCriteria: getValue(
      milestone.acceptanceCriteria,
      milestone.AcceptanceCriteria,
      ""
    ),

    amount: toNumber(
      getValue(
        milestone.amount,
        milestone.Amount,
        milestone.price,
        milestone.Price,
        milestone.budget,
        milestone.Budget,
        0
      ),
      0
    ),

    dueDate: getValue(
      milestone.dueDate,
      milestone.DueDate,
      milestone.deadline,
      milestone.Deadline,
      milestone.endDate,
      milestone.EndDate,
      ""
    ),

    durationDays: toInteger(
      getValue(
        milestone.durationDays,
        milestone.DurationDays,
        milestone.deadlineOffsetDays,
        milestone.DeadlineOffsetDays,
        0
      ),
      0
    ),

    order,
    orderIndex: order,
    status,

    escrowStatus: String(
      getValue(milestone.escrowStatus, milestone.EscrowStatus, "")
    )
      .trim()
      .toUpperCase(),

    deliverableCount: toInteger(
      getValue(
        milestone.deliverableCount,
        milestone.DeliverableCount,
        milestone.deliverablesCount,
        milestone.DeliverablesCount,
        0
      ),
      0
    ),

    createdAt: getValue(milestone.createdAt, milestone.CreatedAt, ""),
    updatedAt: getValue(milestone.updatedAt, milestone.UpdatedAt, ""),

    raw: milestone,
  };
};

export const normalizeProject = (project) => {
  if (!project) return null;

  const projectId = getValue(
    project.projectId,
    project.ProjectId,
    project.projectID,
    project.ProjectID,
    project.id,
    project.Id
  );

  const contractId = getValue(
    project.contractId,
    project.ContractId,
    project.contractID,
    project.ContractID,
    project.projectContractId,
    project.ProjectContractId,
    project.contract?.contractId,
    project.Contract?.ContractId,
    null
  );

  const status = String(
    getValue(
      project.status,
      project.Status,
      project.projectStatus,
      project.ProjectStatus,
      "ACTIVE"
    )
  )
    .trim()
    .toUpperCase();

  const milestones = Array.isArray(project.milestones)
    ? project.milestones.map(normalizeMilestone).filter(Boolean)
    : Array.isArray(project.Milestones)
    ? project.Milestones.map(normalizeMilestone).filter(Boolean)
    : [];

  return {
    projectId,
    id: projectId,
    contractId,

    proposalId: getValue(
      project.proposalId,
      project.ProposalId,
      project.proposalID,
      project.ProposalID,
      project.contract?.proposalId,
      project.Contract?.ProposalId,
      null
    ),

    jobId: getValue(
      project.jobId,
      project.JobId,
      project.jobID,
      project.JobID,
      project.jobPostingId,
      project.JobPostingId,
      project.job?.jobId,
      project.Job?.JobId,
      null
    ),

    title: getValue(
      project.title,
      project.Title,
      project.projectTitle,
      project.ProjectTitle,
      project.name,
      project.Name,
      project.jobTitle,
      project.JobTitle,
      project.job?.title,
      project.Job?.Title,
      `Project #${projectId || ""}`
    ),

    description: getValue(
      project.description,
      project.Description,
      project.scopeOfWork,
      project.ScopeOfWork,
      project.terms,
      project.Terms,
      ""
    ),

    clientName: getValue(
      project.clientName,
      project.ClientName,
      project.client?.fullName,
      project.Client?.FullName,
      project.client?.name,
      project.Client?.Name,
      "Client"
    ),

    expertName: getValue(
      project.expertName,
      project.ExpertName,
      project.expert?.fullName,
      project.Expert?.FullName,
      project.expert?.name,
      project.Expert?.Name,
      "Expert"
    ),

    totalBudget: toNumber(
      getValue(
        project.totalBudget,
        project.TotalBudget,
        project.budget,
        project.Budget,
        project.totalAmount,
        project.TotalAmount,
        project.contractValue,
        project.ContractValue,
        project.amount,
        project.Amount,
        0
      ),
      0
    ),

    progressPercent: toNumber(
      getValue(
        project.progressPercent,
        project.ProgressPercent,
        project.progress,
        project.Progress,
        0
      ),
      0
    ),

    startDate: getValue(project.startDate, project.StartDate, ""),
    endDate: getValue(project.endDate, project.EndDate, ""),
    deadline: getValue(
      project.deadline,
      project.Deadline,
      project.endDate,
      project.EndDate,
      ""
    ),

    status,

    milestoneCount: toInteger(
      getValue(
        project.milestoneCount,
        project.MilestoneCount,
        project.milestonesCount,
        project.MilestonesCount,
        milestones.length
      ),
      milestones.length
    ),

    createdAt: getValue(project.createdAt, project.CreatedAt, ""),
    updatedAt: getValue(project.updatedAt, project.UpdatedAt, ""),

    milestones,
    raw: project,
  };
};

const projectService = {
  async getMyProjects() {
    const response = await projectApi.getMyProjects();

    return unwrapListData(response).map(normalizeProject).filter(Boolean);
  },

  async getProjectById(projectId) {
    if (isInvalidId(projectId)) {
      throw new Error("Invalid project id.");
    }

    const response = await projectApi.getProjectById(projectId);

    return normalizeProject(unwrapData(response));
  },

  async getProjectMilestones(projectId) {
    if (isInvalidId(projectId)) {
      throw new Error("Invalid project id.");
    }

    const response = await projectApi.getProjectMilestones(projectId);

    return unwrapListData(response)
      .map((item, index) => normalizeMilestone(item, index))
      .filter(Boolean)
      .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));
  },

  async createMilestone(projectId, payload) {
    if (isInvalidId(projectId)) {
      throw new Error("Invalid project id.");
    }

    const response = await projectApi.createMilestone(projectId, payload);

    return normalizeMilestone(unwrapData(response));
  },

  async completeCheck(projectId) {
    if (isInvalidId(projectId)) {
      throw new Error("Invalid project id.");
    }

    const response = await projectApi.completeCheck(projectId);

    return unwrapData(response);
  },
};

export default projectService;