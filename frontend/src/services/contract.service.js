import contractApi from "../api/contract.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

const toNumber = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [];
};

const isInvalidId = (value) => {
  return !value || value === "undefined" || value === "null";
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
  if (Array.isArray(data?.contractMilestoneDrafts)) {
    return data.contractMilestoneDrafts;
  }

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.milestones)) return data.data.milestones;
  if (Array.isArray(data?.data?.milestoneDrafts)) {
    return data.data.milestoneDrafts;
  }
  if (Array.isArray(data?.data?.contractMilestoneDrafts)) {
    return data.data.contractMilestoneDrafts;
  }

  return [];
};

export const normalizeMilestoneDraft = (item, index = 0) => {
  if (!item) return null;

  const milestoneDraftId = getValue(
    item.milestoneDraftId,
    item.MilestoneDraftId,
    item.contractMilestoneDraftId,
    item.ContractMilestoneDraftId,
    item.milestoneId,
    item.MilestoneId,
    item.id,
    item.Id,
    null
  );

  const amount = Number(
    getValue(item.amount, item.Amount, item.budget, item.Budget, 0)
  );

  const deadlineOffsetDays = Number(
    getValue(
      item.deadlineOffsetDays,
      item.DeadlineOffsetDays,
      item.durationDays,
      item.DurationDays,
      0
    )
  );

  return {
    milestoneDraftId,
    contractMilestoneDraftId: milestoneDraftId,
    milestoneId: milestoneDraftId,
    id: milestoneDraftId,

    contractId: getValue(item.contractId, item.ContractId, null),

    title: getValue(item.title, item.Title, ""),
    description: getValue(item.description, item.Description, ""),

    expectedDeliverable: getValue(
      item.expectedDeliverable,
      item.ExpectedDeliverable,
      item.deliverable,
      item.Deliverable,
      ""
    ),

    acceptanceCriteria: getValue(
      item.acceptanceCriteria,
      item.AcceptanceCriteria,
      item.criteria,
      item.Criteria,
      ""
    ),

    amount,
    budget: amount,

    orderIndex: Number(getValue(item.orderIndex, item.OrderIndex, index + 1)),

    deadlineOffsetDays,
    durationDays: deadlineOffsetDays,

    deadline: getValue(item.deadline, item.Deadline, null),
    dueDate: getValue(item.dueDate, item.DueDate, item.deadline, item.Deadline, null),

    revisionLimit: Number(getValue(item.revisionLimit, item.RevisionLimit, 0)),

    status: String(getValue(item.status, item.Status, ""))
      .trim()
      .toUpperCase(),

    createdAt: getValue(item.createdAt, item.CreatedAt, ""),
    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),

    raw: item,
  };
};

export const normalizeMilestoneDrafts = (items = []) => {
  return toArray(items)
    .map((item, index) => normalizeMilestoneDraft(item, index))
    .filter(Boolean);
};

export const normalizeContract = (contract) => {
  if (!contract) return null;

  const contractId = getValue(
    contract.contractId,
    contract.ContractId,
    contract.id,
    contract.Id
  );

  const proposalId = getValue(
    contract.proposalId,
    contract.ProposalId,
    contract.proposal?.proposalId,
    contract.Proposal?.ProposalId
  );

  const jobId = getValue(
    contract.jobId,
    contract.JobId,
    contract.jobPostingId,
    contract.JobPostingId,
    contract.proposal?.jobId,
    contract.Proposal?.JobId,
    contract.proposal?.jobPostingId,
    contract.Proposal?.JobPostingId,
    null
  );

  const projectId = getValue(
    contract.projectId,
    contract.ProjectId,
    contract.project?.projectId,
    contract.Project?.ProjectId,
    null
  );

  const status = String(getValue(contract.status, contract.Status, "DRAFT"))
    .trim()
    .toUpperCase();

  const finalPrice = Number(
    getValue(
      contract.finalPrice,
      contract.FinalPrice,
      contract.agreedPrice,
      contract.AgreedPrice,
      contract.totalAmount,
      contract.TotalAmount,
      contract.price,
      contract.Price,
      0
    )
  );

  const finalTimelineDays = Number(
    getValue(
      contract.finalTimelineDays,
      contract.FinalTimelineDays,
      contract.agreedTimelineDays,
      contract.AgreedTimelineDays,
      contract.timelineDays,
      contract.TimelineDays,
      contract.durationDays,
      contract.DurationDays,
      0
    )
  );

  const milestoneDrafts = normalizeMilestoneDrafts(
    getValue(
      contract.milestoneDrafts,
      contract.MilestoneDrafts,
      contract.contractMilestoneDrafts,
      contract.ContractMilestoneDrafts,
      contract.milestones,
      contract.Milestones,
      []
    )
  );

  return {
    contractId,
    id: contractId,

    proposalId,

    jobId,
    jobPostingId: jobId,

    projectId,

    title: getValue(
      contract.title,
      contract.Title,
      contract.contractTitle,
      contract.ContractTitle,
      contract.jobTitle,
      contract.JobTitle,
      "Contract"
    ),

    jobTitle: getValue(
      contract.jobTitle,
      contract.JobTitle,
      contract.title,
      contract.Title,
      contract.contractTitle,
      contract.ContractTitle,
      "Contract"
    ),

    clientProfileId: getValue(
      contract.clientProfileId,
      contract.ClientProfileId,
      null
    ),

    expertProfileId: getValue(
      contract.expertProfileId,
      contract.ExpertProfileId,
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

    projectScope: getValue(
      contract.projectScope,
      contract.ProjectScope,
      contract.scopeOfWork,
      contract.ScopeOfWork,
      contract.description,
      contract.Description,
      ""
    ),

    terms: getValue(
      contract.terms,
      contract.Terms,
      contract.contractTerms,
      contract.ContractTerms,
      contract.paymentTerms,
      contract.PaymentTerms,
      ""
    ),

    finalPrice,
    agreedPrice: finalPrice,
    totalAmount: finalPrice,

    platformFee: Number(
      getValue(contract.platformFee, contract.PlatformFee, 0)
    ),

    expertAmount: Number(
      getValue(contract.expertAmount, contract.ExpertAmount, finalPrice)
    ),

    finalTimelineDays,
    agreedTimelineDays: finalTimelineDays,
    timelineDays: finalTimelineDays,

    deliverables: getValue(contract.deliverables, contract.Deliverables, ""),

    acceptanceCriteria: getValue(
      contract.acceptanceCriteria,
      contract.AcceptanceCriteria,
      ""
    ),

    revisionLimit: Number(
      getValue(contract.revisionLimit, contract.RevisionLimit, 0)
    ),

    paymentTerms: getValue(contract.paymentTerms, contract.PaymentTerms, ""),

    chatSummary: getValue(contract.chatSummary, contract.ChatSummary, ""),

    milestoneDrafts,

    status,

    cancelReason: getValue(
      contract.cancelReason,
      contract.CancelReason,
      contract.rejectionReason,
      contract.RejectionReason,
      contract.reason,
      contract.Reason,
      ""
    ),

    clientConfirmedAt: getValue(
      contract.clientConfirmedAt,
      contract.ClientConfirmedAt,
      null
    ),

    expertConfirmedAt: getValue(
      contract.expertConfirmedAt,
      contract.ExpertConfirmedAt,
      null
    ),

    confirmedAt: getValue(
      contract.confirmedAt,
      contract.ConfirmedAt,
      contract.expertConfirmedAt,
      contract.ExpertConfirmedAt,
      null
    ),

    cancelledAt: getValue(contract.cancelledAt, contract.CancelledAt, null),

    startDate: getValue(contract.startDate, contract.StartDate, null),
    endDate: getValue(contract.endDate, contract.EndDate, null),

    createdAt: getValue(contract.createdAt, contract.CreatedAt, ""),
    updatedAt: getValue(contract.updatedAt, contract.UpdatedAt, ""),

    raw: contract,
  };
};

const buildDraftPayload = (formData) => ({
  proposalId: Number(formData.proposalId),
  projectScope: trim(formData.projectScope),
  finalPrice: toNumber(formData.finalPrice),
  finalTimelineDays: toNumber(formData.finalTimelineDays),
  deliverables: trim(formData.deliverables),
  acceptanceCriteria: trim(formData.acceptanceCriteria),
  revisionLimit: toNumber(formData.revisionLimit),
  paymentTerms: trim(formData.paymentTerms),
});

const buildUpdateDraftPayload = (formData) => ({
  projectScope: trim(formData.projectScope),
  finalPrice: toNumber(formData.finalPrice),
  finalTimelineDays: toNumber(formData.finalTimelineDays),
  deliverables: trim(formData.deliverables),
  acceptanceCriteria: trim(formData.acceptanceCriteria),
  revisionLimit: toNumber(formData.revisionLimit),
  paymentTerms: trim(formData.paymentTerms),
  chatSummary: trim(formData.chatSummary),
});

const buildMilestonePayload = (milestones = []) => ({
  milestones: toArray(milestones).map((item, index) => ({
    title: trim(item.title),
    description: trim(item.description),
    expectedDeliverable: trim(item.expectedDeliverable),
    acceptanceCriteria: trim(item.acceptanceCriteria),
    amount: toNumber(getValue(item.amount, item.budget)),
    orderIndex: toNumber(item.orderIndex || index + 1),
    deadlineOffsetDays: toNumber(
      getValue(item.deadlineOffsetDays, item.durationDays)
    ),
    revisionLimit: toNumber(item.revisionLimit),
  })),
});

const buildCancelPayload = (input) => {
  if (typeof input === "string") {
    return {
      reason: trim(input),
    };
  }

  return {
    reason: trim(input?.reason),
  };
};

const contractService = {
  // CLIENT/FE1: create contract after proposal accepted
  async createContractFromProposal(proposalId, formData) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const response = await contractApi.createContractFromProposal(
      proposalId,
      formData
    );

    console.log("CREATE CONTRACT FROM PROPOSAL RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  // CLIENT/FE1: create draft contract
  async createDraftContract(formData) {
    const payload = buildDraftPayload(formData);

    console.log("CREATE DRAFT CONTRACT PAYLOAD:", payload);

    const response = await contractApi.createDraftContract(payload);

    console.log("CREATE DRAFT CONTRACT RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  // Alias giữ tương thích code cũ
  async createContractDraft(formData) {
    return this.createDraftContract(formData);
  },

  // CLIENT/FE1: update draft contract
  async updateDraftContract(contractId, formData) {
    if (isInvalidId(contractId)) {
      throw new Error("Invalid contract id.");
    }

    const payload = buildUpdateDraftPayload(formData);

    console.log("UPDATE DRAFT CONTRACT PAYLOAD:", payload);

    const response = await contractApi.updateDraftContract(contractId, payload);

    console.log("UPDATE DRAFT CONTRACT RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  // Alias giữ tương thích code cũ
  async updateContractDraft(contractId, formData) {
    return this.updateDraftContract(contractId, formData);
  },

  // EXPERT/FE2 + CLIENT/FE1: get milestone drafts
  async getContractMilestoneDrafts(contractId) {
    if (isInvalidId(contractId)) {
      throw new Error("Invalid contract id.");
    }

    const response = await contractApi.getContractMilestoneDrafts(contractId);

    console.log("GET CONTRACT MILESTONE DRAFTS RESPONSE:", response?.data);

    return unwrapListData(response)
      .map((item, index) => normalizeMilestoneDraft(item, index))
      .filter(Boolean);
  },

  // CLIENT/FE1: update milestone drafts
  async updateContractMilestoneDrafts(contractId, milestones) {
    if (isInvalidId(contractId)) {
      throw new Error("Invalid contract id.");
    }

    const payload = buildMilestonePayload(milestones);

    console.log("UPDATE CONTRACT MILESTONE DRAFTS PAYLOAD:", payload);

    const response = await contractApi.updateContractMilestoneDrafts(
      contractId,
      payload
    );

    console.log("UPDATE CONTRACT MILESTONE DRAFTS RESPONSE:", response?.data);

    return unwrapListData(response)
      .map((item, index) => normalizeMilestoneDraft(item, index))
      .filter(Boolean);
  },

  // Alias giữ tương thích code cũ
  async replaceContractMilestoneDrafts(contractId, milestones) {
    return this.updateContractMilestoneDrafts(contractId, milestones);
  },

  // EXPERT/FE2 + CLIENT/FE1: get contract by contract id
  async getContractById(contractId) {
    if (isInvalidId(contractId)) {
      throw new Error("Invalid contract id.");
    }

    const response = await contractApi.getContractById(contractId);

    console.log("GET CONTRACT DETAIL RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  // Alias quan trọng vì ContractDetailPage hiện tại đang gọi getContract()
  async getContract(contractId) {
    return this.getContractById(contractId);
  },

  // EXPERT/FE2: get contract from proposal id
  async getContractByProposalId(proposalId) {
    if (isInvalidId(proposalId)) {
      throw new Error("Invalid proposal id.");
    }

    const response = await contractApi.getContractByProposalId(proposalId);

    console.log("GET CONTRACT BY PROPOSAL RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  // Alias quan trọng vì ContractDetailPage hiện tại đang gọi getContractByProposal()
  async getContractByProposal(proposalId) {
    return this.getContractByProposalId(proposalId);
  },

  // EXPERT/FE2: accept contract
  async confirmContract(contractId) {
    if (isInvalidId(contractId)) {
      throw new Error("Invalid contract id.");
    }

    const response = await contractApi.confirmContract(contractId);

    console.log("CONFIRM CONTRACT RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  // EXPERT/FE2: reject/cancel contract
  async cancelContract(contractId, input) {
    if (isInvalidId(contractId)) {
      throw new Error("Invalid contract id.");
    }

    const payload = buildCancelPayload(input);

    console.log("CANCEL CONTRACT PAYLOAD:", payload);

    const response = await contractApi.cancelContract(contractId, payload);

    console.log("CANCEL CONTRACT RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },
};

export default contractService;