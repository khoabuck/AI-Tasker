import adminPolicyApi from "../api/adminPolicy.api";

const getValue = (...values) => {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isNaN(number)
    ? fallback
    : number;
};

const toBoolean = (value, fallback = false) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  if (
    ["true", "1", "yes", "enabled", "active"].includes(
      normalized
    )
  ) {
    return true;
  }

  if (
    ["false", "0", "no", "disabled", "inactive"].includes(
      normalized
    )
  ) {
    return false;
  }

  return fallback;
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.policy) {
    return data.data.policy;
  }

  if (data?.data?.item) {
    return data.data.item;
  }

  if (data?.data?.result) {
    return data.data.result;
  }

  if (data?.data !== undefined) {
    return data.data;
  }

  if (data?.policy) {
    return data.policy;
  }

  if (data?.item) {
    return data.item;
  }

  if (data?.result) {
    return data.result;
  }

  return data;
};

// =========================================================
// EXPERT PROFILE SCORING POLICY
// =========================================================

export const normalizeExpertProfileScoringPolicy = (
  policy
) => {
  if (!policy) {
    return {
      policyId: null,

      passThreshold: 0,
      maxReviewSubmissions: 0,
      reviewLockDurationHours: 0,

      profileCompletenessMaxScore: 0,
      aiSkillMaxScore: 0,
      experienceMaxScore: 0,
      portfolioMaxScore: 0,
      gitHubMaxScore: 0,
      linkedInMaxScore: 0,
      certificateMaxScore: 0,

      riskMaxPenalty: 0,
      certificateUnverifiedMaxProfileScore: 0,

      bioMinimumLength: 0,
      skillsMinimumLength: 0,
      maxCertificates: 0,

      reason: "",
      createdAt: "",
      updatedAt: "",

      raw: null,
    };
  }

  return {
    policyId: getValue(
      policy.policyId,
      policy.PolicyId,
      policy.id,
      policy.Id,
      null
    ),

    passThreshold: toNumber(
      getValue(
        policy.passThreshold,
        policy.PassThreshold,
        policy.minimumProfileScore,
        policy.MinimumProfileScore,
        0
      )
    ),

    maxReviewSubmissions: toNumber(
      getValue(
        policy.maxReviewSubmissions,
        policy.MaxReviewSubmissions,
        0
      )
    ),

    reviewLockDurationHours: toNumber(
      getValue(
        policy.reviewLockDurationHours,
        policy.ReviewLockDurationHours,
        0
      )
    ),

    profileCompletenessMaxScore: toNumber(
      getValue(
        policy.profileCompletenessMaxScore,
        policy.ProfileCompletenessMaxScore,
        0
      )
    ),

    aiSkillMaxScore: toNumber(
      getValue(
        policy.aiSkillMaxScore,
        policy.AiSkillMaxScore,
        policy.AISkillMaxScore,
        0
      )
    ),

    experienceMaxScore: toNumber(
      getValue(
        policy.experienceMaxScore,
        policy.ExperienceMaxScore,
        0
      )
    ),

    portfolioMaxScore: toNumber(
      getValue(
        policy.portfolioMaxScore,
        policy.PortfolioMaxScore,
        0
      )
    ),

    gitHubMaxScore: toNumber(
      getValue(
        policy.gitHubMaxScore,
        policy.GitHubMaxScore,
        policy.githubMaxScore,
        policy.GithubMaxScore,
        0
      )
    ),

    linkedInMaxScore: toNumber(
      getValue(
        policy.linkedInMaxScore,
        policy.LinkedInMaxScore,
        policy.linkedinMaxScore,
        policy.LinkedinMaxScore,
        0
      )
    ),

    certificateMaxScore: toNumber(
      getValue(
        policy.certificateMaxScore,
        policy.CertificateMaxScore,
        0
      )
    ),

    riskMaxPenalty: toNumber(
      getValue(
        policy.riskMaxPenalty,
        policy.RiskMaxPenalty,
        0
      )
    ),

    certificateUnverifiedMaxProfileScore: toNumber(
      getValue(
        policy.certificateUnverifiedMaxProfileScore,
        policy.CertificateUnverifiedMaxProfileScore,
        0
      )
    ),

    bioMinimumLength: toNumber(
      getValue(
        policy.bioMinimumLength,
        policy.BioMinimumLength,
        0
      )
    ),

    skillsMinimumLength: toNumber(
      getValue(
        policy.skillsMinimumLength,
        policy.SkillsMinimumLength,
        0
      )
    ),

    maxCertificates: toNumber(
      getValue(
        policy.maxCertificates,
        policy.MaxCertificates,
        0
      )
    ),

    reason: getValue(
      policy.reason,
      policy.Reason,
      ""
    ),

    createdAt: getValue(
      policy.createdAt,
      policy.CreatedAt,
      ""
    ),

    updatedAt: getValue(
      policy.updatedAt,
      policy.UpdatedAt,
      ""
    ),

    raw: policy,
  };
};

// =========================================================
// PLATFORM FEE POLICY
// =========================================================

export const normalizePlatformFeePolicy = (policy) => {
  if (!policy) {
    return {
      policyId: null,

      individualClientFeeRate: 0,
      businessClientFeeRate: 0,
      expertFeeRate: 0,

      reason: "",
      createdAt: "",
      updatedAt: "",

      raw: null,
    };
  }

  return {
    policyId: getValue(
      policy.policyId,
      policy.PolicyId,
      policy.id,
      policy.Id,
      null
    ),

    individualClientFeeRate: toNumber(
      getValue(
        policy.individualClientFeeRate,
        policy.IndividualClientFeeRate,
        0
      )
    ),

    businessClientFeeRate: toNumber(
      getValue(
        policy.businessClientFeeRate,
        policy.BusinessClientFeeRate,
        0
      )
    ),

    expertFeeRate: toNumber(
      getValue(
        policy.expertFeeRate,
        policy.ExpertFeeRate,
        0
      )
    ),

    reason: getValue(
      policy.reason,
      policy.Reason,
      ""
    ),

    createdAt: getValue(
      policy.createdAt,
      policy.CreatedAt,
      ""
    ),

    updatedAt: getValue(
      policy.updatedAt,
      policy.UpdatedAt,
      ""
    ),

    raw: policy,
  };
};

// =========================================================
// LOGIN SECURITY POLICY
// =========================================================

export const normalizeLoginSecurityPolicy = (policy) => {
  if (!policy) {
    return {
      loginSecurityPolicyId: null,
      policyId: null,
      id: null,

      maxFailedLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      isEnabled: true,

      createdAt: "",
      updatedAt: "",

      updatedByAdminId: null,
      updatedByAdminEmail: "",
      updatedByAdminFullName: "",

      raw: null,
    };
  }

  const loginSecurityPolicyId = getValue(
    policy.loginSecurityPolicyId,
    policy.LoginSecurityPolicyId,
    policy.policyId,
    policy.PolicyId,
    policy.id,
    policy.Id,
    null
  );

  return {
    loginSecurityPolicyId,
    policyId: loginSecurityPolicyId,
    id: loginSecurityPolicyId,

    maxFailedLoginAttempts: toNumber(
      getValue(
        policy.maxFailedLoginAttempts,
        policy.MaxFailedLoginAttempts,
        5
      ),
      5
    ),

    lockoutDurationMinutes: toNumber(
      getValue(
        policy.lockoutDurationMinutes,
        policy.LockoutDurationMinutes,
        15
      ),
      15
    ),

    isEnabled: toBoolean(
      getValue(
        policy.isEnabled,
        policy.IsEnabled,
        true
      ),
      true
    ),

    createdAt: getValue(
      policy.createdAt,
      policy.CreatedAt,
      ""
    ),

    updatedAt: getValue(
      policy.updatedAt,
      policy.UpdatedAt,
      ""
    ),

    updatedByAdminId: getValue(
      policy.updatedByAdminId,
      policy.UpdatedByAdminId,
      null
    ),

    updatedByAdminEmail: getValue(
      policy.updatedByAdminEmail,
      policy.UpdatedByAdminEmail,
      ""
    ),

    updatedByAdminFullName: getValue(
      policy.updatedByAdminFullName,
      policy.UpdatedByAdminFullName,
      ""
    ),

    raw: policy,
  };
};

// =========================================================
// PAYLOAD BUILDERS
// =========================================================

const buildExpertProfileScoringPolicyPayload = (
  formData = {}
) => {
  return {
    passThreshold: toNumber(
      formData.passThreshold
    ),

    maxReviewSubmissions: toNumber(
      formData.maxReviewSubmissions
    ),

    reviewLockDurationHours: toNumber(
      formData.reviewLockDurationHours
    ),

    profileCompletenessMaxScore: toNumber(
      formData.profileCompletenessMaxScore
    ),

    aiSkillMaxScore: toNumber(
      formData.aiSkillMaxScore
    ),

    experienceMaxScore: toNumber(
      formData.experienceMaxScore
    ),

    portfolioMaxScore: toNumber(
      formData.portfolioMaxScore
    ),

    gitHubMaxScore: toNumber(
      formData.gitHubMaxScore
    ),

    linkedInMaxScore: toNumber(
      formData.linkedInMaxScore
    ),

    certificateMaxScore: toNumber(
      formData.certificateMaxScore
    ),

    riskMaxPenalty: toNumber(
      formData.riskMaxPenalty
    ),

    certificateUnverifiedMaxProfileScore: toNumber(
      formData.certificateUnverifiedMaxProfileScore
    ),

    bioMinimumLength: toNumber(
      formData.bioMinimumLength
    ),

    skillsMinimumLength: toNumber(
      formData.skillsMinimumLength
    ),

    maxCertificates: toNumber(
      formData.maxCertificates
    ),

    reason: String(
      formData.reason || ""
    ).trim(),
  };
};

const buildPlatformFeePolicyPayload = (
  formData = {}
) => {
  return {
    individualClientFeeRate: toNumber(
      formData.individualClientFeeRate
    ),

    businessClientFeeRate: toNumber(
      formData.businessClientFeeRate
    ),

    expertFeeRate: toNumber(
      formData.expertFeeRate
    ),

    reason: String(
      formData.reason || ""
    ).trim(),
  };
};

const buildLoginSecurityPolicyPayload = (
  formData = {}
) => {
  return {
    maxFailedLoginAttempts: toNumber(
      formData.maxFailedLoginAttempts,
      5
    ),

    lockoutDurationMinutes: toNumber(
      formData.lockoutDurationMinutes,
      15
    ),

    isEnabled: toBoolean(
      formData.isEnabled,
      true
    ),

    reason: String(
      formData.reason || ""
    ).trim(),
  };
};

// =========================================================
// SERVICE
// =========================================================

const adminPolicyService = {
  // ---------------------------------------------------------
  // EXPERT PROFILE SCORING POLICY
  // ---------------------------------------------------------

  async getExpertProfileScoringPolicy() {
    const response =
      await adminPolicyApi.getExpertProfileScoringPolicy();

    return normalizeExpertProfileScoringPolicy(
      unwrapData(response)
    );
  },

  async updateExpertProfileScoringPolicy(formData) {
    const payload =
      buildExpertProfileScoringPolicyPayload(formData);

    const response =
      await adminPolicyApi.updateExpertProfileScoringPolicy(
        payload
      );

    return normalizeExpertProfileScoringPolicy(
      unwrapData(response)
    );
  },

  // ---------------------------------------------------------
  // PLATFORM FEE POLICY
  // ---------------------------------------------------------

  async getPlatformFeePolicy() {
    const response =
      await adminPolicyApi.getPlatformFeePolicy();

    return normalizePlatformFeePolicy(
      unwrapData(response)
    );
  },

  async updatePlatformFeePolicy(formData) {
    const payload =
      buildPlatformFeePolicyPayload(formData);

    const response =
      await adminPolicyApi.updatePlatformFeePolicy(
        payload
      );

    return normalizePlatformFeePolicy(
      unwrapData(response)
    );
  },

  // ---------------------------------------------------------
  // LOGIN SECURITY POLICY
  // ---------------------------------------------------------

  async getLoginSecurityPolicy() {
    const response =
      await adminPolicyApi.getLoginSecurityPolicy();

    return normalizeLoginSecurityPolicy(
      unwrapData(response)
    );
  },

  async updateLoginSecurityPolicy(formData) {
    const payload =
      buildLoginSecurityPolicyPayload(formData);

    const response =
      await adminPolicyApi.updateLoginSecurityPolicy(
        payload
      );

    return normalizeLoginSecurityPolicy(
      unwrapData(response)
    );
  },

  normalizeExpertProfileScoringPolicy,
  normalizePlatformFeePolicy,
  normalizeLoginSecurityPolicy,
};

export default adminPolicyService;