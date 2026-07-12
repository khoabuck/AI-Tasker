import adminProposalCreditApi from "../api/adminProposalCredit.api";
import { compareDateDesc } from "../utils/dateTime.utils";

const getValue = (...values) =>
  values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;

  return fallback;
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

  if (data?.data?.expert) return data.data.expert;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data !== undefined) return data.data;

  if (data?.expert) return data.expert;
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

    userId: getValue(item.userId, item.UserId, null),
    email: getValue(item.email, item.Email, ""),

    fullName: getValue(
      item.fullName,
      item.FullName,
      "Unknown Expert"
    ),

    professionalTitle: getValue(
      item.professionalTitle,
      item.ProfessionalTitle,
      ""
    ),

    profileReviewStatus: String(
      getValue(
        item.profileReviewStatus,
        item.ProfileReviewStatus,
        ""
      )
    )
      .trim()
      .toUpperCase(),

    availableForWork: toBoolean(
      getValue(item.availableForWork, item.AvailableForWork),
      false
    ),

    freeProposalSubmitUsed: toBoolean(
      getValue(
        item.freeProposalSubmitUsed,
        item.FreeProposalSubmitUsed
      ),
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
      getValue(
        item.proposalSubmitCredits,
        item.ProposalSubmitCredits,
        0
      )
    ),

    canSubmitProposal: toBoolean(
      getValue(
        item.canSubmitProposal,
        item.CanSubmitProposal
      ),
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
      .filter(Boolean)
      .sort((a, b) =>
        compareDateDesc(
          a.updatedAt || a.createdAt,
          b.updatedAt || b.createdAt
        )
      );
  },

  async getExpertCreditById(expertProfileId) {
    if (isInvalidId(expertProfileId)) {
      throw new Error("Invalid expert profile id.");
    }

    const response =
      await adminProposalCreditApi.getExpertCreditById(expertProfileId);

    return normalizeAdminProposalCredit(unwrapData(response));
  },

  async adjustCredits(expertProfileId, creditDelta, reason) {
    if (isInvalidId(expertProfileId)) {
      throw new Error("Invalid expert profile id.");
    }

    const delta = Number(creditDelta);
    const normalizedReason = String(reason || "").trim();

    if (!Number.isInteger(delta) || delta === 0) {
      throw new Error("Credit adjustment must be a non-zero whole number.");
    }

    if (!normalizedReason) {
      throw new Error("Adjustment reason is required.");
    }

    const response = await adminProposalCreditApi.adjustCredits(
      expertProfileId,
      {
        creditDelta: delta,
        reason: normalizedReason,
      }
    );

    return normalizeAdminProposalCredit(unwrapData(response));
  },
};

export default adminProposalCreditService;
