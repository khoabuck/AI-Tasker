import expertProfileApi from "../api/expertProfile.api";

const normalizeData = (response) => {
  if (response?.data?.data) return response.data.data;
  return response?.data;
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
};

const buildPayload = (formData) => ({
  avatarUrl: formData.avatarUrl || "",
  professionalTitle: String(formData.professionalTitle || "").trim(),
  bio: String(formData.bio || "").trim(),
  skills: String(formData.skills || "").trim(),
  yearsOfExperience: toNumber(formData.yearsOfExperience),
  expectedProjectBudgetMin: toNumber(formData.expectedProjectBudgetMin),
  expectedProjectBudgetMax: toNumber(formData.expectedProjectBudgetMax),
  preferredProjectDurationDays: toNumber(formData.preferredProjectDurationDays),
  availableForWork: Boolean(formData.availableForWork),
  portfolioUrl: String(formData.portfolioUrl || "").trim(),
  linkedInUrl: String(formData.linkedInUrl || "").trim(),
  gitHubUrl: String(formData.gitHubUrl || "").trim(),

  certificates: (formData.certificates || [])
    .filter((item) => {
      const name = String(item.certificateName || "").trim();
      const issuer = String(item.certificateIssuer || "").trim();
      const url = String(item.certificateUrl || "").trim();
      const issuedAt = String(item.issuedAt || "").trim();

      return name !== "" || issuer !== "" || url !== "" || issuedAt !== "";
    })
    .map((item) => ({
      certificateName: String(item.certificateName || "").trim(),
      certificateIssuer: String(item.certificateIssuer || "").trim(),
      certificateUrl: String(item.certificateUrl || "").trim(),
      issuedAt: item.issuedAt
        ? new Date(item.issuedAt).toISOString()
        : new Date().toISOString(),
    })),
});

const expertProfileService = {
  async getMyExpertProfile() {
    const response = await expertProfileApi.getMyExpertProfile();
    return normalizeData(response);
  },

  async createExpertProfile(formData) {
    const payload = buildPayload(formData);

    console.log("CREATE EXPERT PROFILE PAYLOAD:", payload);

    const response = await expertProfileApi.createExpertProfile(payload);
    return normalizeData(response);
  },

  async resubmitExpertProfile(formData) {
    const payload = buildPayload(formData);

    console.log("RESUBMIT EXPERT PROFILE PAYLOAD:", payload);

    const response = await expertProfileApi.resubmitExpertProfile(payload);
    return normalizeData(response);
  },
};

export default expertProfileService;