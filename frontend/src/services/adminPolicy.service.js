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

const toNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);
  return Number.isNaN(number) ? null : number;
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
      minimumProfileScore: 70,

      portfolioWeight: 25,
      githubWeight: 25,
      linkedinWeight: 5,
      skillsWeight: 15,
      experienceWeight: 15,
      certificatesWeight: 10,
      educationWeight: 5,

      isActive: true,
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

    minimumProfileScore: toNumber(
      getValue(
        policy.minimumProfileScore,
        policy.MinimumProfileScore,
        policy.minimumScoreToPass,
        policy.MinimumScoreToPass,
        policy.passScore,
        policy.PassScore,
        70
      ),
      70
    ),

    portfolioWeight: toNumber(
      getValue(
        policy.portfolioWeight,
        policy.PortfolioWeight,
        policy.portfolioScoreWeight,
        policy.PortfolioScoreWeight,
        25
      ),
      25
    ),

    githubWeight: toNumber(
      getValue(
        policy.githubWeight,
        policy.GithubWeight,
        policy.gitHubWeight,
        policy.GitHubWeight,
        policy.githubScoreWeight,
        policy.GithubScoreWeight,
        policy.gitHubScoreWeight,
        policy.GitHubScoreWeight,
        25
      ),
      25
    ),

    linkedinWeight: toNumber(
      getValue(
        policy.linkedinWeight,
        policy.LinkedinWeight,
        policy.linkedInWeight,
        policy.LinkedInWeight,
        policy.linkedinScoreWeight,
        policy.LinkedinScoreWeight,
        policy.linkedInScoreWeight,
        policy.LinkedInScoreWeight,
        5
      ),
      5
    ),

    skillsWeight: toNumber(
      getValue(
        policy.skillsWeight,
        policy.SkillsWeight,
        policy.skillWeight,
        policy.SkillWeight,
        15
      ),
      15
    ),

    experienceWeight: toNumber(
      getValue(
        policy.experienceWeight,
        policy.ExperienceWeight,
        policy.yearsOfExperienceWeight,
        policy.YearsOfExperienceWeight,
        15
      ),
      15
    ),

    certificatesWeight: toNumber(
      getValue(
        policy.certificatesWeight,
        policy.CertificatesWeight,
        policy.certificateWeight,
        policy.CertificateWeight,
        policy.certificationWeight,
        policy.CertificationWeight,
        10
      ),
      10
    ),

    educationWeight: toNumber(
      getValue(
        policy.educationWeight,
        policy.EducationWeight,
        policy.degreeWeight,
        policy.DegreeWeight,
        5
      ),
      5
    ),

    isActive: toBoolean(
      getValue(policy.isActive, policy.IsActive, policy.active, policy.Active),
      true
    ),

    createdAt: getValue(policy.createdAt, policy.CreatedAt, ""),
    updatedAt: getValue(policy.updatedAt, policy.UpdatedAt, ""),

    raw: policy,
  };
};

export const normalizePlatformFeePolicy = (policy) => {
  if (!policy) {
    return {
      feePercent: 10,
      minimumFee: 0,
      maximumFee: null,
      fixedFee: 0,
      isActive: true,
      effectiveFrom: "",
      effectiveTo: "",
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

    feePercent: toNumber(
      getValue(
        policy.feePercent,
        policy.FeePercent,
        policy.platformFeePercent,
        policy.PlatformFeePercent,
        policy.percentage,
        policy.Percentage,
        10
      ),
      10
    ),

    minimumFee: toNumber(
      getValue(
        policy.minimumFee,
        policy.MinimumFee,
        policy.minFee,
        policy.MinFee,
        0
      ),
      0
    ),

    maximumFee: toNullableNumber(
      getValue(
        policy.maximumFee,
        policy.MaximumFee,
        policy.maxFee,
        policy.MaxFee,
        null
      )
    ),

    fixedFee: toNumber(
      getValue(
        policy.fixedFee,
        policy.FixedFee,
        policy.baseFee,
        policy.BaseFee,
        0
      ),
      0
    ),

    isActive: toBoolean(
      getValue(policy.isActive, policy.IsActive, policy.active, policy.Active),
      true
    ),

    effectiveFrom: getValue(
      policy.effectiveFrom,
      policy.EffectiveFrom,
      policy.startDate,
      policy.StartDate,
      ""
    ),

    effectiveTo: getValue(
      policy.effectiveTo,
      policy.EffectiveTo,
      policy.endDate,
      policy.EndDate,
      ""
    ),

    createdAt: getValue(policy.createdAt, policy.CreatedAt, ""),
    updatedAt: getValue(policy.updatedAt, policy.UpdatedAt, ""),

    raw: policy,
  };
};

const buildExpertProfileScoringPolicyPayload = (formData = {}) => {
  return {
    minimumProfileScore: toNumber(
      getValue(formData.minimumProfileScore, formData.minimumScoreToPass, 70),
      70
    ),

    portfolioWeight: toNumber(formData.portfolioWeight, 0),
    githubWeight: toNumber(formData.githubWeight, 0),

    // LinkedIn optional: missing/bad LinkedIn should only score 0, not block profile.
    linkedinWeight: toNumber(formData.linkedinWeight, 0),

    skillsWeight: toNumber(formData.skillsWeight, 0),
    experienceWeight: toNumber(formData.experienceWeight, 0),
    certificatesWeight: toNumber(formData.certificatesWeight, 0),
    educationWeight: toNumber(formData.educationWeight, 0),

    isActive: toBoolean(formData.isActive, true),
  };
};

const buildPlatformFeePolicyPayload = (formData = {}) => {
  return {
    feePercent: toNumber(formData.feePercent, 0),
    minimumFee: toNumber(formData.minimumFee, 0),
    maximumFee: toNullableNumber(formData.maximumFee),
    fixedFee: toNumber(formData.fixedFee, 0),
    isActive: toBoolean(formData.isActive, true),
    effectiveFrom: formData.effectiveFrom || null,
    effectiveTo: formData.effectiveTo || null,
  };
};

const adminPolicyService = {
  async getExpertProfileScoringPolicy() {
    const response = await adminPolicyApi.getExpertProfileScoringPolicy();

    console.log("ADMIN EXPERT SCORING POLICY RESPONSE:", response?.data);

    return normalizeExpertProfileScoringPolicy(unwrapData(response));
  },

  async updateExpertProfileScoringPolicy(formData) {
    const payload = buildExpertProfileScoringPolicyPayload(formData);

    console.log("UPDATE EXPERT SCORING POLICY PAYLOAD:", payload);

    const response = await adminPolicyApi.updateExpertProfileScoringPolicy(
      payload
    );

    console.log("UPDATE EXPERT SCORING POLICY RESPONSE:", response?.data);

    return normalizeExpertProfileScoringPolicy(unwrapData(response));
  },

  async getPlatformFeePolicy() {
    const response = await adminPolicyApi.getPlatformFeePolicy();

    console.log("ADMIN PLATFORM FEE POLICY RESPONSE:", response?.data);

    return normalizePlatformFeePolicy(unwrapData(response));
  },

  async updatePlatformFeePolicy(formData) {
    const payload = buildPlatformFeePolicyPayload(formData);

    console.log("UPDATE PLATFORM FEE POLICY PAYLOAD:", payload);

    const response = await adminPolicyApi.updatePlatformFeePolicy(payload);

    console.log("UPDATE PLATFORM FEE POLICY RESPONSE:", response?.data);

    return normalizePlatformFeePolicy(unwrapData(response));
  },
};

export default adminPolicyService;