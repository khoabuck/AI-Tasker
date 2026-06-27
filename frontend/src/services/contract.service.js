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
  if (data?.data) return data.data;

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
    contract.projectId,
    contract.ProjectId,
    contract.job?.jobId,
    contract.Job?.JobId,
    contract.project?.projectId,
    contract.Project?.ProjectId,
    null
  );

  return {
    contractId,
    id: contractId,

    proposalId,

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
      contract.project?.title,
      contract.Project?.Title,
      contract.title,
      contract.Title,
      "Contract"
    ),

    clientId: getValue(
      contract.clientId,
      contract.ClientId,
      contract.client?.userId,
      contract.client?.clientId,
      contract.Client?.UserId,
      contract.Client?.ClientId,
      null
    ),

    expertId: getValue(
      contract.expertId,
      contract.ExpertId,
      contract.expert?.userId,
      contract.expert?.expertId,
      contract.Expert?.UserId,
      contract.Expert?.ExpertId,
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

    expertName: getValue(
      contract.expertName,
      contract.ExpertName,
      contract.expert?.fullName,
      contract.Expert?.FullName,
      contract.expert?.name,
      contract.Expert?.Name,
      "Expert"
    ),

    status: String(
      getValue(
        contract.status,
        contract.Status,
        contract.contractStatus,
        contract.ContractStatus,
        "PENDING"
      )
    )
      .trim()
      .toUpperCase(),

    totalAmount: toNumber(
      getValue(
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
    ),

    currency: getValue(
      contract.currency,
      contract.Currency,
      contract.currencyCode,
      contract.CurrencyCode,
      "VND"
    ),

    timelineDays: toInteger(
      getValue(
        contract.timelineDays,
        contract.TimelineDays,
        contract.durationDays,
        contract.DurationDays,
        contract.estimatedDurationDays,
        contract.EstimatedDurationDays,
        0
      )
    ),

    terms: getValue(
      contract.terms,
      contract.Terms,
      contract.description,
      contract.Description,
      contract.note,
      contract.Note,
      ""
    ),

    cancellationReason: getValue(
      contract.cancellationReason,
      contract.CancellationReason,
      contract.cancelReason,
      contract.CancelReason,
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

  return {
    id: getValue(
      milestone.contractMilestoneId,
      milestone.ContractMilestoneId,
      milestone.milestoneDraftId,
      milestone.MilestoneDraftId,
      milestone.contractMilestoneDraftId,
      milestone.ContractMilestoneDraftId,
      milestone.id,
      milestone.Id,
      index
    ),

    title: getValue(
      milestone.title,
      milestone.Title,
      milestone.name,
      milestone.Name,
      `Milestone ${index + 1}`
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

    orderIndex: toInteger(
      getValue(milestone.orderIndex, milestone.OrderIndex, index + 1),
      index + 1
    ),

    status: String(getValue(milestone.status, milestone.Status, "PENDING"))
      .trim()
      .toUpperCase(),

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
    return "This contract cannot be cancelled right now.";
  }

  if (normalizedMessage.includes("proposal")) {
    return "Cannot find a contract for this proposal.";
  }

  return message || fallback;
};

const contractService = {
  async createFromProposal(proposalId, data = undefined) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const response = await contractApi.createContractFromProposal(
      proposalId,
      data
    );

    return normalizeContract(unwrapData(response));
  },

  async getContractById(contractId) {
    if (isInvalidId(contractId)) {
      throw new Error("Invalid contract id.");
    }

    const response = await contractApi.getContractById(contractId);

    return normalizeContract(unwrapData(response));
  },

  async getContractByProposalId(proposalId) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const response = await contractApi.getContractByProposalId(proposalId);

    return normalizeContract(unwrapData(response));
  },

  async getMilestoneDrafts(contractId) {
    if (isInvalidId(contractId)) {
      throw new Error("Invalid contract id.");
    }

    const response = await contractApi.getContractMilestoneDrafts(contractId);

    return unwrapListData(response)
      .map((item, index) => normalizeContractMilestone(item, index))
      .filter(Boolean)
      .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));
  },

  async confirmContract(contractId, data = undefined) {
    if (isInvalidId(contractId)) {
      throw new Error("Invalid contract id.");
    }

    const response = await contractApi.confirmContract(contractId, data);

    return normalizeContract(unwrapData(response));
  },

  async cancelContract(contractId, reason) {
    if (isInvalidId(contractId)) {
      throw new Error("Invalid contract id.");
    }

    const payload =
      typeof reason === "object"
        ? reason
        : {
            reason: trim(reason),
          };

    const response = await contractApi.cancelContract(contractId, payload);

    return normalizeContract(unwrapData(response));
  },

  async getContract(contractId) {
    return this.getContractById(contractId);
  },

  async getContractByProposal(proposalId) {
    return this.getContractByProposalId(proposalId);
  },

  async getContractMilestoneDrafts(contractId) {
    return this.getMilestoneDrafts(contractId);
  },

  async createContractFromProposal(proposalId, data = undefined) {
    return this.createFromProposal(proposalId, data);
  },
};

export default contractService;