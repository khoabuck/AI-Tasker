import adminJobCreditPackageApi from "../api/adminJobCreditPackage.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const toBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "true") return true;
  if (normalized === "false") return false;

  return fallback;
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.package) return data.data.package;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.package) return data.package;
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
  if (Array.isArray(data?.packages)) return data.packages;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.packages)) return data.data.packages;

  return [];
};

export const normalizeJobCreditPackage = (item) => {
  if (!item) return null;

  const packageId = getValue(
    item.packageId,
    item.PackageId,
    item.jobCreditPackageId,
    item.JobCreditPackageId,
    item.id,
    item.Id
  );

  return {
    packageId,
    id: packageId,

    packageName: getValue(
      item.packageName,
      item.PackageName,
      item.name,
      item.Name,
      "Unnamed Package"
    ),

    description: getValue(item.description, item.Description, ""),

    jobPostCredits: toNumber(
      getValue(item.jobPostCredits, item.JobPostCredits, 0)
    ),

    aiGenerationCredits: toNumber(
      getValue(item.aiGenerationCredits, item.AiGenerationCredits, item.AIGenerationCredits, 0)
    ),

    price: toNumber(getValue(item.price, item.Price, 0)),

    currency: getValue(item.currency, item.Currency, "VND"),

    isActive: toBoolean(
      getValue(item.isActive, item.IsActive, item.active, item.Active),
      true
    ),

    displayOrder: toNumber(
      getValue(item.displayOrder, item.DisplayOrder, 0)
    ),

    createdAt: getValue(item.createdAt, item.CreatedAt, ""),
    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),

    raw: item,
  };
};

const buildPackagePayload = (formData = {}) => {
  return {
    packageName: String(formData.packageName || "").trim(),
    description: String(formData.description || "").trim(),
    jobPostCredits: toNumber(formData.jobPostCredits),
    aiGenerationCredits: toNumber(formData.aiGenerationCredits),
    price: toNumber(formData.price),
    currency: String(formData.currency || "VND").trim(),
    isActive: toBoolean(formData.isActive, true),
    displayOrder: toNumber(formData.displayOrder),
    reason: String(formData.reason || "").trim(),
  };
};

const buildReasonPayload = (reason) => {
  return {
    reason: String(reason || "").trim(),
  };
};

const adminJobCreditPackageService = {
  async getPackages() {
    const response = await adminJobCreditPackageApi.getPackages();

    return unwrapListData(response)
      .map(normalizeJobCreditPackage)
      .filter(Boolean)
      .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
  },

  async getPackageById(packageId) {
    const response = await adminJobCreditPackageApi.getPackageById(packageId);
    return normalizeJobCreditPackage(unwrapData(response));
  },

  async createPackage(formData) {
    const payload = buildPackagePayload(formData);
    const response = await adminJobCreditPackageApi.createPackage(payload);

    return normalizeJobCreditPackage(unwrapData(response));
  },

  async updatePackage(packageId, formData) {
    const payload = buildPackagePayload(formData);
    const response = await adminJobCreditPackageApi.updatePackage(
      packageId,
      payload
    );

    return normalizeJobCreditPackage(unwrapData(response));
  },

  async activatePackage(packageId, reason = "Activate package.") {
    const response = await adminJobCreditPackageApi.activatePackage(
      packageId,
      buildReasonPayload(reason)
    );

    return normalizeJobCreditPackage(unwrapData(response));
  },

  async deactivatePackage(packageId, reason = "Deactivate package.") {
    const response = await adminJobCreditPackageApi.deactivatePackage(
      packageId,
      buildReasonPayload(reason)
    );

    return normalizeJobCreditPackage(unwrapData(response));
  },
};

export default adminJobCreditPackageService;