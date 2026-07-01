import proposalApi from "../api/proposal.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
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
  if (data?.data) return data.data;

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
      ),
      0
    ),

    durationDays: toNumber(
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
      ),
      0
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

    expertProfileId: getValue(
      proposal.expertProfileId,
      proposal.ExpertProfileId,
      raw.expertProfileId,
      raw.ExpertProfileId,
      ""
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
      ),
      0
    ),

    proposedTimelineDays: toNumber(
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
      ),
      0
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

    milestones: Array.isArray(milestonesRaw)
      ? milestonesRaw.map(normalizeMilestone).filter(Boolean)
      : [],

    status: String(
      getValue(proposal.status, proposal.Status, raw.status, raw.Status, "DRAFT")
    ).toUpperCase(),

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

const buildMilestonePayload = (milestone, options = {}) => {
  const isDraft = options.draft === true;

  return {
    title: trimOrNull(milestone.title),
    amount:
      isDraft && String(milestone.amount ?? "").trim() === ""
        ? null
        : toNumber(milestone.amount, 0),
    durationDays:
      isDraft && String(milestone.durationDays ?? "").trim() === ""
        ? null
        : toNumber(milestone.durationDays, 0),
  };
};

export const buildProposalPayload = (jobId, formData, options = {}) => {
  const isDraft = options.draft === true;

  const normalizedJobId = toNumber(jobId, 0);

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
        : toNumber(formData?.proposedTimelineDays, 0),

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
  return [...items].sort((a, b) => {
    const dateA = new Date(
      a.updatedAt || a.submittedAt || a.createdAt || 0
    ).getTime();
    const dateB = new Date(
      b.updatedAt || b.submittedAt || b.createdAt || 0
    ).getTime();

    return dateB - dateA;
  });
};

const proposalService = {
  async submitProposal(jobId, formData) {
    if (isInvalidId(jobId)) {
      throw new Error("Invalid job id.");
    }

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

  async getMyDraftProposals() {
    const response = await proposalApi.getMyDraftProposals();

    return sortNewestFirst(
      unwrapListData(response).map(normalizeProposal).filter(Boolean)
    );
  },

  async createDraftProposal(jobId, formData) {
    if (isInvalidId(jobId)) {
      throw new Error("Invalid job id.");
    }

    const response = await proposalApi.createDraftProposal(
      buildProposalPayload(jobId, formData, { draft: true })
    );

    return normalizeProposal(unwrapData(response));
  },

  async updateDraftProposal(proposalId, jobId, formData) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid draft id.");
    }

    const response = await proposalApi.updateDraftProposal(
      proposalId,
      buildProposalPayload(jobId, formData, { draft: true })
    );

    return normalizeProposal(unwrapData(response));
  },

  async deleteDraftProposal(proposalId) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid draft id.");
    }

    const response = await proposalApi.deleteDraftProposal(proposalId);
    return unwrapData(response);
  },

  async submitDraftProposal(proposalId) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid draft id.");
    }

    const response = await proposalApi.submitDraftProposal(proposalId);
    return normalizeProposal(unwrapData(response));
  },

  async getDraftProposalById(proposalId) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid draft id.");
    }

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

    return unwrapListData(response).map(normalizeProposal).filter(Boolean);
  },

  async resubmitProposal(proposalId, formData) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const currentProposal = await this.getProposalById(proposalId);
    const jobId = currentProposal?.jobId || formData?.jobId || formData?.jobPostingId;

    const response = await proposalApi.resubmitProposal(
      proposalId,
      buildProposalPayload(jobId, formData, { draft: false })
    );

    return normalizeProposal(unwrapData(response));
  },

  async withdrawProposal(proposalId, reason = "") {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const response = await proposalApi.withdrawProposal(proposalId, { reason });
    return unwrapData(response);
  },
};

export default proposalService;

export function getFriendlyProposalError(err, fallback = "Proposal error.") {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  if (data?.message) return data.message;
  if (data?.title) return data.title;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || fallback;
}