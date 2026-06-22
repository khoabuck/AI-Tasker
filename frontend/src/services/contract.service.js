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

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.milestones)) return data.data.milestones;

  return [];
};

export const normalizeMilestoneDraft = (item, index = 0) => {
  if (!item) return null;

  return {
    milestoneDraftId: getValue(
      item.milestoneDraftId,
      item.MilestoneDraftId,
      item.id,
      item.Id,
      null
    ),
    title: getValue(item.title, item.Title, ""),
    description: getValue(item.description, item.Description, ""),
    expectedDeliverable: getValue(
      item.expectedDeliverable,
      item.ExpectedDeliverable,
      ""
    ),
    acceptanceCriteria: getValue(
      item.acceptanceCriteria,
      item.AcceptanceCriteria,
      ""
    ),
    amount: Number(getValue(item.amount, item.Amount, 0)),
    orderIndex: Number(getValue(item.orderIndex, item.OrderIndex, index + 1)),
    deadlineOffsetDays: Number(
      getValue(item.deadlineOffsetDays, item.DeadlineOffsetDays, 0)
    ),
    revisionLimit: Number(getValue(item.revisionLimit, item.RevisionLimit, 0)),
    raw: item,
  };
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
      0
    )
  );

  return {
    contractId,
    id: contractId,

    proposalId,
    projectId,

    jobTitle: getValue(
      contract.jobTitle,
      contract.JobTitle,
      contract.title,
      contract.Title,
      contract.contractTitle,
      contract.ContractTitle,
      "Contract"
    ),

    clientName: getValue(
      contract.clientName,
      contract.ClientName,
      contract.client?.fullName,
      contract.Client?.FullName,
      "Client"
    ),

    expertName: getValue(
      contract.expertName,
      contract.ExpertName,
      contract.expert?.fullName,
      contract.Expert?.FullName,
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

    finalPrice,
    agreedPrice: finalPrice,

    finalTimelineDays,
    agreedTimelineDays: finalTimelineDays,

    deliverables: getValue(contract.deliverables, contract.Deliverables, ""),

    acceptanceCriteria: getValue(
      contract.acceptanceCriteria,
      contract.AcceptanceCriteria,
      ""
    ),

    revisionLimit: Number(
      getValue(contract.revisionLimit, contract.RevisionLimit, 0)
    ),

    paymentTerms: getValue(
      contract.paymentTerms,
      contract.PaymentTerms,
      ""
    ),

    chatSummary: getValue(contract.chatSummary, contract.ChatSummary, ""),

    status,

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

const buildMilestonePayload = (milestones) => ({
  milestones: (milestones || []).map((item, index) => ({
    title: trim(item.title),
    description: trim(item.description),
    expectedDeliverable: trim(item.expectedDeliverable),
    acceptanceCriteria: trim(item.acceptanceCriteria),
    amount: toNumber(item.amount),
    orderIndex: toNumber(item.orderIndex || index + 1),
    deadlineOffsetDays: toNumber(item.deadlineOffsetDays),
    revisionLimit: toNumber(item.revisionLimit),
  })),
});

const contractService = {
  async createContractFromProposal(proposalId) {
    const response = await contractApi.createContractFromProposal(proposalId);

    console.log("CREATE CONTRACT FROM PROPOSAL RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  async createDraftContract(formData) {
    const payload = buildDraftPayload(formData);

    console.log("CREATE DRAFT CONTRACT PAYLOAD:", payload);

    const response = await contractApi.createDraftContract(payload);

    console.log("CREATE DRAFT CONTRACT RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  async updateDraftContract(contractId, formData) {
    const payload = buildUpdateDraftPayload(formData);

    console.log("UPDATE DRAFT CONTRACT PAYLOAD:", payload);

    const response = await contractApi.updateDraftContract(contractId, payload);

    console.log("UPDATE DRAFT CONTRACT RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  async getContractMilestoneDrafts(contractId) {
    const response = await contractApi.getContractMilestoneDrafts(contractId);

    console.log("GET CONTRACT MILESTONE DRAFTS RESPONSE:", response?.data);

    return unwrapListData(response)
      .map((item, index) => normalizeMilestoneDraft(item, index))
      .filter(Boolean);
  },

  async replaceContractMilestoneDrafts(contractId, milestones) {
    const payload = buildMilestonePayload(milestones);

    console.log("REPLACE CONTRACT MILESTONE DRAFTS PAYLOAD:", payload);

    const response = await contractApi.replaceContractMilestoneDrafts(
      contractId,
      payload
    );

    console.log("REPLACE CONTRACT MILESTONE DRAFTS RESPONSE:", response?.data);

    return unwrapListData(response)
      .map((item, index) => normalizeMilestoneDraft(item, index))
      .filter(Boolean);
  },

  async getContractById(contractId) {
    if (!contractId || contractId === "undefined" || contractId === "null") {
      throw new Error("Invalid contract id.");
    }

    const response = await contractApi.getContractById(contractId);

    console.log("GET CONTRACT DETAIL RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  async getContractByProposalId(proposalId) {
    if (!proposalId || proposalId === "undefined" || proposalId === "null") {
      throw new Error("Invalid proposal id.");
    }

    const response = await contractApi.getContractByProposalId(proposalId);

    console.log("GET CONTRACT BY PROPOSAL RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  async confirmContract(contractId) {
    if (!contractId || contractId === "undefined" || contractId === "null") {
      throw new Error("Invalid contract id.");
    }

    const response = await contractApi.confirmContract(contractId);

    console.log("CONFIRM CONTRACT RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  async cancelContract(contractId, reason) {
    const response = await contractApi.cancelContract(contractId, {
      reason: trim(reason),
    });

    console.log("CANCEL CONTRACT RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },
};

export default contractService;