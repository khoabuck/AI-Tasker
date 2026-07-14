import adminProposalCreditPackageApi from "../api/adminProposalCreditPackage.api";

const getValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const unwrapListData = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.packages)) return data.packages;
  return [];
};

const unwrapData = (response) => {
  const data = response?.data;
  if (!data) return null;
  return data?.data || data?.package || data?.proposalCreditPackage || data;
};

export const normalizeAdminProposalCreditPackage = (item) => {
  if (!item) return null;

  const packageId = getValue(
    item.proposalCreditPackageId,
    item.ProposalCreditPackageId,
    item.packageId,
    item.PackageId,
    item.id,
    item.Id
  );

  return {
    packageId,
    id: packageId,
    packageName: getValue(item.packageName, item.PackageName, "Unnamed Package"),
    description: getValue(item.description, item.Description, ""),
    proposalSubmitCredits: toNumber(
      getValue(item.proposalSubmitCredits, item.ProposalSubmitCredits, 0)
    ),
    price: toNumber(getValue(item.price, item.Price, 0)),
    currency: getValue(item.currency, item.Currency, "VND"),
    isActive: Boolean(getValue(item.isActive, item.IsActive, true)),
    displayOrder: toNumber(getValue(item.displayOrder, item.DisplayOrder, 0)),
    createdAt: getValue(item.createdAt, item.CreatedAt, ""),
    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),
    updatedByAdminEmail: getValue(item.updatedByAdminEmail, item.UpdatedByAdminEmail, ""),
    updatedByAdminFullName: getValue(item.updatedByAdminFullName, item.UpdatedByAdminFullName, ""),
    raw: item,
  };
};

const buildPayload = (form) => ({
  packageName: form.packageName.trim(),
  description: form.description.trim(),
  proposalSubmitCredits: Number(form.proposalSubmitCredits),
  price: Number(form.price),
  currency: form.currency.trim().toUpperCase() || "VND",
  isActive: Boolean(form.isActive),
  displayOrder: Number(form.displayOrder || 0),
  reason: form.reason?.trim() || "",
});

const adminProposalCreditPackageService = {
  async getPackages() {
    const response = await adminProposalCreditPackageApi.getPackages();
    return unwrapListData(response)
      .map(normalizeAdminProposalCreditPackage)
      .filter(Boolean);
  },

  async createPackage(form) {
    const response = await adminProposalCreditPackageApi.createPackage(buildPayload(form));
    return normalizeAdminProposalCreditPackage(unwrapData(response));
  },

  async updatePackage(packageId, form) {
    const response = await adminProposalCreditPackageApi.updatePackage(packageId, buildPayload(form));
    return normalizeAdminProposalCreditPackage(unwrapData(response));
  },

  async activatePackage(packageId, reason) {
    const response = await adminProposalCreditPackageApi.activatePackage(packageId, reason);
    return normalizeAdminProposalCreditPackage(unwrapData(response));
  },

  async deactivatePackage(packageId, reason) {
    const response = await adminProposalCreditPackageApi.deactivatePackage(packageId, reason);
    return normalizeAdminProposalCreditPackage(unwrapData(response));
  },
};

export default adminProposalCreditPackageService;