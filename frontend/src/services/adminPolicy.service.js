import adminPolicyApi from "../api/adminPolicy.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.policy) return data.data.policy;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.policy) return data.policy;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

export const normalizeExpertProfileScoringPolicy = (policy) => {
  if (!policy) {
    return {
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
      updatedAt: "",
      raw: null,
    };
  }

  return {
    policyId: getValue(policy.policyId, policy.PolicyId, policy.id, policy.Id, null),

    passThreshold: toNumber(
      getValue(policy.passThreshold, policy.PassThreshold, policy.minimumProfileScore, 0)
    ),

    maxReviewSubmissions: toNumber(
      getValue(policy.maxReviewSubmissions, policy.MaxReviewSubmissions, 0)
    ),

    reviewLockDurationHours: toNumber(
      getValue(policy.reviewLockDurationHours, policy.ReviewLockDurationHours, 0)
    ),

    profileCompletenessMaxScore: toNumber(
      getValue(
        policy.profileCompletenessMaxScore,
        policy.ProfileCompletenessMaxScore,
        0
      )
    ),

    aiSkillMaxScore: toNumber(
      getValue(policy.aiSkillMaxScore, policy.AiSkillMaxScore, policy.AISkillMaxScore, 0)
    ),

    experienceMaxScore: toNumber(
      getValue(policy.experienceMaxScore, policy.ExperienceMaxScore, 0)
    ),

    portfolioMaxScore: toNumber(
      getValue(policy.portfolioMaxScore, policy.PortfolioMaxScore, 0)
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
      getValue(policy.certificateMaxScore, policy.CertificateMaxScore, 0)
    ),

    riskMaxPenalty: toNumber(
      getValue(policy.riskMaxPenalty, policy.RiskMaxPenalty, 0)
    ),

    certificateUnverifiedMaxProfileScore: toNumber(
      getValue(
        policy.certificateUnverifiedMaxProfileScore,
        policy.CertificateUnverifiedMaxProfileScore,
        0
      )
    ),

    bioMinimumLength: toNumber(
      getValue(policy.bioMinimumLength, policy.BioMinimumLength, 0)
    ),

    skillsMinimumLength: toNumber(
      getValue(policy.skillsMinimumLength, policy.SkillsMinimumLength, 0)
    ),

    maxCertificates: toNumber(
      getValue(policy.maxCertificates, policy.MaxCertificates, 0)
    ),

    reason: getValue(policy.reason, policy.Reason, ""),
    createdAt: getValue(policy.createdAt, policy.CreatedAt, ""),
    updatedAt: getValue(policy.updatedAt, policy.UpdatedAt, ""),

    raw: policy,
  };
};

export const normalizePlatformFeePolicy = (policy) => {
  if (!policy) {
    return {
      individualClientFeeRate: 0,
      businessClientFeeRate: 0,
      expertFeeRate: 0,
      reason: "",
      updatedAt: "",
      raw: null,
    };
  }

  return {
    policyId: getValue(policy.policyId, policy.PolicyId, policy.id, policy.Id, null),

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
      getValue(policy.expertFeeRate, policy.ExpertFeeRate, 0)
    ),

    reason: getValue(policy.reason, policy.Reason, ""),
    createdAt: getValue(policy.createdAt, policy.CreatedAt, ""),
    updatedAt: getValue(policy.updatedAt, policy.UpdatedAt, ""),

    raw: policy,
  };
};

const buildExpertProfileScoringPolicyPayload = (formData = {}) => {
  return {
    passThreshold: toNumber(formData.passThreshold),
    maxReviewSubmissions: toNumber(formData.maxReviewSubmissions),
    reviewLockDurationHours: toNumber(formData.reviewLockDurationHours),
    profileCompletenessMaxScore: toNumber(formData.profileCompletenessMaxScore),
    aiSkillMaxScore: toNumber(formData.aiSkillMaxScore),
    experienceMaxScore: toNumber(formData.experienceMaxScore),
    portfolioMaxScore: toNumber(formData.portfolioMaxScore),
    gitHubMaxScore: toNumber(formData.gitHubMaxScore),
    linkedInMaxScore: toNumber(formData.linkedInMaxScore),
    certificateMaxScore: toNumber(formData.certificateMaxScore),
    riskMaxPenalty: toNumber(formData.riskMaxPenalty),
    certificateUnverifiedMaxProfileScore: toNumber(
      formData.certificateUnverifiedMaxProfileScore
    ),
    bioMinimumLength: toNumber(formData.bioMinimumLength),
    skillsMinimumLength: toNumber(formData.skillsMinimumLength),
    maxCertificates: toNumber(formData.maxCertificates),
    reason: String(formData.reason || "").trim(),
  };
};

const buildPlatformFeePolicyPayload = (formData = {}) => {
  return {
    individualClientFeeRate: toNumber(formData.individualClientFeeRate),
    businessClientFeeRate: toNumber(formData.businessClientFeeRate),
    expertFeeRate: toNumber(formData.expertFeeRate),
    reason: String(formData.reason || "").trim(),
  };
};

const adminPolicyService = {
  async getExpertProfileScoringPolicy() {
    const response = await adminPolicyApi.getExpertProfileScoringPolicy();
    return normalizeExpertProfileScoringPolicy(unwrapData(response));
  },

  async updateExpertProfileScoringPolicy(formData) {
    const payload = buildExpertProfileScoringPolicyPayload(formData);
    const response = await adminPolicyApi.updateExpertProfileScoringPolicy(payload);

    return normalizeExpertProfileScoringPolicy(unwrapData(response));
  },

  async getPlatformFeePolicy() {
    const response = await adminPolicyApi.getPlatformFeePolicy();
    return normalizePlatformFeePolicy(unwrapData(response));
  },

  async updatePlatformFeePolicy(formData) {
    const payload = buildPlatformFeePolicyPayload(formData);
    const response = await adminPolicyApi.updatePlatformFeePolicy(payload);

    return normalizePlatformFeePolicy(unwrapData(response));
  },
};

export default adminPolicyService;