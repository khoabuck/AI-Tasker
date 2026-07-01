import adminProposalCreditApi from "../api/adminProposalCredit.api";

const getValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

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

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;
  if (data?.data) return data.data;
  if (data?.result) return data.result;
  if (data?.item) return data.item;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.experts)) return data.experts;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.experts)) return data.data.experts;

  return [];
};

export const normalizeAdminProposalCredit = (item) => {
  if (!item) return null;

  const expertProfileId = getValue(
    item.expertProfileId,
    item.ExpertProfileId,
    item.id,
    item.Id
  );

  return {
    expertProfileId,
    id: expertProfileId,
    userId: getValue(item.userId, item.UserId),
    email: getValue(item.email, item.Email, ""),
    fullName: getValue(item.fullName, item.FullName, "Unknown Expert"),
    professionalTitle: getValue(
      item.professionalTitle,
      item.ProfessionalTitle,
      ""
    ),
    profileReviewStatus: getValue(
      item.profileReviewStatus,
      item.ProfileReviewStatus,
      ""
    ),
    availableForWork: toBoolean(
      getValue(item.availableForWork, item.AvailableForWork),
      false
    ),
    freeProposalSubmitUsed: toBoolean(
      getValue(item.freeProposalSubmitUsed, item.FreeProposalSubmitUsed),
      false
    ),
    freeProposalSubmitRemaining: toNumber(
      getValue(
        item.freeProposalSubmitRemaining,
        item.FreeProposalSubmitRemaining,
        0
      )
    ),
    proposalSubmitCredits: toNumber(
      getValue(item.proposalSubmitCredits, item.ProposalSubmitCredits, 0)
    ),
    canSubmitProposal: toBoolean(
      getValue(item.canSubmitProposal, item.CanSubmitProposal),
      false
    ),
    createdAt: getValue(item.createdAt, item.CreatedAt, ""),
    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),
    raw: item,
  };
};

const adminProposalCreditService = {
  async getExpertCredits(filters = {}) {
    const params = {
      search: filters.search || undefined,
      profileReviewStatus:
        filters.profileReviewStatus === "ALL"
          ? undefined
          : filters.profileReviewStatus || undefined,
      availableForWork:
        filters.availableForWork === "ALL"
          ? undefined
          : filters.availableForWork,
    };

    const response = await adminProposalCreditApi.getExpertCredits(params);

    return unwrapListData(response)
      .map(normalizeAdminProposalCredit)
      .filter(Boolean);
  },

  async getExpertCreditById(expertProfileId) {
    const response = await adminProposalCreditApi.getExpertCreditById(
      expertProfileId
    );

    return normalizeAdminProposalCredit(unwrapData(response));
  },

  async adjustCredits(expertProfileId, creditDelta, reason) {
    const response = await adminProposalCreditApi.adjustCredits(expertProfileId, {
      creditDelta: Number(creditDelta),
      reason: String(reason || "").trim(),
    });

    return normalizeAdminProposalCredit(unwrapData(response));
  },

  async setFreeSubmit(expertProfileId, freeProposalSubmitUsed, reason) {
    const response = await adminProposalCreditApi.setFreeSubmit(expertProfileId, {
      freeProposalSubmitUsed: Boolean(freeProposalSubmitUsed),
      reason: String(reason || "").trim(),
    });

    return normalizeAdminProposalCredit(unwrapData(response));
  },
};

export default adminProposalCreditService;