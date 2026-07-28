import axiosInstance from "../api/axiosInstance";

import { compareDateDesc } from "../utils/dateTime.utils";
export const CERTIFICATE_TYPES = [
  "COURSE_CERTIFICATE",
  "PROFESSIONAL_CERTIFICATE",
  "BOOTCAMP_CERTIFICATE",
  "DEGREE_CERTIFICATE",
  "AWARD_CERTIFICATE",
  "OTHER",
];

export const CERTIFICATE_TYPE_OPTIONS = [
  { label: "Course Certificate", value: "COURSE_CERTIFICATE" },
  { label: "Professional Certificate", value: "PROFESSIONAL_CERTIFICATE" },
  { label: "Bootcamp Certificate", value: "BOOTCAMP_CERTIFICATE" },
  { label: "Degree Certificate", value: "DEGREE_CERTIFICATE" },
  { label: "Award / Achievement", value: "AWARD_CERTIFICATE" },
  { label: "Other", value: "OTHER" },
];

export const CERTIFICATE_STATUS_LABEL = {
  VERIFIED: "Verified",
  NAME_MISMATCH: "Certificate holder name does not match profile name",
  NEEDS_REVIEW: "Needs manual review",
  NO_CERTIFICATE: "No certificate provided",
};

export const EXPERT_PROFILE_REVIEW_STATUS_LABEL = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  NEEDS_CORRECTION: "Needs Correction",
  LOCKED: "Profile Locked",
};

const EXPERT_PROFILE_ERROR_MAP = {
  "Full name is required.": "Full name is required.",
  "Certificate URL is invalid.": "Certificate URL is invalid.",
  "Certificate type is invalid.": "Certificate type is invalid.",
  "Duplicate certificate URL in request.":
    "You entered a duplicate certificate URL.",
  "This certificate URL is already used by another expert.":
    "This certificate URL is already used by another expert.",
  "Portfolio URL is invalid.": "Portfolio URL is invalid.",
  "GitHub URL is invalid.": "GitHub URL is invalid.",
  "LinkedIn URL is invalid.": "LinkedIn URL is invalid.",
  "Phone number already exists.": "This phone number is already used.",
  "Business email already exists.": "This business email is already used.",
};

function unwrapData(response) {
  const payload = response?.data ?? response;

  if (payload?.data !== undefined) return payload.data;
  if (payload?.result !== undefined) return payload.result;
  if (payload?.profile !== undefined) return payload.profile;
  if (payload?.expertProfile !== undefined) return payload.expertProfile;

  return payload;
}

function trimString(value) {
  return String(value ?? "").trim();
}

function nullableString(value) {
  const text = trimString(value);
  return text || null;
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function booleanValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function normalizeCertificateType(value) {
  const type = trimString(value || "OTHER").toUpperCase();
  return CERTIFICATE_TYPES.includes(type) ? type : "OTHER";
}

function getCertificateTypeLabel(type) {
  const normalizedType = normalizeCertificateType(type);
  return (
    CERTIFICATE_TYPE_OPTIONS.find((item) => item.value === normalizedType)
      ?.label || "Other"
  );
}

function normalizeUrl(value) {
  return trimString(value);
}

function normalizeCertificatesForPayload(certificates) {
  if (!Array.isArray(certificates)) return [];

  return certificates
    .map((certificate) => ({
      certificateUrl: normalizeUrl(certificate?.certificateUrl),
      certificateType: normalizeCertificateType(certificate?.certificateType),
    }))
    .filter((certificate) => certificate.certificateUrl.length > 0);
}

function normalizeCertificate(certificate = {}) {
  const certificateType = normalizeCertificateType(
    certificate.certificateType || certificate.type
  );

  const verificationStatus =
    certificate.verificationStatus ||
    certificate.status ||
    certificate.certificateVerificationStatus ||
    "NO_CERTIFICATE";

  return {
    id:
      certificate.id ??
      certificate.certificateId ??
      certificate.expertCertificateId ??
      null,

    certificateId:
      certificate.certificateId ??
      certificate.id ??
      certificate.expertCertificateId ??
      null,

    expertCertificateId:
      certificate.expertCertificateId ??
      certificate.certificateId ??
      certificate.id ??
      null,

    certificateUrl: certificate.certificateUrl || certificate.url || "",
    certificateType,
    certificateTypeLabel: getCertificateTypeLabel(certificateType),

    verificationStatus,
    verificationStatusLabel:
      CERTIFICATE_STATUS_LABEL[verificationStatus] || verificationStatus,

    verificationNote:
      certificate.verificationNote ||
      certificate.note ||
      certificate.reviewNote ||
      "",

    verificationScore: numberOrZero(
      certificate.verificationScore ?? certificate.score ?? 0
    ),

    detectedHolderName:
      certificate.detectedHolderName ||
      certificate.holderName ||
      certificate.detectedName ||
      "",

    detectedCertificateName:
      certificate.detectedCertificateName ||
      certificate.certificateName ||
      certificate.name ||
      "",

    detectedIssuer:
      certificate.detectedIssuer ||
      certificate.certificateIssuer ||
      certificate.issuer ||
      "",

    detectedIssuedDateText:
      certificate.detectedIssuedDateText ||
      certificate.issuedAt ||
      certificate.issuedDate ||
      "",

    checkedAt: certificate.checkedAt || certificate.verifiedAt || null,

    createdAt: certificate.createdAt || null,
    updatedAt: certificate.updatedAt || null,
  };
}

function normalizeScoreItem(key, value) {
  if (value === null || value === undefined) {
    return {
      key,
      label: toReadableLabel(key),
      score: 0,
      maxScore: 0,
      note: "",
      passed: false,
    };
  }

  if (typeof value === "number") {
    return {
      key,
      label: toReadableLabel(key),
      score: value,
      maxScore: 0,
      note: "",
      passed: false,
    };
  }

  return {
    key,
    label: value.label || value.name || toReadableLabel(key),
    score: numberOrZero(value.score ?? value.value ?? 0),
    maxScore: numberOrZero(value.maxScore ?? value.max ?? 0),
    note: value.note || value.description || value.reason || "",
    passed: Boolean(value.passed ?? value.isPassed ?? false),
  };
}

function normalizeScoreBreakdown(scoreBreakdown) {
  if (!scoreBreakdown || typeof scoreBreakdown !== "object") return {};

  return Object.entries(scoreBreakdown).reduce((result, [key, value]) => {
    result[key] = normalizeScoreItem(key, value);
    return result;
  }, {});
}

function toReadableLabel(value) {
  return String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

export function normalizeExpertProfile(profile = {}) {
  const raw = unwrapData(profile) || {};

  const linkedInUrl =
    raw.linkedInUrl ??
    raw.linkedinUrl ??
    raw.linkedInProfileUrl ??
    raw.linkedinProfileUrl ??
    "";

  const gitHubUrl =
    raw.gitHubUrl ??
    raw.githubUrl ??
    raw.gitHubProfileUrl ??
    raw.githubProfileUrl ??
    "";

  const certificates = Array.isArray(raw.certificates)
    ? raw.certificates
        .map(normalizeCertificate)
        .sort((a, b) =>
          compareDateDesc(
            a.checkedAt || a.updatedAt || a.createdAt,
            b.checkedAt || b.updatedAt || b.createdAt
          )
        )
    : [];

  const profileReviewStatus =
    raw.profileReviewStatus ||
    raw.reviewStatus ||
    raw.status ||
    raw.verificationStatus ||
    "PENDING";

  const profileScore = numberOrZero(raw.profileScore ?? raw.score ?? 0);
  const profileScoreMax = numberOrZero(
    raw.profileScoreMax ?? raw.maxScore ?? raw.scoreMax ?? 0
  );
  const profilePassScore = numberOrZero(
    raw.profilePassScore ?? raw.passScore ?? raw.requiredScore ?? 0
  );

  return {
    id: raw.id ?? raw.expertProfileId ?? null,
    expertProfileId: raw.expertProfileId ?? raw.id ?? null,
    userId: raw.userId ?? raw.accountId ?? null,

    expertCategory: raw.expertCategory || raw.ExpertCategory || raw.category || raw.Category || "",
level: raw.level || raw.Level || raw.expertLevel || raw.ExpertLevel || "",

    fullName: raw.fullName || raw.userFullName || raw.name || "",
    email: raw.email || raw.userEmail || "",
    phoneNumber: raw.phoneNumber || raw.phone || "",

    avatarUrl: raw.avatarUrl || raw.profileImageUrl || "",
    professionalTitle: raw.professionalTitle || raw.title || "",
    bio: raw.bio || raw.description || "",
    skills: raw.skills || "",
    yearsOfExperience: numberOrZero(raw.yearsOfExperience),
    availableForWork: booleanValue(raw.availableForWork),

    portfolioUrl: raw.portfolioUrl || "",
    linkedInUrl,
    linkedinUrl: linkedInUrl,
    gitHubUrl,
    githubUrl: gitHubUrl,

    certificates,

    status: raw.status || profileReviewStatus,
    profileReviewStatus,
    profileReviewStatusLabel:
      EXPERT_PROFILE_REVIEW_STATUS_LABEL[profileReviewStatus] ||
      profileReviewStatus,

    profileScore,
    profileScoreMax,
    profilePassScore,
    profileScoreText:
      raw.profileScoreText || buildProfileScoreText(profileScore, profileScoreMax),

    scoreBreakdown: normalizeScoreBreakdown(raw.scoreBreakdown),

    reviewAttempts: numberOrZero(raw.reviewAttempts),
    maxReviewAttempts: numberOrZero(raw.maxReviewAttempts),
    remainingReviewAttempts: numberOrZero(raw.remainingReviewAttempts),

    rejectionReason: raw.rejectionReason || raw.rejectReason || "",
    correctionNote:
      raw.correctionNote ||
      raw.reviewNote ||
      raw.verificationNote ||
      raw.adminNote ||
      "",
    lockedReason: raw.lockedReason || "",

    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    submittedAt: raw.submittedAt || null,
    reviewedAt: raw.reviewedAt || null,

    raw,
  };
}

function buildProfileScoreText(score, maxScore) {
  if (!maxScore) return `${score}`;
  return `${score}/${maxScore}`;
}

export function buildExpertProfilePayload(formData = {}) {
  const certificates = normalizeCertificatesForPayload(formData.certificates);

  return {
    fullName: trimString(formData.fullName),

    avatarUrl: nullableString(formData.avatarUrl),
    professionalTitle: trimString(formData.professionalTitle),
    bio: trimString(formData.bio),
    skills: Array.isArray(formData.skills)
      ? formData.skills.map((item) => trimString(item)).filter(Boolean).join(", ")
      : trimString(formData.skills),
    yearsOfExperience: numberOrZero(formData.yearsOfExperience),
    availableForWork: booleanValue(formData.availableForWork),

    portfolioUrl: trimString(formData.portfolioUrl),
    linkedInUrl: trimString(formData.linkedInUrl ?? formData.linkedinUrl),
    gitHubUrl: trimString(formData.gitHubUrl ?? formData.githubUrl),

    certificates,
  };
}

export function buildBasicExpertProfilePayload(formData = {}) {
  return {
    fullName: trimString(formData.fullName),

    avatarUrl: nullableString(formData.avatarUrl),

    professionalTitle: trimString(formData.professionalTitle),

    bio: trimString(formData.bio),

    availableForWork: booleanValue(formData.availableForWork),
  };
}

export function buildVerificationExpertProfilePayload(formData = {}) {
  return {
    skills: Array.isArray(formData.skills)
      ? formData.skills
          .map((item) => trimString(item))
          .filter(Boolean)
          .join(", ")
      : trimString(formData.skills),

    portfolioUrl: nullableString(formData.portfolioUrl),

    linkedInUrl: nullableString(
      formData.linkedInUrl ?? formData.linkedinUrl
    ),

    gitHubUrl: nullableString(
      formData.gitHubUrl ?? formData.githubUrl
    ),

    certificates: normalizeCertificatesForPayload(
      formData.certificates
    ),
  };
}

export function hasDuplicateCertificateUrls(certificates = []) {
  const urls = normalizeCertificatesForPayload(certificates).map((item) =>
    item.certificateUrl.toLowerCase()
  );

  return new Set(urls).size !== urls.length;
}

export function validateCertificatePayload(certificates = []) {
  const errors = {};

  if (!Array.isArray(certificates)) return errors;

  const usedUrls = new Set();

  certificates.forEach((certificate, index) => {
    const url = trimString(certificate?.certificateUrl);
    const type = trimString(certificate?.certificateType);

    if (!url && !type) return;

    if (!url) {
      errors[`certificates.${index}.certificateUrl`] =
        "Please enter a certificate URL or remove this certificate row.";
      return;
    }

    if (!isValidUrl(url)) {
      errors[`certificates.${index}.certificateUrl`] =
        "Certificate URL is invalid.";
    }

    if (!type) {
      errors[`certificates.${index}.certificateType`] =
        "Please select a certificate type.";
    } else if (!CERTIFICATE_TYPES.includes(type.toUpperCase())) {
      errors[`certificates.${index}.certificateType`] =
        "Certificate type is invalid.";
    }

    const normalizedUrl = url.toLowerCase();

    if (usedUrls.has(normalizedUrl)) {
      errors[`certificates.${index}.certificateUrl`] =
        "You entered a duplicate certificate URL.";
    }

    usedUrls.add(normalizedUrl);
  });

  return errors;
}

function isValidUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getFriendlyExpertProfileError(
  error,
  fallback = "Unable to process expert profile. Please try again."
) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "Your account does not have permission to perform this action.";
  }

  if (status === 404) {
    return "Expert profile was not found.";
  }

  if (status === 409) {
    return mapKnownErrorMessage(data) || "Duplicate data found. Please check again.";
  }

  if (status === 400) {
    return (
      extractValidationMessage(data) ||
      mapKnownErrorMessage(data) ||
      "Your profile information is invalid. Please check again."
    );
  }

  return mapKnownErrorMessage(data) || error?.message || fallback;
}

function mapKnownErrorMessage(data) {
  if (!data) return "";

  if (typeof data === "string") {
    return EXPERT_PROFILE_ERROR_MAP[data] || cleanupBackendMessage(data);
  }

  const messages = [data.message, data.title, data.error, data.detail].filter(
    Boolean
  );

  for (const message of messages) {
    const mapped = EXPERT_PROFILE_ERROR_MAP[message];
    if (mapped) return mapped;

    const cleaned = cleanupBackendMessage(message);
    if (cleaned) return cleaned;
  }

  return "";
}

function extractValidationMessage(data) {
  if (!data?.errors || typeof data.errors !== "object") return "";

  const fieldLabels = {
    fullName: "Full Name",
    FullName: "Full Name",

    avatarUrl: "Avatar",
    AvatarUrl: "Avatar",

    professionalTitle: "Professional Title",
    ProfessionalTitle: "Professional Title",

    bio: "Bio",
    Bio: "Bio",

    skills: "Skills",
    Skills: "Skills",

    yearsOfExperience: "Years of Experience",
    YearsOfExperience: "Years of Experience",

    portfolioUrl: "Portfolio",
    PortfolioUrl: "Portfolio",

    linkedInUrl: "LinkedIn",
    LinkedInUrl: "LinkedIn",
    linkedinUrl: "LinkedIn",

    gitHubUrl: "GitHub",
    GitHubUrl: "GitHub",
    githubUrl: "GitHub",

    certificates: "Certificates",
    Certificates: "Certificates",

    certificateUrl: "Certificate URL",
    CertificateUrl: "Certificate URL",

    certificateType: "Certificate Type",
    CertificateType: "Certificate Type",
  };

  const messages = [];

  Object.entries(data.errors).forEach(([field, value]) => {
    const label = fieldLabels[field] || toReadableLabel(field);
    const rawMessage = Array.isArray(value)
      ? value.join(" ")
      : String(value || "");

    const message =
      EXPERT_PROFILE_ERROR_MAP[rawMessage] || cleanupBackendMessage(rawMessage);

    if (message) messages.push(`${label}: ${message}`);
  });

  return messages.slice(0, 3).join(" ");
}

function cleanupBackendMessage(message) {
  const text = String(message || "").trim();
  if (!text) return "";

  if (EXPERT_PROFILE_ERROR_MAP[text]) return EXPERT_PROFILE_ERROR_MAP[text];

  if (text.includes("FullName") || text.includes("fullName")) {
    return "Full name is required.";
  }

  if (
    text.includes("Certificate URL is invalid") ||
    text.includes("certificateUrl") ||
    text.includes("CertificateUrl")
  ) {
    return "Certificate URL is invalid.";
  }

  if (
    text.includes("Certificate type is invalid") ||
    text.includes("certificateType") ||
    text.includes("CertificateType")
  ) {
    return "Certificate type is invalid.";
  }

  if (text.includes("Duplicate certificate URL")) {
    return "You entered a duplicate certificate URL.";
  }

  if (text.includes("already used by another expert")) {
    return "This certificate URL is already used by another expert.";
  }

  if (text.includes("PortfolioUrl") || text.includes("portfolioUrl")) {
    return "Portfolio URL is required or invalid.";
  }

  if (
    text.includes("GitHubUrl") ||
    text.includes("gitHubUrl") ||
    text.includes("githubUrl")
  ) {
    return "GitHub URL is required or invalid.";
  }

  if (
    text.includes("LinkedInUrl") ||
    text.includes("linkedInUrl") ||
    text.includes("linkedinUrl")
  ) {
    return "LinkedIn is optional. You can leave it empty or check the URL again.";
  }

  return text;
}

function throwFriendlyError(error, fallback) {
  const friendlyError = new Error(getFriendlyExpertProfileError(error, fallback));
  friendlyError.originalError = error;
  friendlyError.status = error?.response?.status;
  friendlyError.response = error?.response;
  throw friendlyError;
}

const expertProfileService = {
  CERTIFICATE_TYPES,
  CERTIFICATE_TYPE_OPTIONS,
  CERTIFICATE_STATUS_LABEL,
  EXPERT_PROFILE_REVIEW_STATUS_LABEL,

  normalizeExpertProfile,
  buildExpertProfilePayload,
  buildBasicExpertProfilePayload,
  buildVerificationExpertProfilePayload,
  validateCertificatePayload,
  hasDuplicateCertificateUrls,
  getFriendlyExpertProfileError,

  async getMyExpertProfile() {
    try {
      const response = await axiosInstance.get("/expert-profiles/me");
      return normalizeExpertProfile(unwrapData(response));
    } catch (error) {
      throwFriendlyError(error, "Unable to load expert profile.");
    }
  },

  async getMyProfile() {
    return this.getMyExpertProfile();
  },

  async getExpertProfileById(expertProfileId) {
    try {
      const response = await axiosInstance.get(
        `/experts/${expertProfileId}`
      );
      return normalizeExpertProfile(unwrapData(response));
    } catch (error) {
      throwFriendlyError(error, "Unable to load expert profile.");
    }
  },

  async createExpertProfile(formData) {
    try {
      const payload = buildExpertProfilePayload(formData);
      const response = await axiosInstance.post("/expert-profiles", payload);
      return normalizeExpertProfile(unwrapData(response));
    } catch (error) {
      throwFriendlyError(error, "Unable to create expert profile.");
    }
  },

  async resubmitExpertProfile(formData) {
    try {
      const payload = buildExpertProfilePayload(formData);
      const response = await axiosInstance.put(
        "/expert-profiles/resubmit",
        payload
      );
      return normalizeExpertProfile(unwrapData(response));
    } catch (error) {
      throwFriendlyError(error, "Unable to resubmit expert profile.");
    }
  },

  async updateExpertProfile(formData) {
    try {
      const payload = buildExpertProfilePayload(formData);
      const response = await axiosInstance.put("/expert-profiles/me", payload);
      return normalizeExpertProfile(unwrapData(response));
    } catch (error) {
      throwFriendlyError(error, "Unable to update expert profile.");
    }
  },

  async updateMyExpertProfile(formData) {
    return this.updateExpertProfile(formData);
  },

  async updateBasicExpertProfile(formData) {
    try {
      const payload = buildBasicExpertProfilePayload(formData);
      const response = await axiosInstance.put(
        "/expert-profiles/me/basic",
        payload
      );
      return normalizeExpertProfile(unwrapData(response));
    } catch (error) {
      throwFriendlyError(error, "Unable to update basic information.");
    }
  },

async updateVerificationExpertProfile(formData) {
  try {
    const payload = buildVerificationExpertProfilePayload(formData);

    const response = await axiosInstance.put(
      "/expert-profiles/me/verification",
      payload
    );

    // Backend trả review result chứ không phải ExpertProfile
    return unwrapData(response);
  } catch (error) {
    throwFriendlyError(
      error,
      "Unable to update verification information."
    );
  }
},
};

export default expertProfileService;