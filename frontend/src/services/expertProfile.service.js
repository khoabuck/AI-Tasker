import expertProfileApi from "../api/expertProfile.api";

const normalizeData = (response) => {
  if (response.data?.data) {
    return response.data.data;
  }

  return response.data;
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
};

const buildPayload = (formData) => {
  return {
    avatarUrl: formData.avatarUrl || "",
    professionalTitle: formData.professionalTitle,
    bio: formData.bio,
    skills: formData.skills,
    yearsOfExperience: toNumber(formData.yearsOfExperience),
    expectedProjectBudgetMin: toNumber(formData.expectedProjectBudgetMin),
    expectedProjectBudgetMax: toNumber(formData.expectedProjectBudgetMax),
    preferredProjectDurationDays: toNumber(
      formData.preferredProjectDurationDays
    ),
    availableForWork: Boolean(formData.availableForWork),
    portfolioUrl: formData.portfolioUrl || "",
    linkedInUrl: formData.linkedInUrl || "",
    gitHubUrl: formData.gitHubUrl || "",
    certificates: (formData.certificates || [])
      .filter((item) => {
        return (
          String(item.certificateName || "").trim() !== "" ||
          String(item.certificateUrl || "").trim() !== ""
        );
      })
      .map((item) => ({
        certificateName: String(item.certificateName || "").trim(),
        certificateIssuer: String(item.certificateIssuer || "").trim(),
        certificateUrl: String(item.certificateUrl || "").trim(),
        issuedAt: item.issuedAt
          ? new Date(item.issuedAt).toISOString()
          : new Date().toISOString(),
      })),
  };
};

const expertProfileService = {
  async getMyExpertProfile() {
    const response = await expertProfileApi.getMyExpertProfile();
    return normalizeData(response);
  },

  async createExpertProfile(formData) {
    const payload = buildPayload(formData);
    const response = await expertProfileApi.createExpertProfile(payload);
    return normalizeData(response);
  },

  async resubmitExpertProfile(formData) {
    const payload = buildPayload(formData);
    const response = await expertProfileApi.resubmitExpertProfile(payload);
    return normalizeData(response);
  },
};

export default expertProfileService;