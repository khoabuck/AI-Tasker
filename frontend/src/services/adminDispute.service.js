import adminDisputeApi from "../api/adminDispute.api";

const unwrapData = (response) => {
  if (response?.data?.data !== undefined) return response.data.data;
  if (response?.data?.result !== undefined) return response.data.result;
  return response?.data;
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.result)) return value.result;
  return [];
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
};

const trim = (value) => String(value || "").trim();

const normalizeResolutionType = (value) => {
  const type = String(value || "").trim().toUpperCase();

  if (type === "RELEASE_TO_EXPERT") return "RELEASE_TO_EXPERT";
  if (type === "REFUND_TO_CLIENT") return "REFUND_TO_CLIENT";
  if (type === "PARTIAL_SPLIT") return "PARTIAL_SPLIT";

  return "RELEASE_TO_EXPERT";
};

const buildResolvePayload = (formData) => {
  const resolutionType = normalizeResolutionType(formData.resolutionType);
  const disputedAmount = toNumber(formData.disputedAmount);

  let expertAmount = toNumber(formData.expertAmount);
  let clientAmount = toNumber(formData.clientAmount);

  if (resolutionType === "RELEASE_TO_EXPERT") {
    expertAmount = disputedAmount;
    clientAmount = 0;
  }

  if (resolutionType === "REFUND_TO_CLIENT") {
    expertAmount = 0;
    clientAmount = disputedAmount;
  }

  return {
    resolutionType,
    expertAmount,
    clientAmount,
    adminDecision: trim(formData.adminDecision),
  };
};

const adminDisputeService = {
  async getAllDisputes() {
    const response = await adminDisputeApi.getAllDisputes();
    return normalizeArray(unwrapData(response));
  },

  async getDisputeById(disputeId) {
    const response = await adminDisputeApi.getDisputeById(disputeId);
    return unwrapData(response);
  },

  async resolveDispute(disputeId, formData) {
    const payload = buildResolvePayload(formData);
    const response = await adminDisputeApi.resolveDispute(disputeId, payload);
    return unwrapData(response);
  },
};

export default adminDisputeService;