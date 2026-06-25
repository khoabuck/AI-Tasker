import adminJobPostingAiPolicyApi from "../api/adminJobPostingAiPolicy.api";

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

export const normalizeJobPostingAiPolicy = (policy) => {
  if (!policy) {
    return {
      initialFreeJobPostCredits: 0,
      initialFreeAiGenerationCredits: 0,
      maxDraftJobsPerClient: 0,
      maxSkillsPerJob: 0,
      maxSuggestedSkills: 0,
      minimumSkillRelevanceScore: 0,
      maxRecommendationResults: 0,
      minimumRecommendationMatchScore: 0,
      reason: "",
      updatedAt: "",
      raw: null,
    };
  }

  return {
    policyId: getValue(policy.policyId, policy.PolicyId, policy.id, policy.Id, null),

    initialFreeJobPostCredits: toNumber(
      getValue(
        policy.initialFreeJobPostCredits,
        policy.InitialFreeJobPostCredits,
        0
      )
    ),

    initialFreeAiGenerationCredits: toNumber(
      getValue(
        policy.initialFreeAiGenerationCredits,
        policy.InitialFreeAiGenerationCredits,
        0
      )
    ),

    maxDraftJobsPerClient: toNumber(
      getValue(policy.maxDraftJobsPerClient, policy.MaxDraftJobsPerClient, 0)
    ),

    maxSkillsPerJob: toNumber(
      getValue(policy.maxSkillsPerJob, policy.MaxSkillsPerJob, 0)
    ),

    maxSuggestedSkills: toNumber(
      getValue(policy.maxSuggestedSkills, policy.MaxSuggestedSkills, 0)
    ),

    minimumSkillRelevanceScore: toNumber(
      getValue(
        policy.minimumSkillRelevanceScore,
        policy.MinimumSkillRelevanceScore,
        0
      )
    ),

    maxRecommendationResults: toNumber(
      getValue(policy.maxRecommendationResults, policy.MaxRecommendationResults, 0)
    ),

    minimumRecommendationMatchScore: toNumber(
      getValue(
        policy.minimumRecommendationMatchScore,
        policy.MinimumRecommendationMatchScore,
        0
      )
    ),

    reason: getValue(policy.reason, policy.Reason, ""),
    createdAt: getValue(policy.createdAt, policy.CreatedAt, ""),
    updatedAt: getValue(policy.updatedAt, policy.UpdatedAt, ""),

    raw: policy,
  };
};

const buildPayload = (formData = {}) => {
  return {
    initialFreeJobPostCredits: toNumber(formData.initialFreeJobPostCredits),
    initialFreeAiGenerationCredits: toNumber(
      formData.initialFreeAiGenerationCredits
    ),
    maxDraftJobsPerClient: toNumber(formData.maxDraftJobsPerClient),
    maxSkillsPerJob: toNumber(formData.maxSkillsPerJob),
    maxSuggestedSkills: toNumber(formData.maxSuggestedSkills),
    minimumSkillRelevanceScore: toNumber(formData.minimumSkillRelevanceScore),
    maxRecommendationResults: toNumber(formData.maxRecommendationResults),
    minimumRecommendationMatchScore: toNumber(
      formData.minimumRecommendationMatchScore
    ),
    reason: String(formData.reason || "").trim(),
  };
};

const adminJobPostingAiPolicyService = {
  async getPolicy() {
    const response = await adminJobPostingAiPolicyApi.getPolicy();
    return normalizeJobPostingAiPolicy(unwrapData(response));
  },

  async updatePolicy(formData) {
    const payload = buildPayload(formData);
    const response = await adminJobPostingAiPolicyApi.updatePolicy(payload);

    return normalizeJobPostingAiPolicy(unwrapData(response));
  },
};

export default adminJobPostingAiPolicyService;