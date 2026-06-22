import contractApi from "../api/contract.api";


const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

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
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.Result)) return data.Result;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.Results)) return data.Results;

  if (Array.isArray(data?.milestones)) return data.milestones;
  if (Array.isArray(data?.Milestones)) return data.Milestones;
  if (Array.isArray(data?.milestoneDrafts)) return data.milestoneDrafts;
  if (Array.isArray(data?.MilestoneDrafts)) return data.MilestoneDrafts;
  if (Array.isArray(data?.contractMilestoneDrafts)) {
    return data.contractMilestoneDrafts;
  }
  if (Array.isArray(data?.ContractMilestoneDrafts)) {
    return data.ContractMilestoneDrafts;
  }

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.Items)) return data.data.Items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.Result)) return data.data.Result;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  if (Array.isArray(data?.data?.Results)) return data.data.Results;

  if (Array.isArray(data?.data?.milestones)) return data.data.milestones;
  if (Array.isArray(data?.data?.Milestones)) return data.data.Milestones;
  if (Array.isArray(data?.data?.milestoneDrafts)) {
    return data.data.milestoneDrafts;
  }
  if (Array.isArray(data?.data?.MilestoneDrafts)) {
    return data.data.MilestoneDrafts;
  }
  if (Array.isArray(data?.data?.contractMilestoneDrafts)) {
    return data.data.contractMilestoneDrafts;
  }
  if (Array.isArray(data?.data?.ContractMilestoneDrafts)) {
    return data.data.ContractMilestoneDrafts;
  }

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
  return String(status || "DRAFT").trim().toUpperCase();
};

const normalizeContract = (item) => {
  if (!item) return null;

  const contractId = getValue(
    item.contractId,
    item.ContractId,
    item.id,
    item.Id
  );

  const proposalId = getValue(item.proposalId, item.ProposalId);

  const projectId = getValue(item.projectId, item.ProjectId);

  const jobId = getValue(
    item.jobId,
    item.JobId,
    item.jobPostingId,
    item.JobPostingId
  );

  const totalBudget = Number(
    getValue(
      item.totalBudget,
      item.TotalBudget,
      item.budget,
      item.Budget,
      item.contractValue,
      item.ContractValue,
      item.price,
      item.Price,
      0
    )
  );

  const durationDays = Number(
    getValue(
      item.durationDays,
      item.DurationDays,
      item.estimatedDurationDays,
      item.EstimatedDurationDays,
      item.timelineDays,
      item.TimelineDays,
      0
    )
  );

  return {
    ...item,

    contractId,
    id: contractId,

    proposalId,
    projectId,
    jobId,
    jobPostingId: jobId,

    title: getValue(
      item.title,
      item.Title,
      item.contractTitle,
      item.ContractTitle,
      item.projectTitle,
      item.ProjectTitle,
      item.jobTitle,
      item.JobTitle,
      "Contract"
    ),

    description: getValue(
      item.description,
      item.Description,
      item.scope,
      item.Scope,
      item.contractScope,
      item.ContractScope,
      ""
    ),

    clientName: getValue(
      item.clientName,
      item.ClientName,
      item.customerName,
      item.CustomerName,
      "Client"
    ),

    expertName: getValue(
      item.expertName,
      item.ExpertName,
      item.expertFullName,
      item.ExpertFullName,
      "Expert"
    ),

    terms: getValue(
      item.terms,
      item.Terms,
      item.contractTerms,
      item.ContractTerms,
      ""
    ),

    cancellationReason: getValue(
      item.cancellationReason,
      item.CancellationReason,
      item.cancelReason,
      item.CancelReason,
      ""
    ),

    totalBudget: Number.isNaN(totalBudget) ? 0 : totalBudget,
    budget: Number.isNaN(totalBudget) ? 0 : totalBudget,

    durationDays: Number.isNaN(durationDays) ? 0 : durationDays,

    status: normalizeStatus(getValue(item.status, item.Status)),

    createdAt: getValue(item.createdAt, item.CreatedAt, ""),
    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),
    confirmedAt: getValue(item.confirmedAt, item.ConfirmedAt, ""),
    cancelledAt: getValue(item.cancelledAt, item.CancelledAt, ""),

    raw: item,
  };
};

const normalizeMilestoneDraft = (item) => {
  if (!item) return null;

  const milestoneDraftId = getValue(
    item.milestoneDraftId,
    item.MilestoneDraftId,
    item.contractMilestoneDraftId,
    item.ContractMilestoneDraftId,
    item.id,
    item.Id
  );

  const amount = Number(
    getValue(
      item.amount,
      item.Amount,
      item.budget,
      item.Budget,
      item.price,
      item.Price,
      0
    )
  );

  const orderIndex = Number(
    getValue(
      item.orderIndex,
      item.OrderIndex,
      item.sortOrder,
      item.SortOrder,
      item.index,
      item.Index,
      0
    )
  );

  const durationDays = Number(
    getValue(
      item.durationDays,
      item.DurationDays,
      item.estimatedDurationDays,
      item.EstimatedDurationDays,
      0
    )
  );

  return {
    ...item,

    milestoneDraftId,
    id: milestoneDraftId,

    contractId: getValue(item.contractId, item.ContractId),

    title: getValue(
      item.title,
      item.Title,
      item.name,
      item.Name,
      `Milestone ${orderIndex || ""}`.trim()
    ),

    description: getValue(
      item.description,
      item.Description,
      item.deliverables,
      item.Deliverables,
      ""
    ),

    amount: Number.isNaN(amount) ? 0 : amount,
    budget: Number.isNaN(amount) ? 0 : amount,

    durationDays: Number.isNaN(durationDays) ? 0 : durationDays,

    orderIndex: Number.isNaN(orderIndex) ? 0 : orderIndex,

    dueDate: getValue(item.dueDate, item.DueDate, item.deadline, item.Deadline, ""),

    createdAt: getValue(item.createdAt, item.CreatedAt, ""),
    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),

    raw: item,
  };
};

const buildCreateContractPayload = (payload = {}) => {
  return cleanPayload({
    ...payload,

    proposalId: getValue(payload.proposalId, payload.ProposalId),
    title: trim(getValue(payload.title, payload.contractTitle, "")),
    description: trim(
      getValue(payload.description, payload.scope, payload.contractScope, "")
    ),
    terms: trim(getValue(payload.terms, payload.contractTerms, "")),

    totalBudget: Number(
      getValue(payload.totalBudget, payload.budget, payload.contractValue, 0)
    ),

    durationDays: Number(
      getValue(payload.durationDays, payload.estimatedDurationDays, 0)
    ),
  });
};

const buildUpdateContractDraftPayload = (payload = {}) => {
  return cleanPayload({
    ...payload,

    title: trim(getValue(payload.title, payload.contractTitle, "")),
    description: trim(
      getValue(payload.description, payload.scope, payload.contractScope, "")
    ),
    terms: trim(getValue(payload.terms, payload.contractTerms, "")),

    totalBudget: Number(
      getValue(payload.totalBudget, payload.budget, payload.contractValue, 0)
    ),

    durationDays: Number(
      getValue(payload.durationDays, payload.estimatedDurationDays, 0)
    ),
  });
};

const buildMilestoneDraftItemPayload = (item = {}, index = 0) => {
  return cleanPayload({
    ...item,

    title: trim(getValue(item.title, item.name, "")),
    description: trim(getValue(item.description, item.deliverables, "")),

    amount: Number(getValue(item.amount, item.budget, item.price, 0)),

    durationDays: Number(
      getValue(item.durationDays, item.estimatedDurationDays, 0)
    ),

    orderIndex: Number(getValue(item.orderIndex, item.sortOrder, index + 1)),

    dueDate: getValue(item.dueDate, item.deadline, ""),
  });
};

const buildReplaceMilestoneDraftsPayload = (payload = {}) => {
  const source = Array.isArray(payload)
    ? payload
    : getValue(
        payload.milestones,
        payload.milestoneDrafts,
        payload.items,
        payload.contractMilestoneDrafts,
        []
      );

  const milestoneDrafts = Array.isArray(source)
    ? source.map(buildMilestoneDraftItemPayload)
    : [];

  return {
    milestoneDrafts,
    milestones: milestoneDrafts,
    items: milestoneDrafts,
  };
};

const buildConfirmContractPayload = (payload = {}) => {
  return cleanPayload({
    ...payload,
    note: trim(getValue(payload.note, payload.message, "")),
  });
};

const buildCancelContractPayload = (payload = {}) => {
  return cleanPayload({
    ...payload,
    reason: trim(
      getValue(payload.reason, payload.cancelReason, payload.message, "")
    ),
  });
};

const contractService = {
  async createContractFromProposal(proposalId, payload = {}) {
    if (!proposalId) {
      throw new Error("proposalId is required.");
    }

    const request = buildCreateContractPayload({
      ...payload,
      proposalId,
    });

    const response = await contractApi.createContractFromProposal(
      proposalId,
      request
    );

    return normalizeContract(unwrapData(response));
  },

  async createContractDraft(payload) {
    const request = buildCreateContractPayload(payload);
    const response = await contractApi.createContractDraft(request);

    return normalizeContract(unwrapData(response));
  },

  async updateContractDraft(contractId, payload) {
    if (!contractId) {
      throw new Error("contractId is required.");
    }

    const request = buildUpdateContractDraftPayload(payload);
    const response = await contractApi.updateContractDraft(contractId, request);

    return normalizeContract(unwrapData(response));
  },

  async getContractMilestoneDrafts(contractId) {
    if (!contractId) {
      throw new Error("contractId is required.");
    }

    const response = await contractApi.getContractMilestoneDrafts(contractId);

    return unwrapListData(response).map(normalizeMilestoneDraft).filter(Boolean);
  },

  async replaceContractMilestoneDrafts(contractId, payload) {
    if (!contractId) {
      throw new Error("contractId is required.");
    }

    const request = buildReplaceMilestoneDraftsPayload(payload);

    const response = await contractApi.replaceContractMilestoneDrafts(
      contractId,
      request
    );

    const data = unwrapData(response);

    if (Array.isArray(data)) {
      return data.map(normalizeMilestoneDraft).filter(Boolean);
    }

    const list = unwrapListData(response);

    if (list.length > 0) {
      return list.map(normalizeMilestoneDraft).filter(Boolean);
    }

    return data;
  },

  async getContract(contractId) {
    if (!contractId) {
      throw new Error("contractId is required.");
    }

    const response = await contractApi.getContract(contractId);

    return normalizeContract(unwrapData(response));
  },

  async getContractById(contractId) {
    return this.getContract(contractId);
  },

  async getContractDetail(contractId) {
    return this.getContract(contractId);
  },

  async getContractByProposal(proposalId) {
    if (!proposalId) {
      throw new Error("proposalId is required.");
    }

    const response = await contractApi.getContractByProposal(proposalId);

    return normalizeContract(unwrapData(response));
  },

  async getContractByProposalId(proposalId) {
    return this.getContractByProposal(proposalId);
  },

  async getProposalContract(proposalId) {
    return this.getContractByProposal(proposalId);
  },

  async confirmContract(contractId, payload = {}) {
    if (!contractId) {
      throw new Error("contractId is required.");
    }

    const request = buildConfirmContractPayload(payload);
    const response = await contractApi.confirmContract(contractId, request);

    return normalizeContract(unwrapData(response));
  },

  async cancelContract(contractId, payload = {}) {
    if (!contractId) {
      throw new Error("contractId is required.");
    }

    const request = buildCancelContractPayload(payload);
    const response = await contractApi.cancelContract(contractId, request);

    return normalizeContract(unwrapData(response));
  },

  normalizeContract,
  normalizeMilestoneDraft,
};

export default contractService;