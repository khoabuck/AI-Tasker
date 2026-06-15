import contractApi from "../api/contract.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
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

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [];
};

const normalizeContract = (contract) => {
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

  const status = String(
    getValue(contract.status, contract.Status, "DRAFT")
  )
    .trim()
    .toUpperCase();

  return {
    contractId,
    id: contractId,

    proposalId,
    projectId,

    jobId: getValue(
      contract.jobId,
      contract.JobId,
      contract.jobPostingId,
      contract.JobPostingId,
      contract.job?.jobId,
      contract.Job?.JobId,
      null
    ),

    jobTitle: getValue(
      contract.jobTitle,
      contract.JobTitle,
      contract.title,
      contract.Title,
      contract.job?.title,
      contract.Job?.Title,
      "Untitled Contract"
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

    agreedPrice: Number(
      getValue(
        contract.agreedPrice,
        contract.AgreedPrice,
        contract.totalAmount,
        contract.TotalAmount,
        contract.contractValue,
        contract.ContractValue,
        contract.price,
        contract.Price,
        0
      )
    ),

    agreedTimelineDays: Number(
      getValue(
        contract.agreedTimelineDays,
        contract.AgreedTimelineDays,
        contract.timelineDays,
        contract.TimelineDays,
        contract.durationDays,
        contract.DurationDays,
        0
      )
    ),

    scopeOfWork: getValue(
      contract.scopeOfWork,
      contract.ScopeOfWork,
      contract.description,
      contract.Description,
      contract.terms,
      contract.Terms,
      ""
    ),

    paymentTerms: getValue(
      contract.paymentTerms,
      contract.PaymentTerms,
      ""
    ),

    contractTerms: getValue(
      contract.contractTerms,
      contract.ContractTerms,
      contract.terms,
      contract.Terms,
      ""
    ),

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

    milestones: toArray(
      getValue(contract.milestones, contract.Milestones, [])
    ),

    raw: contract,
  };
};

const contractService = {
  async createContractFromProposal(proposalId) {
    const response = await contractApi.createContractFromProposal(proposalId);

    console.log("CREATE CONTRACT FROM PROPOSAL RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
  },

  async createDraftContract(payload) {
    const response = await contractApi.createDraftContract(payload);

    console.log("CREATE DRAFT CONTRACT RESPONSE:", response?.data);

    return normalizeContract(unwrapData(response));
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
};

export default contractService;