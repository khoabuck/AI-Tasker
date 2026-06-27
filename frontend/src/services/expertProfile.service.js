import axiosInstance from "../api/axiosInstance";

export const CERTIFICATE_TYPES = [
  "COURSE_CERTIFICATE",
  "PROFESSIONAL_CERTIFICATE",
  "BOOTCAMP_CERTIFICATE",
  "DEGREE_CERTIFICATE",
  "AWARD_CERTIFICATE",
  "OTHER",
];

export const CERTIFICATE_TYPE_OPTIONS = [
  {
    label: "Chứng chỉ khóa học",
    value: "COURSE_CERTIFICATE",
  },
  {
    label: "Chứng chỉ nghề nghiệp/chuyên môn",
    value: "PROFESSIONAL_CERTIFICATE",
  },
  {
    label: "Chứng chỉ bootcamp/trung tâm",
    value: "BOOTCAMP_CERTIFICATE",
  },
  {
    label: "Bằng cấp chính quy",
    value: "DEGREE_CERTIFICATE",
  },
  {
    label: "Giải thưởng/thành tích",
    value: "AWARD_CERTIFICATE",
  },
  {
    label: "Khác",
    value: "OTHER",
  },
];

export const CERTIFICATE_STATUS_LABEL = {
  VERIFIED: "Đã xác minh",
  NAME_MISMATCH: "Tên trên chứng chỉ không khớp hồ sơ",
  NEEDS_REVIEW: "Cần kiểm tra thủ công",
  NO_CERTIFICATE: "Chưa cung cấp chứng chỉ",
};

export const EXPERT_PROFILE_REVIEW_STATUS_LABEL = {
  PENDING: "Đang chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  NEEDS_CORRECTION: "Cần chỉnh sửa",
  LOCKED: "Hồ sơ bị khóa",
};

const EXPERT_PROFILE_ERROR_MAP = {
  "Certificate URL is invalid.": "URL chứng chỉ không hợp lệ.",
  "Certificate type is invalid.": "Loại chứng chỉ không hợp lệ.",
  "Duplicate certificate URL in request.": "Bạn đã nhập trùng URL chứng chỉ.",
  "This certificate URL is already used by another expert.":
    "Chứng chỉ này đã được sử dụng bởi Expert khác.",
  "Portfolio URL is invalid.": "Portfolio URL không hợp lệ.",
  "GitHub URL is invalid.": "GitHub URL không hợp lệ.",
  "LinkedIn URL is invalid.": "LinkedIn URL không hợp lệ.",
  "Phone number already exists.": "Số điện thoại này đã được sử dụng.",
  "Business email already exists.": "Email doanh nghiệp này đã được sử dụng.",
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
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
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
      ?.label || "Khác"
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
    ? raw.certificates.map(normalizeCertificate)
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
      raw.profileScoreText ||
      buildProfileScoreText(profileScore, profileScoreMax),

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
    avatarUrl: nullableString(formData.avatarUrl),
    professionalTitle: trimString(formData.professionalTitle),
    bio: trimString(formData.bio),
    skills: Array.isArray(formData.skills)
      ? formData.skills.map((item) => trimString(item)).filter(Boolean).join(", ")
      : trimString(formData.skills),
    yearsOfExperience: numberOrZero(formData.yearsOfExperience),
    availableForWork: booleanValue(formData.availableForWork),
  };
}

export function buildVerificationExpertProfilePayload(formData = {}) {
  return {
    portfolioUrl: trimString(formData.portfolioUrl),
    linkedInUrl: trimString(formData.linkedInUrl ?? formData.linkedinUrl),
    gitHubUrl: trimString(formData.gitHubUrl ?? formData.githubUrl),
    certificates: normalizeCertificatesForPayload(formData.certificates),
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
        "Vui lòng nhập URL chứng chỉ hoặc xóa dòng chứng chỉ này.";
      return;
    }

    if (!isValidUrl(url)) {
      errors[`certificates.${index}.certificateUrl`] =
        "URL chứng chỉ không hợp lệ.";
    }

    if (!type) {
      errors[`certificates.${index}.certificateType`] =
        "Vui lòng chọn loại chứng chỉ.";
    } else if (!CERTIFICATE_TYPES.includes(type.toUpperCase())) {
      errors[`certificates.${index}.certificateType`] =
        "Loại chứng chỉ không hợp lệ.";
    }

    const normalizedUrl = url.toLowerCase();

    if (usedUrls.has(normalizedUrl)) {
      errors[`certificates.${index}.certificateUrl`] =
        "Bạn đã nhập trùng URL chứng chỉ.";
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
  fallback = "Không thể xử lý hồ sơ Expert. Vui lòng thử lại."
) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (status === 403) {
    return "Tài khoản của bạn không có quyền thực hiện thao tác này.";
  }

  if (status === 404) {
    return "Không tìm thấy hồ sơ Expert.";
  }

  if (status === 409) {
    return mapKnownErrorMessage(data) || "Dữ liệu bị trùng. Vui lòng kiểm tra lại.";
  }

  if (status === 400) {
    return (
      extractValidationMessage(data) ||
      mapKnownErrorMessage(data) ||
      "Thông tin hồ sơ chưa hợp lệ. Vui lòng kiểm tra lại."
    );
  }

  return (
    mapKnownErrorMessage(data) ||
    error?.message ||
    fallback
  );
}

function mapKnownErrorMessage(data) {
  if (!data) return "";

  if (typeof data === "string") {
    return EXPERT_PROFILE_ERROR_MAP[data] || cleanupBackendMessage(data);
  }

  const messages = [
    data.message,
    data.title,
    data.error,
    data.detail,
  ].filter(Boolean);

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
    avatarUrl: "Ảnh đại diện",
    AvatarUrl: "Ảnh đại diện",

    professionalTitle: "Chức danh chuyên môn",
    ProfessionalTitle: "Chức danh chuyên môn",

    bio: "Giới thiệu",
    Bio: "Giới thiệu",

    skills: "Kỹ năng",
    Skills: "Kỹ năng",

    yearsOfExperience: "Số năm kinh nghiệm",
    YearsOfExperience: "Số năm kinh nghiệm",

    portfolioUrl: "Portfolio",
    PortfolioUrl: "Portfolio",

    linkedInUrl: "LinkedIn",
    LinkedInUrl: "LinkedIn",
    linkedinUrl: "LinkedIn",

    gitHubUrl: "GitHub",
    GitHubUrl: "GitHub",
    githubUrl: "GitHub",

    certificates: "Chứng chỉ",
    Certificates: "Chứng chỉ",

    certificateUrl: "URL chứng chỉ",
    CertificateUrl: "URL chứng chỉ",

    certificateType: "Loại chứng chỉ",
    CertificateType: "Loại chứng chỉ",
  };

  const messages = [];

  Object.entries(data.errors).forEach(([field, value]) => {
    const label = fieldLabels[field] || toReadableLabel(field);
    const rawMessage = Array.isArray(value)
      ? value.join(" ")
      : String(value || "");

    const message =
      EXPERT_PROFILE_ERROR_MAP[rawMessage] || cleanupBackendMessage(rawMessage);

    if (message) {
      messages.push(`${label}: ${message}`);
    }
  });

  return messages.slice(0, 3).join(" ");
}

function cleanupBackendMessage(message) {
  const text = String(message || "").trim();
  if (!text) return "";

  if (EXPERT_PROFILE_ERROR_MAP[text]) {
    return EXPERT_PROFILE_ERROR_MAP[text];
  }

  if (
    text.includes("Certificate URL is invalid") ||
    text.includes("certificateUrl") ||
    text.includes("CertificateUrl")
  ) {
    return "URL chứng chỉ không hợp lệ.";
  }

  if (
    text.includes("Certificate type is invalid") ||
    text.includes("certificateType") ||
    text.includes("CertificateType")
  ) {
    return "Loại chứng chỉ không hợp lệ.";
  }

  if (text.includes("Duplicate certificate URL")) {
    return "Bạn đã nhập trùng URL chứng chỉ.";
  }

  if (text.includes("already used by another expert")) {
    return "Chứng chỉ này đã được sử dụng bởi Expert khác.";
  }

  if (text.includes("PortfolioUrl") || text.includes("portfolioUrl")) {
    return "Portfolio URL là bắt buộc hoặc không hợp lệ.";
  }

  if (
    text.includes("GitHubUrl") ||
    text.includes("gitHubUrl") ||
    text.includes("githubUrl")
  ) {
    return "GitHub URL là bắt buộc hoặc không hợp lệ.";
  }

  if (
    text.includes("LinkedInUrl") ||
    text.includes("linkedInUrl") ||
    text.includes("linkedinUrl")
  ) {
    return "LinkedIn là tùy chọn. Bạn có thể để trống hoặc kiểm tra lại URL.";
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
      throwFriendlyError(error, "Không thể tải hồ sơ Expert.");
    }
  },

  async getMyProfile() {
    return this.getMyExpertProfile();
  },

  async getExpertProfileById(expertProfileId) {
    try {
      const response = await axiosInstance.get(
        `/expert-profiles/${expertProfileId}`
      );
      return normalizeExpertProfile(unwrapData(response));
    } catch (error) {
      throwFriendlyError(error, "Không thể tải hồ sơ Expert.");
    }
  },

  async createExpertProfile(formData) {
    try {
      const payload = buildExpertProfilePayload(formData);
      const response = await axiosInstance.post("/expert-profiles", payload);
      return normalizeExpertProfile(unwrapData(response));
    } catch (error) {
      throwFriendlyError(error, "Không thể tạo hồ sơ Expert.");
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
      throwFriendlyError(error, "Không thể gửi lại hồ sơ Expert.");
    }
  },

  async updateExpertProfile(formData) {
    try {
      const payload = buildExpertProfilePayload(formData);
      const response = await axiosInstance.put("/expert-profiles/me", payload);
      return normalizeExpertProfile(unwrapData(response));
    } catch (error) {
      throwFriendlyError(error, "Không thể cập nhật hồ sơ Expert.");
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
      throwFriendlyError(error, "Không thể cập nhật thông tin cơ bản.");
    }
  },

  async updateVerificationExpertProfile(formData) {
    try {
      const payload = buildVerificationExpertProfilePayload(formData);
      const response = await axiosInstance.put(
        "/expert-profiles/me/verification",
        payload
      );
      return normalizeExpertProfile(unwrapData(response));
    } catch (error) {
      throwFriendlyError(error, "Không thể cập nhật thông tin xác minh.");
    }
  },
};

export default expertProfileService;