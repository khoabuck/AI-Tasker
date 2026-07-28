import projectApi from "../api/project.api";
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

const toInteger = (value, fallback = 0) => {
  const number = Number(value);
  if (Number.isNaN(number)) return fallback;
  return Math.trunc(number);
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;

  return fallback;
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
  if (data?.data !== undefined) return data.data;

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

  const paymentStatus = String(
    getValue(milestone.paymentStatus, milestone.PaymentStatus, "")
  )
    .trim()
    .toUpperCase();

  const orderIndex = toInteger(
    getValue(
      milestone.orderIndex,
      milestone.OrderIndex,
      milestone.order,
      milestone.Order,
      milestone.displayOrder,
      milestone.DisplayOrder,
      index + 1
    ),
    index + 1
  );

  const deadline = getValue(
    milestone.deadline,
    milestone.Deadline,
    milestone.dueDate,
    milestone.DueDate,
    milestone.endDate,
    milestone.EndDate,
    ""
  );

  return {
    milestoneId,
    id: milestoneId,
    projectId,

    projectTitle: getValue(
      milestone.projectTitle,
      milestone.ProjectTitle,
      milestone.project?.title,
      milestone.Project?.Title,
      ""
    ),
    title: getValue(
      milestone.title,
      milestone.Title,
      milestone.name,
      milestone.Name,
      `Milestone ${orderIndex || index + 1}`
    ),
    description: getValue(milestone.description, milestone.Description, ""),
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
      )
    ),
    deadline,
    dueDate: deadline,
    durationDays: toInteger(
      getValue(
        milestone.durationDays,
        milestone.DurationDays,
        milestone.deadlineOffsetDays,
        milestone.DeadlineOffsetDays,
        0
      )
    ),
    revisionUsed: toInteger(
      getValue(milestone.revisionUsed, milestone.RevisionUsed, 0)
    ),
    revisionLimit: toInteger(
      getValue(milestone.revisionLimit, milestone.RevisionLimit, 0)
    ),
    order: orderIndex,
    orderIndex,
    status,
    paymentStatus,
    escrowStatus: String(
      getValue(milestone.escrowStatus, milestone.EscrowStatus, paymentStatus)
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
      )
    ),
    createdAt: getValue(milestone.createdAt, milestone.CreatedAt, ""),
    updatedAt: getValue(milestone.updatedAt, milestone.UpdatedAt, ""),
    raw: milestone,
  };
};

const calculateProgress = (milestones) => {
  if (!Array.isArray(milestones) || milestones.length === 0) return 0;

  const doneStatuses = ["ACCEPTED", "COMPLETED", "PAID"];
  const doneCount = milestones.filter((milestone) =>
    doneStatuses.includes(String(milestone.status || "").toUpperCase())
  ).length;

  return Math.round((doneCount / milestones.length) * 100);
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

  const milestones = Array.isArray(project.milestones)
    ? project.milestones.map(normalizeMilestone).filter(Boolean)
    : Array.isArray(project.Milestones)
    ? project.Milestones.map(normalizeMilestone).filter(Boolean)
    : [];

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

    jobTitle: getValue(project.jobTitle, project.JobTitle, ""),
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

    clientProfileId: getValue(
      project.clientProfileId,
      project.ClientProfileId,
      null
    ),
    clientUserId: getValue(project.clientUserId, project.ClientUserId, null),
    clientName: getValue(
      project.clientName,
      project.ClientName,
      project.client?.fullName,
      project.Client?.FullName,
      project.client?.name,
      project.Client?.Name,
      "Client"
    ),
    clientAvatarUrl: getValue(
      project.clientAvatarUrl,
      project.ClientAvatarUrl,
      ""
    ),

    expertProfileId: getValue(
      project.expertProfileId,
      project.ExpertProfileId,
      null
    ),
    expertUserId: getValue(project.expertUserId, project.ExpertUserId, null),
    expertName: getValue(
      project.expertName,
      project.ExpertName,
      project.expert?.fullName,
      project.Expert?.FullName,
      project.expert?.name,
      project.Expert?.Name,
      "Expert"
    ),
    expertAvatarUrl: getValue(
      project.expertAvatarUrl,
      project.ExpertAvatarUrl,
      ""
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
      )
    ),
    milestoneTotalAmount: toNumber(
      getValue(
        project.milestoneTotalAmount,
        project.MilestoneTotalAmount,
        0
      )
    ),
    remainingMilestoneAmount: toNumber(
      getValue(
        project.remainingMilestoneAmount,
        project.RemainingMilestoneAmount,
        0
      )
    ),
    progressPercent: toNumber(
      getValue(
        project.progressPercent,
        project.ProgressPercent,
        project.progress,
        project.Progress,
        calculateProgress(milestones)
      )
    ),

    status,
    contractStatus: String(
      getValue(project.contractStatus, project.ContractStatus, "")
    )
      .trim()
      .toUpperCase(),
    startDate: getValue(project.startDate, project.StartDate, ""),
    endDate: getValue(project.endDate, project.EndDate, ""),
    escrowLockedAt: getValue(project.escrowLockedAt, project.EscrowLockedAt, ""),
    deadline: getValue(
      project.deadline,
      project.Deadline,
      project.endDate,
      project.EndDate,
      ""
    ),
    requiresPostDisputeDecision: toBoolean(
      getValue(
        project.requiresPostDisputeDecision,
        project.RequiresPostDisputeDecision,
        false
      )
    ),
    latestResolvedDisputeId: getValue(
      project.latestResolvedDisputeId,
      project.LatestResolvedDisputeId,
      null
    ),
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

const ensureId = (id, message) => {
  if (isInvalidId(id)) {
    throw new Error(message);
  }
};

const projectService = {
  async getMyProjects() {
    const response = await projectApi.getMyProjects();

    return unwrapListData(response)
      .map(normalizeProject)
      .filter(Boolean)
      .sort((a, b) =>
        compareDateDesc(
          a.updatedAt || a.createdAt || a.startDate,
          b.updatedAt || b.createdAt || b.startDate
        )
      );
  },

  async getProjectById(projectId) {
    ensureId(projectId, "Invalid project id.");

    const response = await projectApi.getProjectById(projectId);
    return normalizeProject(unwrapData(response));
  },

  async getProjectMilestones(projectId) {
    ensureId(projectId, "Invalid project id.");

    const response = await projectApi.getProjectMilestones(projectId);

    return unwrapListData(response)
      .map((item, index) => normalizeMilestone(item, index))
      .filter(Boolean)
      .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));
  },

  async completeCheck(projectId) {
    ensureId(projectId, "Invalid project id.");

    const response = await projectApi.completeCheck(projectId);
    return unwrapData(response);
  },

  async continueAfterDispute(projectId) {
    ensureId(projectId, "Invalid project id.");

    const response = await projectApi.continueAfterDispute(projectId);
    return normalizeProject(unwrapData(response));
  },

  async endAfterDispute(projectId) {
    ensureId(projectId, "Invalid project id.");

    const response = await projectApi.endAfterDispute(projectId);
    return normalizeProject(unwrapData(response));
  },
};

export default projectService;