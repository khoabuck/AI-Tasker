import expertProfileApi from "../api/expertProfile.api";

const normalizeData = (response) => {
  if (response?.data?.data) return response.data.data;
  return response?.data;
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
};

const trim = (value) => String(value || "").trim();

const normalizeCertificate = (item) => ({
  certificateName: trim(item.certificateName),
  certificateIssuer: trim(item.certificateIssuer),
  certificateUrl: trim(item.certificateUrl),
  issuedAt: item.issuedAt ? new Date(item.issuedAt).toISOString() : null,
});

const buildPayload = (formData) => ({
  avatarUrl: trim(formData.avatarUrl),
  professionalTitle: trim(formData.professionalTitle),
  bio: trim(formData.bio),
  skills: trim(formData.skills),
  yearsOfExperience: toNumber(formData.yearsOfExperience),
  expectedProjectBudgetMin: toNumber(formData.expectedProjectBudgetMin),
  expectedProjectBudgetMax: toNumber(formData.expectedProjectBudgetMax),
  preferredProjectDurationDays: toNumber(formData.preferredProjectDurationDays),
  availableForWork: Boolean(formData.availableForWork),
  portfolioUrl: trim(formData.portfolioUrl),
  linkedInUrl: trim(formData.linkedInUrl),
  gitHubUrl: trim(formData.gitHubUrl),
  certificates: (formData.certificates || [])
    .map(normalizeCertificate)
    .filter(
      (item) =>
        item.certificateName !== "" ||
        item.certificateIssuer !== "" ||
        item.certificateUrl !== ""
    ),
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