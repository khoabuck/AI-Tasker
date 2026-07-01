import adminAiManagementApi from "../api/adminAiManagement.api";

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;
  if (data?.data) return data.data;
  if (data?.result) return data.result;
  if (data?.item) return data.item;

  return data;
};

const unwrapList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;

  return [];
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "true") return true;
  if (normalized === "false") return false;

  return fallback;
};

const adminAiManagementService = {
  async getSettings() {
    const response = await adminAiManagementApi.getSettings();
    return unwrapData(response);
  },

  async updateSettings(form = {}) {
    const payload = {
      model: String(form.model || "").trim(),
      isEnabled: toBoolean(form.isEnabled, true),
      jobAssistantMaxTokens: toNumber(form.jobAssistantMaxTokens),
      expertSkillMaxTokens: toNumber(form.expertSkillMaxTokens),
      profileReviewMaxTokens: toNumber(form.profileReviewMaxTokens),
      skillValidatorMaxTokens: toNumber(form.skillValidatorMaxTokens),
      temperature: toNumber(form.temperature),
      jsonObjectResponse: toBoolean(form.jsonObjectResponse, true),
      monthlyTokenLimit: toNumber(form.monthlyTokenLimit),
      monthlyRequestLimit: toNumber(form.monthlyRequestLimit),
      dailyRequestLimitPerUser: toNumber(form.dailyRequestLimitPerUser),
      reason: String(form.reason || "").trim(),
    };

    const response = await adminAiManagementApi.updateSettings(payload);
    return unwrapData(response);
  },

  async getModels() {
    const response = await adminAiManagementApi.getModels();
    return unwrapList(response);
  },

  async createModel(form = {}) {
    const payload = {
      model: String(form.model || "").trim(),
      displayName: String(form.displayName || "").trim(),
      isEnabled: toBoolean(form.isEnabled, true),
      supportsJsonObjectResponse: toBoolean(
        form.supportsJsonObjectResponse,
        true
      ),
      maxOutputTokens: toNumber(form.maxOutputTokens),
      notes: String(form.notes || "").trim(),
      reason: String(form.reason || "").trim(),
    };

    const response = await adminAiManagementApi.createModel(payload);
    return unwrapData(response);
  },

  async updateModel(aiAllowedModelId, form = {}) {
    const payload = {
      displayName: String(form.displayName || "").trim(),
      isEnabled: toBoolean(form.isEnabled, true),
      supportsJsonObjectResponse: toBoolean(
        form.supportsJsonObjectResponse,
        true
      ),
      maxOutputTokens: toNumber(form.maxOutputTokens),
      notes: String(form.notes || "").trim(),
      reason: String(form.reason || "").trim(),
    };

    const response = await adminAiManagementApi.updateModel(
      aiAllowedModelId,
      payload
    );

    return unwrapData(response);
  },

  async testAi(form = {}) {
    const payload = {
      model: String(form.model || "").trim(),
      message: String(form.message || "").trim(),
      jsonObjectResponse: toBoolean(form.jsonObjectResponse, true),
      maxTokens: toNumber(form.maxTokens),
      temperature: toNumber(form.temperature),
    };

    const response = await adminAiManagementApi.testAi(payload);
    return unwrapData(response);
  },

  async getUsageSummary(days = 30) {
    const response = await adminAiManagementApi.getUsageSummary(days);
    return unwrapData(response);
  },

  async getUsageByFeature(days = 30) {
    const response = await adminAiManagementApi.getUsageByFeature(days);
    return unwrapList(response);
  },

  async getUsageLogs(take = 100, days = 30) {
    const response = await adminAiManagementApi.getUsageLogs(take, days);
    return unwrapList(response);
  },
};

export default adminAiManagementService;