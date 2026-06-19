import projectApi from "../api/project.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
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

export const normalizeMilestone = (milestone) => {
  if (!milestone) return null;

  const milestoneId = getValue(
    milestone.milestoneId,
    milestone.MilestoneId,
    milestone.id,
    milestone.Id
  );

  const projectId = getValue(
    milestone.projectId,
    milestone.ProjectId,
    milestone.project?.projectId,
    milestone.Project?.ProjectId,
    null
  );

  const status = String(getValue(milestone.status, milestone.Status, "PENDING"))
    .trim()
    .toUpperCase();

  return {
    milestoneId,
    id: milestoneId,

    projectId,

    title: getValue(
      milestone.title,
      milestone.Title,
      milestone.name,
      milestone.Name,
      `Milestone #${milestoneId || ""}`
    ),

    description: getValue(
      milestone.description,
      milestone.Description,
      ""
    ),

    amount: Number(
      getValue(
        milestone.amount,
        milestone.Amount,
        milestone.price,
        milestone.Price,
        milestone.budget,
        milestone.Budget,
        0
      )
    ),

    dueDate: getValue(
      milestone.dueDate,
      milestone.DueDate,
      milestone.deadline,
      milestone.Deadline,
      ""
    ),

    order: Number(
      getValue(
        milestone.order,
        milestone.Order,
        milestone.orderIndex,
        milestone.OrderIndex,
        0
      )
    ),

    status,

    escrowStatus: String(
      getValue(milestone.escrowStatus, milestone.EscrowStatus, "")
    )
      .trim()
      .toUpperCase(),

    deliverableCount: Number(
      getValue(
        milestone.deliverableCount,
        milestone.DeliverableCount,
        milestone.deliverablesCount,
        milestone.DeliverablesCount,
        0
      )
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
    project.id,
    project.Id
  );

  const contractId = getValue(
    project.contractId,
    project.ContractId,
    project.contract?.contractId,
    project.Contract?.ContractId,
    null
  );

  const status = String(getValue(project.status, project.Status, "ACTIVE"))
    .trim()
    .toUpperCase();

  return {
    projectId,
    id: projectId,

    contractId,

    proposalId: getValue(
      project.proposalId,
      project.ProposalId,
      project.contract?.proposalId,
      project.Contract?.ProposalId,
      null
    ),

    jobId: getValue(
      project.jobId,
      project.JobId,
      project.jobPostingId,
      project.JobPostingId,
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
      `Project #${projectId || ""}`
    ),

    description: getValue(
      project.description,
      project.Description,
      project.scopeOfWork,
      project.ScopeOfWork,
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

    totalBudget: Number(
      getValue(
        project.totalBudget,
        project.TotalBudget,
        project.budget,
        project.Budget,
        project.totalAmount,
        project.TotalAmount,
        project.contractValue,
        project.ContractValue,
        0
      )
    ),

    progressPercent: Number(
      getValue(
        project.progressPercent,
        project.ProgressPercent,
        project.progress,
        project.Progress,
        0
      )
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

    milestoneCount: Number(
      getValue(
        project.milestoneCount,
        project.MilestoneCount,
        project.milestonesCount,
        project.MilestonesCount,
        0
      )
    ),

    createdAt: getValue(project.createdAt, project.CreatedAt, ""),
    updatedAt: getValue(project.updatedAt, project.UpdatedAt, ""),

    milestones: Array.isArray(project.milestones)
      ? project.milestones.map(normalizeMilestone).filter(Boolean)
      : Array.isArray(project.Milestones)
      ? project.Milestones.map(normalizeMilestone).filter(Boolean)
      : [],

    raw: project,
  };
};

const projectService = {
  async createProjectFromContract(contractId) {
    const response = await projectApi.createProjectFromContract(contractId);

    console.log("CREATE PROJECT FROM CONTRACT RESPONSE:", response?.data);

    return normalizeProject(unwrapData(response));
  },

  async initializeProject(contractId) {
    const response = await projectApi.initializeProject(contractId);

    console.log("INITIALIZE PROJECT RESPONSE:", response?.data);

    return normalizeProject(unwrapData(response));
  },

  async getMyProjects() {
    const response = await projectApi.getMyProjects();

    console.log("GET MY PROJECTS RESPONSE:", response?.data);

    return unwrapListData(response).map(normalizeProject).filter(Boolean);
  },

  async getProjectById(projectId) {
    if (!projectId || projectId === "undefined" || projectId === "null") {
      throw new Error("Invalid project id.");
    }

    const response = await projectApi.getProjectById(projectId);

    console.log("GET PROJECT DETAIL RESPONSE:", response?.data);

    return normalizeProject(unwrapData(response));
  },

  async getProjectMilestones(projectId) {
    if (!projectId || projectId === "undefined" || projectId === "null") {
      throw new Error("Invalid project id.");
    }

    const response = await projectApi.getProjectMilestones(projectId);

    console.log("GET PROJECT MILESTONES RESPONSE:", response?.data);

    return unwrapListData(response).map(normalizeMilestone).filter(Boolean);
  },

  async createMilestone(projectId, payload) {
    const response = await projectApi.createMilestone(projectId, payload);

    console.log("CREATE MILESTONE RESPONSE:", response?.data);

    return normalizeMilestone(unwrapData(response));
  },

  async completeCheck(projectId) {
    if (!projectId || projectId === "undefined" || projectId === "null") {
      throw new Error("Invalid project id.");
    }

    const response = await projectApi.completeCheck(projectId);

    console.log("PROJECT COMPLETE CHECK RESPONSE:", response?.data);

    return unwrapData(response);
  },
};

export default projectService;