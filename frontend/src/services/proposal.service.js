import proposalApi from "../api/proposal.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.proposal) return data.data.proposal;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.proposal) return data.proposal;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.Result)) return data.Result;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.Results)) return data.Results;

  if (Array.isArray(data?.proposals)) return data.proposals;
  if (Array.isArray(data?.Proposals)) return data.Proposals;
  if (Array.isArray(data?.versions)) return data.versions;
  if (Array.isArray(data?.Versions)) return data.Versions;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.Items)) return data.data.Items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.Result)) return data.data.Result;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  if (Array.isArray(data?.data?.Results)) return data.data.Results;

  if (Array.isArray(data?.data?.proposals)) return data.data.proposals;
  if (Array.isArray(data?.data?.Proposals)) return data.data.Proposals;
  if (Array.isArray(data?.data?.versions)) return data.data.versions;
  if (Array.isArray(data?.data?.Versions)) return data.data.Versions;

  return [];
};

const cleanPayload = (payload = {}) => {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    })
  );
};

const normalizeStatus = (status) => {
  return String(status || "SUBMITTED").trim().toUpperCase();
};

const normalizeProposal = (item) => {
  if (!item) return null;

  const proposalId = getValue(
    item.proposalId,
    item.ProposalId,
    item.id,
    item.Id
  );

  const jobId = getValue(
    item.jobId,
    item.JobId,
    item.jobPostingId,
    item.JobPostingId
  );

  const expertProfileId = getValue(
    item.expertProfileId,
    item.ExpertProfileId,
    item.expertId,
    item.ExpertId
  );

  const proposedBudget = Number(
    getValue(
      item.proposedBudget,
      item.ProposedBudget,
      item.budget,
      item.Budget,
      item.price,
      item.Price,
      0
    )
  );

  const estimatedDurationDays = Number(
    getValue(
      item.estimatedDurationDays,
      item.EstimatedDurationDays,
      item.durationDays,
      item.DurationDays,
      item.timelineDays,
      item.TimelineDays,
      0
    )
  );

  return {
    ...item,

    proposalId,
    id: proposalId,

    jobId,
    jobPostingId: jobId,

    expertProfileId,

    expertName: getValue(
      item.expertName,
      item.ExpertName,
      item.expertFullName,
      item.ExpertFullName,
      ""
    ),

    expertAvatarUrl: getValue(
      item.expertAvatarUrl,
      item.ExpertAvatarUrl,
      item.avatarUrl,
      item.AvatarUrl,
      ""
    ),

    jobTitle: getValue(
      item.jobTitle,
      item.JobTitle,
      item.projectTitle,
      item.ProjectTitle,
      item.title,
      item.Title,
      "Project"
    ),

    clientName: getValue(
      item.clientName,
      item.ClientName,
      item.customerName,
      item.CustomerName,
      "Client"
    ),

    coverLetter: getValue(
      item.coverLetter,
      item.CoverLetter,
      item.proposalText,
      item.ProposalText,
      item.message,
      item.Message,
      item.description,
      item.Description,
      ""
    ),

    proposalText: getValue(
      item.proposalText,
      item.ProposalText,
      item.coverLetter,
      item.CoverLetter,
      item.message,
      item.Message,
      ""
    ),

    proposedBudget: Number.isNaN(proposedBudget) ? 0 : proposedBudget,
    budget: Number.isNaN(proposedBudget) ? 0 : proposedBudget,

    estimatedDurationDays: Number.isNaN(estimatedDurationDays)
      ? 0
      : estimatedDurationDays,
    durationDays: Number.isNaN(estimatedDurationDays)
      ? 0
      : estimatedDurationDays,

    status: normalizeStatus(getValue(item.status, item.Status)),

    version: Number(getValue(item.version, item.Version, 1)),

    createdAt: getValue(item.createdAt, item.CreatedAt, ""),
    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),
    submittedAt: getValue(item.submittedAt, item.SubmittedAt, item.createdAt, ""),

    raw: item,
  };
};

const normalizeProposalVersion = (item) => {
  if (!item) return null;

  const normalized = normalizeProposal(item);

  return {
    ...normalized,

    proposalVersionId: getValue(
      item.proposalVersionId,
      item.ProposalVersionId,
      item.versionId,
      item.VersionId,
      item.id,
      item.Id
    ),

    version: Number(getValue(item.version, item.Version, 1)),

    changeNote: getValue(
      item.changeNote,
      item.ChangeNote,
      item.note,
      item.Note,
      item.resubmitReason,
      item.ResubmitReason,
      ""
    ),
  };
};

const buildSubmitProposalPayload = (firstArg, secondArg) => {
  const payload = secondArg
    ? {
        ...secondArg,
        jobId: firstArg,
        jobPostingId: firstArg,
      }
    : {
        ...firstArg,
      };

  const jobId = getValue(payload.jobId, payload.jobPostingId);

  return cleanPayload({
    ...payload,

    jobId,
    jobPostingId: jobId,

    coverLetter: trim(
      getValue(payload.coverLetter, payload.proposalText, payload.message, "")
    ),

    proposalText: trim(
      getValue(payload.proposalText, payload.coverLetter, payload.message, "")
    ),

    proposedBudget: Number(
      getValue(payload.proposedBudget, payload.budget, payload.price, 0)
    ),

    estimatedDurationDays: Number(
      getValue(
        payload.estimatedDurationDays,
        payload.durationDays,
        payload.timelineDays,
        0
      )
    ),
  });
};

const buildResubmitProposalPayload = (payload = {}) => {
  return cleanPayload({
    ...payload,

    coverLetter: trim(
      getValue(payload.coverLetter, payload.proposalText, payload.message, "")
    ),

    proposalText: trim(
      getValue(payload.proposalText, payload.coverLetter, payload.message, "")
    ),

    proposedBudget: Number(
      getValue(payload.proposedBudget, payload.budget, payload.price, 0)
    ),

    estimatedDurationDays: Number(
      getValue(
        payload.estimatedDurationDays,
        payload.durationDays,
        payload.timelineDays,
        0
      )
    ),

    resubmitReason: trim(
      getValue(payload.resubmitReason, payload.reason, payload.changeNote, "")
    ),
  });
};

const buildDecisionPayload = (payload = {}) => {
  const decision = String(
    getValue(payload.decision, payload.status, payload.action, "")
  )
    .trim()
    .toUpperCase();

  return cleanPayload({
    ...payload,
    decision,
    reason: trim(getValue(payload.reason, payload.note, payload.message, "")),
  });
};

const proposalService = {
  async submitProposal(firstArg, secondArg) {
    const payload = buildSubmitProposalPayload(firstArg, secondArg);
    const response = await proposalApi.submitProposal(payload);

    return normalizeProposal(unwrapData(response));
  },

  async getMyProposals(params = {}) {
    const response = await proposalApi.getMyProposals(params);

    return unwrapListData(response).map(normalizeProposal).filter(Boolean);
  },

  async getJobProposals(jobId, params = {}) {
    if (!jobId) {
      throw new Error("jobId is required.");
    }

    const response = await proposalApi.getJobProposals(jobId, params);

    return unwrapListData(response).map(normalizeProposal).filter(Boolean);
  },

  async getProposalsByJob(jobId, params = {}) {
    return this.getJobProposals(jobId, params);
  },

  async getProposal(proposalId) {
    if (!proposalId) {
      throw new Error("proposalId is required.");
    }

    const response = await proposalApi.getProposal(proposalId);

    return normalizeProposal(unwrapData(response));
  },

  async getProposalById(proposalId) {
    return this.getProposal(proposalId);
  },

  async getProposalDetail(proposalId) {
    return this.getProposal(proposalId);
  },

  async getProposalVersions(proposalId) {
    if (!proposalId) {
      throw new Error("proposalId is required.");
    }

    const response = await proposalApi.getProposalVersions(proposalId);

    return unwrapListData(response)
      .map(normalizeProposalVersion)
      .filter(Boolean);
  },

  async resubmitProposal(proposalId, payload) {
    if (!proposalId) {
      throw new Error("proposalId is required.");
    }

    const request = buildResubmitProposalPayload(payload);
    const response = await proposalApi.resubmitProposal(proposalId, request);

    return normalizeProposal(unwrapData(response));
  },

  async decideProposal(proposalId, payload) {
    if (!proposalId) {
      throw new Error("proposalId is required.");
    }

    const request = buildDecisionPayload(payload);
    const response = await proposalApi.decideProposal(proposalId, request);

    return normalizeProposal(unwrapData(response));
  },

  async submitDecision(proposalId, payload) {
    return this.decideProposal(proposalId, payload);
  },

  async withdrawProposal(proposalId) {
    if (!proposalId) {
      throw new Error("proposalId is required.");
    }

    const response = await proposalApi.withdrawProposal(proposalId);

    return normalizeProposal(unwrapData(response));
  },

  async cancelProposal(proposalId) {
    return this.withdrawProposal(proposalId);
  },

  /*
    Backend mới không còn /counter.
    Giữ alias này để page cũ không vỡ, nhưng sẽ chạy qua /resubmit.
    Sau bước này mình sẽ sửa ProposalDetailPage để bỏ hẳn chữ Counter.
  */
  async counterProposal(proposalId, payload) {
    return this.resubmitProposal(proposalId, payload);
  },

  normalizeProposal,
  normalizeProposalVersion,
};

export default proposalService;