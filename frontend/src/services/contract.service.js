import contractApi from "../api/contract.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

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

  if (data?.data?.contract) return data.data.contract;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data !== undefined) return data.data;

  if (data?.contract) return data.contract;
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
  if (Array.isArray(data?.milestones)) return data.milestones;
  if (Array.isArray(data?.milestoneDrafts)) return data.milestoneDrafts;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.milestones)) return data.data.milestones;
  if (Array.isArray(data?.data?.milestoneDrafts)) {
    return data.data.milestoneDrafts;
  }

  return [];
};

export const normalizeContract = (contract) => {
  if (!contract) return null;

  const contractId = getValue(
    contract.contractId,
    contract.ContractId,
    contract.contractID,
    contract.ContractID,
    contract.projectContractId,
    contract.ProjectContractId,
    contract.id,
    contract.Id
  );

  const proposalId = getValue(
    contract.proposalId,
    contract.ProposalId,
    contract.proposalID,
    contract.ProposalID,
    contract.proposal?.proposalId,
    contract.Proposal?.ProposalId,
    null
  );

  const jobId = getValue(
    contract.jobId,
    contract.JobId,
    contract.jobPostingId,
    contract.JobPostingId,
    contract.job?.jobId,
    contract.Job?.JobId,
    null
  );

  const status = String(
    getValue(
      contract.status,
      contract.Status,
      contract.contractStatus,
      contract.ContractStatus,
      "DRAFT"
    )
  )
    .trim()
    .toUpperCase();

  const finalPrice = toNumber(
    getValue(
      contract.finalPrice,
      contract.FinalPrice,
      contract.totalAmount,
      contract.TotalAmount,
      contract.amount,
      contract.Amount,
      contract.contractAmount,
      contract.ContractAmount,
      contract.price,
      contract.Price,
      contract.budget,
      contract.Budget,
      0
    )
  );

  const finalTimelineDays = toInteger(
    getValue(
      contract.finalTimelineDays,
      contract.FinalTimelineDays,
      contract.timelineDays,
      contract.TimelineDays,
      contract.durationDays,
      contract.DurationDays,
      contract.estimatedDurationDays,
      contract.EstimatedDurationDays,
      0
    )
  );

  const projectScope = getValue(
    contract.projectScope,
    contract.ProjectScope,
    contract.scopeOfWork,
    contract.ScopeOfWork,
    contract.description,
    contract.Description,
    contract.terms,
    contract.Terms,
    ""
  );

  return {
    contractId,
    id: contractId,
    proposalId,
    sourceProposalVersionNumber: toInteger(
      getValue(
        contract.sourceProposalVersionNumber,
        contract.SourceProposalVersionNumber,
        0
      )
    ),
    jobId,

    jobTitle: getValue(
      contract.jobTitle,
      contract.JobTitle,
      contract.projectTitle,
      contract.ProjectTitle,
      contract.contractTitle,
      contract.ContractTitle,
      contract.job?.title,
      contract.Job?.Title,
      "Contract"
    ),

    clientProfileId: getValue(
      contract.clientProfileId,
      contract.ClientProfileId,
      contract.client?.clientProfileId,
      contract.Client?.ClientProfileId,
      null
    ),
    clientUserId: getValue(
      contract.clientUserId,
      contract.ClientUserId,
      contract.client?.userId,
      contract.Client?.UserId,
      null
    ),
    clientId: getValue(
      contract.clientUserId,
      contract.ClientUserId,
      contract.clientId,
      contract.ClientId,
      contract.client?.userId,
      contract.Client?.UserId,
      null
    ),
    clientName: getValue(
      contract.clientName,
      contract.ClientName,
      contract.client?.fullName,
      contract.Client?.FullName,
      contract.client?.name,
      contract.Client?.Name,
      "Client"
    ),

    expertProfileId: getValue(
      contract.expertProfileId,
      contract.ExpertProfileId,
      contract.expert?.expertProfileId,
      contract.Expert?.ExpertProfileId,
      null
    ),
    expertUserId: getValue(
      contract.expertUserId,
      contract.ExpertUserId,
      contract.expert?.userId,
      contract.Expert?.UserId,
      null
    ),
    expertId: getValue(
      contract.expertUserId,
      contract.ExpertUserId,
      contract.expertId,
      contract.ExpertId,
      contract.expert?.userId,
      contract.Expert?.UserId,
      null
    ),
    expertName: getValue(
      contract.expertName,
      contract.ExpertName,
      contract.expert?.fullName,
      contract.Expert?.FullName,
      contract.expert?.name,
      contract.Expert?.Name,
      "Expert"
    ),

    projectScope,
    scopeOfWork: projectScope,
    terms: projectScope,
    description: projectScope,

    finalPrice,
    totalAmount: finalPrice,
    amount: finalPrice,
    currency: getValue(contract.currency, contract.Currency, "VND"),

    platformFeeRate: toNumber(
      getValue(contract.platformFeeRate, contract.PlatformFeeRate, 0)
    ),
    platformFeeAmount: toNumber(
      getValue(contract.platformFeeAmount, contract.PlatformFeeAmount, 0)
    ),
    totalClientPayment: toNumber(
      getValue(contract.totalClientPayment, contract.TotalClientPayment, 0)
    ),
    expertFeeRate: toNumber(
      getValue(contract.expertFeeRate, contract.ExpertFeeRate, 0)
    ),
    expertFeeAmount: toNumber(
      getValue(contract.expertFeeAmount, contract.ExpertFeeAmount, 0)
    ),
    expertReceivableAmount: toNumber(
      getValue(
        contract.expertReceivableAmount,
        contract.ExpertReceivableAmount,
        0
      )
    ),

    finalTimelineDays,
    timelineDays: finalTimelineDays,
    durationDays: finalTimelineDays,

    deliverables: getValue(
      contract.deliverables,
      contract.Deliverables,
      contract.expectedDeliverables,
      contract.ExpectedDeliverables,
      ""
    ),
    acceptanceCriteria: getValue(
      contract.acceptanceCriteria,
      contract.AcceptanceCriteria,
      ""
    ),
    paymentTerms: getValue(
      contract.paymentTerms,
      contract.PaymentTerms,
      ""
    ),
    contractSource: getValue(
      contract.contractSource,
      contract.ContractSource,
      ""
    ),
    chatSummary: getValue(contract.chatSummary, contract.ChatSummary, ""),

    status,
    clientConfirmed: toBoolean(
      getValue(
        contract.clientConfirmed,
        contract.ClientConfirmed,
        contract.isClientConfirmed,
        contract.IsClientConfirmed,
        false
      )
    ),
    expertConfirmed: toBoolean(
      getValue(
        contract.expertConfirmed,
        contract.ExpertConfirmed,
        contract.isExpertConfirmed,
        contract.IsExpertConfirmed,
        false
      )
    ),

    clientSignDeadlineAt: getValue(
      contract.clientSignDeadlineAt,
      contract.ClientSignDeadlineAt,
      ""
    ),
    expertSignDeadlineAt: getValue(
      contract.expertSignDeadlineAt,
      contract.ExpertSignDeadlineAt,
      ""
    ),
    clientSignedAt: getValue(contract.clientSignedAt, contract.ClientSignedAt, ""),
    expertSignedAt: getValue(contract.expertSignedAt, contract.ExpertSignedAt, ""),
    signDeadlineAt: getValue(
      contract.signDeadlineAt,
      contract.SignDeadlineAt,
      contract.signatureDeadlineAt,
      contract.SignatureDeadlineAt,
      ""
    ),
    signExpiredAt: getValue(contract.signExpiredAt, contract.SignExpiredAt, ""),

    cancellationReason: getValue(
      contract.cancelledReason,
      contract.CancelledReason,
      contract.cancellationReason,
      contract.CancellationReason,
      contract.cancelReason,
      contract.CancelReason,
      ""
    ),
    cancelledReason: getValue(
      contract.cancelledReason,
      contract.CancelledReason,
      contract.cancellationReason,
      contract.CancellationReason,
      contract.cancelReason,
      contract.CancelReason,
      ""
    ),

    projectId: getValue(contract.projectId, contract.ProjectId, null),
    projectStatus: String(
      getValue(contract.projectStatus, contract.ProjectStatus, "")
    )
      .trim()
      .toUpperCase(),
    projectEscrowLockedAt: getValue(
      contract.projectEscrowLockedAt,
      contract.ProjectEscrowLockedAt,
      ""
    ),

    createdAt: getValue(contract.createdAt, contract.CreatedAt, ""),
    updatedAt: getValue(contract.updatedAt, contract.UpdatedAt, ""),
    confirmedAt: getValue(contract.confirmedAt, contract.ConfirmedAt, ""),
    cancelledAt: getValue(contract.cancelledAt, contract.CancelledAt, ""),

    raw: contract,
  };
};

export const normalizeContractMilestone = (milestone, index = 0) => {
  if (!milestone) return null;

  const durationDays = getValue(
    milestone.durationDays,
    milestone.DurationDays,
    milestone.deadlineOffsetDays,
    milestone.DeadlineOffsetDays,
    0
  );

  const orderIndex = toInteger(
    getValue(milestone.orderIndex, milestone.OrderIndex, index + 1),
    index + 1
  );

  return {
    id: getValue(
      milestone.contractMilestoneDraftId,
      milestone.ContractMilestoneDraftId,
      milestone.contractMilestoneId,
      milestone.ContractMilestoneId,
      milestone.milestoneDraftId,
      milestone.MilestoneDraftId,
      milestone.id,
      milestone.Id,
      index
    ),
    contractId: getValue(milestone.contractId, milestone.ContractId, null),
    title: getValue(
      milestone.title,
      milestone.Title,
      milestone.name,
      milestone.Name,
      `Milestone ${orderIndex || index + 1}`
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
    amount: toNumber(getValue(milestone.amount, milestone.Amount, 0)),
    durationDays: toInteger(durationDays, 0),
    deadlineOffsetDays: toInteger(durationDays, 0),
    revisionLimit: toInteger(
      getValue(milestone.revisionLimit, milestone.RevisionLimit, 0),
      0
    ),
    orderIndex,
    status: String(getValue(milestone.status, milestone.Status, "PENDING"))
      .trim()
      .toUpperCase(),
    createdAt: getValue(milestone.createdAt, milestone.CreatedAt, ""),
    raw: milestone,
  };
};

export const getFriendlyContractError = (
  error,
  fallback = "Something went wrong."
) => {
  const payload =
    error?.originalError?.response?.data ||
    error?.response?.data ||
    error?.data ||
    error;

  const message =
    typeof payload === "string"
      ? payload
      : payload?.message ||
        payload?.title ||
        payload?.detail ||
        payload?.error ||
        error?.message ||
        "";

  const normalizedMessage = String(message || "").toLowerCase();

  if (normalizedMessage.includes("not found")) {
    return "Contract could not be found.";
  }

  if (normalizedMessage.includes("already")) {
    return "This contract has already been processed.";
  }

  if (normalizedMessage.includes("confirm")) {
    return "This contract cannot be confirmed right now.";
  }

  if (normalizedMessage.includes("cancel")) {
    return "This contract draft cannot be cancelled right now.";
  }

  if (normalizedMessage.includes("decline")) {
    return "This deal cannot be declined right now.";
  }

  if (normalizedMessage.includes("proposal")) {
    return "Cannot find a contract for this proposal.";
  }

  return message || fallback;
};

const ensureId = (id, message) => {
  if (isInvalidId(id)) {
    throw new Error(message);
  }
};

const buildReasonPayload = (reason) => {
  const normalizedReason =
    typeof reason === "object" ? trim(reason?.reason) : trim(reason);

  return { reason: normalizedReason };
};

const contractService = {
  /**
   * Client-side action only.
   * Expert pages must never call this method.
   */
  async createFromProposal(proposalId) {
    ensureId(proposalId, "Invalid proposal id.");

    const response = await contractApi.createContractFromProposal(proposalId);
    return normalizeContract(unwrapData(response));
  },

  async getContractById(contractId) {
    ensureId(contractId, "Invalid contract id.");

    const response = await contractApi.getContractById(contractId);
    return normalizeContract(unwrapData(response));
  },

  async getContractByProposalId(proposalId) {
    ensureId(proposalId, "Invalid proposal id.");

    const response = await contractApi.getContractByProposalId(proposalId);
    return normalizeContract(unwrapData(response));
  },

  async getContractMilestoneDrafts(contractId) {
    ensureId(contractId, "Invalid contract id.");

    const response = await contractApi.getContractMilestoneDrafts(contractId);

    return unwrapListData(response)
      .map((item, index) => normalizeContractMilestone(item, index))
      .filter(Boolean)
      .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));
  },

  async confirmContract(contractId) {
    ensureId(contractId, "Invalid contract id.");

    const response = await contractApi.confirmContract(contractId);
    return normalizeContract(unwrapData(response));
  },

  async cancelDraftContract(contractId, reason = "") {
    ensureId(contractId, "Invalid contract id.");

    const response = await contractApi.cancelDraftContract(
      contractId,
      buildReasonPayload(reason)
    );

    return normalizeContract(unwrapData(response));
  },

  async declineContractDeal(contractId, reason) {
    ensureId(contractId, "Invalid contract id.");

    const payload = buildReasonPayload(reason);

    if (!payload.reason) {
      throw new Error("Decline reason is required.");
    }

    const response = await contractApi.declineContractDeal(contractId, payload);

    return normalizeContract(unwrapData(response));
  },
};

export default contractService;