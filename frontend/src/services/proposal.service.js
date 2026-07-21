import proposalApi from "../api/proposal.api";
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

const isInvalidId = (value) => {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined" ||
    value === "null"
  );
};

const trimOrNull = (value) => {
  const nextValue = String(value ?? "").trim();
  return nextValue ? nextValue : null;
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.proposal) return data.data.proposal;
  if (data?.data?.draft) return data.data.draft;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data !== undefined) return data.data;

  if (data?.proposal) return data.proposal;
  if (data?.draft) return data.draft;
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
  if (Array.isArray(data?.drafts)) return data.drafts;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.proposals)) return data.data.proposals;
  if (Array.isArray(data?.data?.drafts)) return data.data.drafts;

  return [];
};

const normalizeMilestone = (milestone) => {
  if (!milestone) return null;

  const raw = milestone.raw || milestone.Raw || milestone;

  return {
    id: getValue(
      milestone.proposalMilestoneDraftId,
      milestone.ProposalMilestoneDraftId,
      milestone.id,
      milestone.Id,
      raw.proposalMilestoneDraftId,
      raw.ProposalMilestoneDraftId,
      raw.id,
      raw.Id,
      null
    ),
    proposalId: getValue(
      milestone.proposalId,
      milestone.ProposalId,
      raw.proposalId,
      raw.ProposalId,
      null
    ),
    title: getValue(
      milestone.title,
      milestone.Title,
      milestone.milestoneTitle,
      milestone.MilestoneTitle,
      raw.title,
      raw.Title,
      raw.milestoneTitle,
      raw.MilestoneTitle,
      ""
    ),
    amount: toNumber(
      getValue(
        milestone.amount,
        milestone.Amount,
        milestone.proposedAmount,
        milestone.ProposedAmount,
        raw.amount,
        raw.Amount,
        raw.proposedAmount,
        raw.ProposedAmount,
        0
      )
    ),
    durationDays: toInteger(
      getValue(
        milestone.durationDays,
        milestone.DurationDays,
        milestone.estimatedDays,
        milestone.EstimatedDays,
        raw.durationDays,
        raw.DurationDays,
        raw.estimatedDays,
        raw.EstimatedDays,
        0
      )
    ),
    createdAt: getValue(
      milestone.createdAt,
      milestone.CreatedAt,
      raw.createdAt,
      raw.CreatedAt,
      ""
    ),
    raw: milestone,
  };
};

export const normalizeProposal = (proposal) => {
  if (!proposal) return null;

  const raw = proposal.raw || proposal.Raw || proposal;

  const proposalId = getValue(
    proposal.proposalId,
    proposal.ProposalId,
    proposal.id,
    proposal.Id,
    raw.proposalId,
    raw.ProposalId,
    raw.id,
    raw.Id,
    ""
  );

  const jobId = getValue(
    proposal.jobId,
    proposal.JobId,
    proposal.jobPostingId,
    proposal.JobPostingId,
    proposal.relatedJobId,
    proposal.RelatedJobId,
    proposal.job?.jobId,
    proposal.job?.id,
    proposal.Job?.JobId,
    proposal.Job?.Id,
    raw.jobId,
    raw.JobId,
    raw.jobPostingId,
    raw.JobPostingId,
    raw.relatedJobId,
    raw.RelatedJobId,
    raw.job?.jobId,
    raw.job?.id,
    raw.Job?.JobId,
    raw.Job?.Id,
    ""
  );

  const jobTitle = getValue(
    proposal.jobTitle,
    proposal.JobTitle,
    proposal.title,
    proposal.Title,
    proposal.job?.title,
    proposal.job?.jobTitle,
    proposal.Job?.Title,
    proposal.Job?.JobTitle,
    raw.jobTitle,
    raw.JobTitle,
    raw.title,
    raw.Title,
    raw.job?.title,
    raw.job?.jobTitle,
    raw.Job?.Title,
    raw.Job?.JobTitle,
    "Untitled Job"
  );

  const milestonesRaw = getValue(
    proposal.milestones,
    proposal.Milestones,
    proposal.proposalMilestones,
    proposal.ProposalMilestones,
    raw.milestones,
    raw.Milestones,
    raw.proposalMilestones,
    raw.ProposalMilestones,
    []
  );

  return {
    proposalId,
    id: proposalId,

    jobId,
    jobPostingId: jobId,
    jobTitle,

    clientProfileId: getValue(
      proposal.clientProfileId,
      proposal.ClientProfileId,
      raw.clientProfileId,
      raw.ClientProfileId,
      null
    ),
    clientUserId: getValue(
      proposal.clientUserId,
      proposal.ClientUserId,
      raw.clientUserId,
      raw.ClientUserId,
      null
    ),
    clientName: getValue(
      proposal.clientName,
      proposal.ClientName,
      proposal.client?.fullName,
      proposal.Client?.FullName,
      raw.clientName,
      raw.ClientName,
      raw.client?.fullName,
      raw.Client?.FullName,
      "Client"
    ),
    clientAvatarUrl: getValue(
      proposal.clientAvatarUrl,
      proposal.ClientAvatarUrl,
      raw.clientAvatarUrl,
      raw.ClientAvatarUrl,
      ""
    ),

    expertProfileId: getValue(
      proposal.expertProfileId,
      proposal.ExpertProfileId,
      raw.expertProfileId,
      raw.ExpertProfileId,
      ""
    ),
    expertUserId: getValue(
      proposal.expertUserId,
      proposal.ExpertUserId,
      raw.expertUserId,
      raw.ExpertUserId,
      null
    ),
    expertName: getValue(
      proposal.expertName,
      proposal.ExpertName,
      raw.expertName,
      raw.ExpertName,
      ""
    ),
    expertAvatarUrl: getValue(
      proposal.expertAvatarUrl,
      proposal.ExpertAvatarUrl,
      raw.expertAvatarUrl,
      raw.ExpertAvatarUrl,
      ""
    ),

    coverLetter: getValue(
      proposal.coverLetter,
      proposal.CoverLetter,
      raw.coverLetter,
      raw.CoverLetter,
      ""
    ),
    proposedPrice: toNumber(
      getValue(
        proposal.proposedPrice,
        proposal.ProposedPrice,
        proposal.price,
        proposal.Price,
        raw.proposedPrice,
        raw.ProposedPrice,
        raw.price,
        raw.Price,
        0
      )
    ),
    proposedTimelineDays: toInteger(
      getValue(
        proposal.proposedTimelineDays,
        proposal.ProposedTimelineDays,
        proposal.timelineDays,
        proposal.TimelineDays,
        raw.proposedTimelineDays,
        raw.ProposedTimelineDays,
        raw.timelineDays,
        raw.TimelineDays,
        0
      )
    ),
    expectedOutputs: getValue(
      proposal.expectedOutputs,
      proposal.ExpectedOutputs,
      raw.expectedOutputs,
      raw.ExpectedOutputs,
      ""
    ),
    workingApproach: getValue(
      proposal.workingApproach,
      proposal.WorkingApproach,
      raw.workingApproach,
      raw.WorkingApproach,
      ""
    ),
    preliminaryMilestonePlan: getValue(
      proposal.preliminaryMilestonePlan,
      proposal.PreliminaryMilestonePlan,
      raw.preliminaryMilestonePlan,
      raw.PreliminaryMilestonePlan,
      ""
    ),

    resubmitNote: getValue(
      proposal.resubmitNote,
      proposal.ResubmitNote,
      raw.resubmitNote,
      raw.ResubmitNote,
      ""
    ),
    rejectionReason: getValue(
      proposal.rejectionReason,
      proposal.RejectionReason,
      proposal.decisionNote,
      proposal.DecisionNote,
      proposal.statusReason,
      proposal.StatusReason,
      raw.rejectionReason,
      raw.RejectionReason,
      raw.decisionNote,
      raw.DecisionNote,
      raw.statusReason,
      raw.StatusReason,
      ""
    ),
    decisionNote: getValue(
      proposal.decisionNote,
      proposal.DecisionNote,
      raw.decisionNote,
      raw.DecisionNote,
      ""
    ),
    statusReason: getValue(
      proposal.statusReason,
      proposal.StatusReason,
      raw.statusReason,
      raw.StatusReason,
      ""
    ),

    contractId: getValue(
      proposal.contractId,
      proposal.ContractId,
      raw.contractId,
      raw.ContractId,
      null
    ),
    clientMissSignCount: toInteger(
      getValue(
        proposal.clientMissSignCount,
        proposal.ClientMissSignCount,
        raw.clientMissSignCount,
        raw.ClientMissSignCount,
        0
      )
    ),
    expertMissSignCount: toInteger(
      getValue(
        proposal.expertMissSignCount,
        proposal.ExpertMissSignCount,
        raw.expertMissSignCount,
        raw.ExpertMissSignCount,
        0
      )
    ),

    latestVersionNumber: toInteger(
      getValue(
        proposal.latestVersionNumber,
        proposal.LatestVersionNumber,
        proposal.version,
        proposal.Version,
        raw.latestVersionNumber,
        raw.LatestVersionNumber,
        raw.version,
        raw.Version,
        0
      )
    ),
    version: getValue(
      proposal.version,
      proposal.Version,
      proposal.versionNumber,
      proposal.VersionNumber,
      proposal.latestVersionNumber,
      proposal.LatestVersionNumber,
      raw.version,
      raw.Version,
      raw.versionNumber,
      raw.VersionNumber,
      raw.latestVersionNumber,
      raw.LatestVersionNumber,
      ""
    ),
    totalVersions: toInteger(
      getValue(proposal.totalVersions, proposal.TotalVersions, 0)
    ),
    latestVersion: getValue(
      proposal.latestVersion,
      proposal.LatestVersion,
      raw.latestVersion,
      raw.LatestVersion,
      null
    ),
    lastResubmittedAt: getValue(
      proposal.lastResubmittedAt,
      proposal.LastResubmittedAt,
      raw.lastResubmittedAt,
      raw.LastResubmittedAt,
      ""
    ),
    resubmitLimit: toInteger(
      getValue(proposal.resubmitLimit, proposal.ResubmitLimit, 0)
    ),
    resubmitWindowHours: toInteger(
      getValue(proposal.resubmitWindowHours, proposal.ResubmitWindowHours, 0)
    ),
    remainingResubmitsInWindow: getValue(
      proposal.remainingResubmitsInWindow,
      proposal.RemainingResubmitsInWindow,
      raw.remainingResubmitsInWindow,
      raw.RemainingResubmitsInWindow,
      null
    ),

    milestones: Array.isArray(milestonesRaw)
      ? milestonesRaw.map(normalizeMilestone).filter(Boolean)
      : [],

    status: String(
      getValue(proposal.status, proposal.Status, raw.status, raw.Status, "DRAFT")
    )
      .trim()
      .toUpperCase(),

    createdAt: getValue(
      proposal.createdAt,
      proposal.CreatedAt,
      raw.createdAt,
      raw.CreatedAt,
      ""
    ),
    updatedAt: getValue(
      proposal.updatedAt,
      proposal.UpdatedAt,
      raw.updatedAt,
      raw.UpdatedAt,
      ""
    ),
    submittedAt: getValue(
      proposal.submittedAt,
      proposal.SubmittedAt,
      raw.submittedAt,
      raw.SubmittedAt,
      ""
    ),

    raw: proposal,
  };
};

export const normalizeWithdrawWarning = (warning) => {
  const raw = warning?.raw || warning?.Raw || warning || {};

  return {
    canWithdraw: Boolean(
      getValue(
        raw.canWithdraw,
        raw.CanWithdraw,
        raw.allowed,
        raw.Allowed,
        raw.isAllowed,
        raw.IsAllowed,
        true
      )
    ),
    title: getValue(raw.title, raw.Title, "Withdraw proposal?"),
    message: getValue(
      raw.message,
      raw.Message,
      raw.warningMessage,
      raw.WarningMessage,
      raw.detail,
      raw.Detail,
      "Withdrawing this proposal may affect your chance to work on this job."
    ),
    consequences: getValue(
      raw.consequences,
      raw.Consequences,
      raw.notes,
      raw.Notes,
      []
    ),
    requiresReason: Boolean(
      getValue(
        raw.requiresReason,
        raw.RequiresReason,
        raw.reasonRequired,
        raw.ReasonRequired,
        false
      )
    ),
    raw,
  };
};

const buildMilestonePayload = (milestone, options = {}) => {
  const isDraft = options.draft === true;

  return {
    title: isDraft
      ? trimOrNull(milestone.title)
      : String(milestone.title || "").trim(),
    amount:
      isDraft && String(milestone.amount ?? "").trim() === ""
        ? null
        : toNumber(milestone.amount, 0),
    durationDays:
      isDraft && String(milestone.durationDays ?? "").trim() === ""
        ? null
        : toInteger(milestone.durationDays, 0),
  };
};

export const buildProposalPayload = (jobId, formData, options = {}) => {
  const isDraft = options.draft === true;
  const normalizedJobId = toInteger(jobId, 0);

  const milestones = Array.isArray(formData?.milestones)
    ? formData.milestones
        .map((milestone) => buildMilestonePayload(milestone, options))
        .filter((milestone) => {
          if (!isDraft) return true;

          return (
            milestone.title ||
            milestone.amount !== null ||
            milestone.durationDays !== null
          );
        })
    : [];

  return {
    jobId: normalizedJobId,
    jobPostingId: normalizedJobId,
    coverLetter: isDraft
      ? trimOrNull(formData?.coverLetter)
      : String(formData?.coverLetter || "").trim(),
    proposedPrice:
      isDraft && String(formData?.proposedPrice ?? "").trim() === ""
        ? null
        : toNumber(formData?.proposedPrice, 0),
    proposedTimelineDays:
      isDraft && String(formData?.proposedTimelineDays ?? "").trim() === ""
        ? null
        : toInteger(formData?.proposedTimelineDays, 0),
    expectedOutputs: isDraft
      ? trimOrNull(formData?.expectedOutputs)
      : String(formData?.expectedOutputs || "").trim(),
    workingApproach: isDraft
      ? trimOrNull(formData?.workingApproach)
      : String(formData?.workingApproach || "").trim(),
    preliminaryMilestonePlan: isDraft
      ? trimOrNull(formData?.preliminaryMilestonePlan)
      : String(formData?.preliminaryMilestonePlan || "").trim(),
    milestones,
  };
};

export const mapProposalToForm = (proposal) => {
  const normalized = normalizeProposal(proposal);

  if (!normalized) {
    return {
      coverLetter: "",
      proposedPrice: "",
      proposedTimelineDays: "",
      expectedOutputs: "",
      workingApproach: "",
      preliminaryMilestonePlan: "",
      resubmitNote: "",
      milestones: [{ title: "", amount: "", durationDays: "" }],
    };
  }

  return {
    coverLetter: normalized.coverLetter || "",
    proposedPrice:
      normalized.proposedPrice || normalized.proposedPrice === 0
        ? String(normalized.proposedPrice)
        : "",
    proposedTimelineDays:
      normalized.proposedTimelineDays || normalized.proposedTimelineDays === 0
        ? String(normalized.proposedTimelineDays)
        : "",
    expectedOutputs: normalized.expectedOutputs || "",
    workingApproach: normalized.workingApproach || "",
    preliminaryMilestonePlan: normalized.preliminaryMilestonePlan || "",
    resubmitNote: normalized.resubmitNote || "",
    milestones:
      normalized.milestones.length > 0
        ? normalized.milestones.map((milestone) => ({
            title: milestone.title || "",
            amount:
              milestone.amount || milestone.amount === 0
                ? String(milestone.amount)
                : "",
            durationDays:
              milestone.durationDays || milestone.durationDays === 0
                ? String(milestone.durationDays)
                : "",
          }))
        : [{ title: "", amount: "", durationDays: "" }],
  };
};

const sortNewestFirst = (items) => {
  return [...items].sort((a, b) =>
    compareDateDesc(
      a.updatedAt || a.lastResubmittedAt || a.submittedAt || a.createdAt,
      b.updatedAt || b.lastResubmittedAt || b.submittedAt || b.createdAt
    )
  );
};

const ensureId = (id, message) => {
  if (isInvalidId(id)) {
    throw new Error(message);
  }
};

const buildReasonPayload = (reason) => {
  const normalizedReason =
    typeof reason === "object"
      ? String(reason?.reason || "").trim()
      : String(reason || "").trim();

  return { reason: normalizedReason };
};

const proposalService = {
  async submitProposal(jobId, formData) {
    ensureId(jobId, "Invalid job id.");

    const response = await proposalApi.submitProposal(
      buildProposalPayload(jobId, formData, { draft: false })
    );

    return normalizeProposal(unwrapData(response));
  },

  async getMyProposals() {
    const response = await proposalApi.getMyProposals();

    return sortNewestFirst(
      unwrapListData(response).map(normalizeProposal).filter(Boolean)
    );
  },

  async getMyProposalCredits() {
    const response = await proposalApi.getMyProposalCredits();
    return unwrapData(response);
  },

  async getMyDraftProposals() {
    const response = await proposalApi.getMyDraftProposals();

    return sortNewestFirst(
      unwrapListData(response).map(normalizeProposal).filter(Boolean)
    );
  },

  async createDraftProposal(jobId, formData) {
    ensureId(jobId, "Invalid job id.");

    const response = await proposalApi.createDraftProposal(
      buildProposalPayload(jobId, formData, { draft: true })
    );

    return normalizeProposal(unwrapData(response));
  },

  async updateDraftProposal(proposalId, jobId, formData) {
    ensureId(proposalId, "Invalid draft id.");

    const response = await proposalApi.updateDraftProposal(
      proposalId,
      buildProposalPayload(jobId, formData, { draft: true })
    );

    return normalizeProposal(unwrapData(response));
  },

  async deleteDraftProposal(proposalId) {
    ensureId(proposalId, "Invalid draft id.");

    const response = await proposalApi.deleteDraftProposal(proposalId);
    return unwrapData(response);
  },

  async submitDraftProposal(proposalId) {
    ensureId(proposalId, "Invalid draft id.");

    const response = await proposalApi.submitDraftProposal(proposalId);
    return normalizeProposal(unwrapData(response));
  },

  async getDraftProposalById(proposalId) {
    ensureId(proposalId, "Invalid draft id.");

    try {
      const response = await proposalApi.getProposalById(proposalId);
      return normalizeProposal(unwrapData(response));
    } catch {
      const drafts = await this.getMyDraftProposals();

      return (
        drafts.find(
          (draft) => String(draft.proposalId) === String(proposalId)
        ) || null
      );
    }
  },

  async getProposalById(proposalId) {
    ensureId(proposalId, "Invalid proposal id.");

    const response = await proposalApi.getProposalById(proposalId);
    return normalizeProposal(unwrapData(response));
  },

  async getProposalVersions(proposalId) {
    ensureId(proposalId, "Invalid proposal id.");

    const response = await proposalApi.getProposalVersions(proposalId);

    return unwrapListData(response).map(normalizeProposal).filter(Boolean);
  },

  async resubmitProposal(proposalId, formData) {
    ensureId(proposalId, "Invalid proposal id.");

    const currentProposal = await this.getProposalById(proposalId);
    const jobId =
      currentProposal?.jobId || formData?.jobId || formData?.jobPostingId;

    const response = await proposalApi.resubmitProposal(proposalId, {
      ...buildProposalPayload(jobId, formData, { draft: false }),
      resubmitNote: String(formData?.resubmitNote || "").trim(),
    });

    return normalizeProposal(unwrapData(response));
  },

  async decisionProposal(proposalId, decision) {
    ensureId(proposalId, "Invalid proposal id.");

    const normalizedDecision =
      typeof decision === "object" ? decision?.decision : decision;

    const response = await proposalApi.decisionProposal(
      proposalId,
      String(normalizedDecision || "").trim().toUpperCase()
    );

    return normalizeProposal(unwrapData(response));
  },

  async getWithdrawWarning(proposalId) {
    ensureId(proposalId, "Invalid proposal id.");

    const response = await proposalApi.getWithdrawWarning(proposalId);
    return normalizeWithdrawWarning(unwrapData(response));
  },

  async declineAcceptedDeal(proposalId, reason) {
    ensureId(proposalId, "Invalid proposal id.");

    const payload = buildReasonPayload(reason);

    if (!payload.reason) {
      throw new Error("Decline reason is required.");
    }

    const response = await proposalApi.declineAcceptedDeal(
      proposalId,
      payload
    );

    return normalizeProposal(unwrapData(response));
  },

  async withdrawProposal(proposalId, reason = "") {
    ensureId(proposalId, "Invalid proposal id.");

    const response = await proposalApi.withdrawProposal(proposalId, {
      reason: String(reason || "").trim(),
    });

    return unwrapData(response);
  },
};

export default proposalService;

export function getFriendlyProposalError(err, fallback = "Proposal error.") {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  const message =
    data?.message ||
    data?.title ||
    data?.detail ||
    data?.error ||
    err?.message ||
    fallback;

  if (data?.errors && typeof data.errors === "object") {
    const fieldMessages = Object.values(data.errors).flat().filter(Boolean);

    if (fieldMessages.length > 0) {
      return fieldMessages.join(" ");
    }
  }

  return message;
}