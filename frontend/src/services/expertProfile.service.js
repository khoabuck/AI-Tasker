import expertProfileApi from "../api/expertProfile.api";

const normalizeData = (response) => {
  if (response?.data?.data) return response.data.data;
  if (response?.data?.result) return response.data.result;
  return response?.data;
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
};

const trim = (value) => String(value || "").trim();

const normalizeCertificate = (item) => ({
  certificateName: trim(item.certificateName || item.CertificateName),
  certificateIssuer: trim(item.certificateIssuer || item.CertificateIssuer),
  certificateUrl: trim(item.certificateUrl || item.CertificateUrl),
  issuedAt:
    item.issuedAt || item.IssuedAt
      ? new Date(item.issuedAt || item.IssuedAt).toISOString()
      : null,
});

const normalizeCertificates = (certificates) =>
  (certificates || [])
    .map(normalizeCertificate)
    .filter(
      (item) =>
        item.certificateName !== "" ||
        item.certificateIssuer !== "" ||
        item.certificateUrl !== ""
    );

const buildCreatePayload = (formData) => ({
  avatarUrl: trim(formData.avatarUrl),
  professionalTitle: trim(formData.professionalTitle),
  bio: trim(formData.bio),
  skills: trim(formData.skills),
  yearsOfExperience: toNumber(formData.yearsOfExperience),
  availableForWork: Boolean(formData.availableForWork),
  portfolioUrl: trim(formData.portfolioUrl),
  linkedInUrl: trim(formData.linkedInUrl),
  gitHubUrl: trim(formData.gitHubUrl),
  certificates: normalizeCertificates(formData.certificates),
});

const buildBasicPayload = (formData) => ({
  fullName: trim(formData.fullName),
  avatarUrl: trim(formData.avatarUrl),
  professionalTitle: trim(formData.professionalTitle),
  bio: trim(formData.bio),
  availableForWork: Boolean(formData.availableForWork),
});

const buildVerificationPayload = (formData) => ({
  skills: trim(formData.skills),
  yearsOfExperience: toNumber(formData.yearsOfExperience),
  portfolioUrl: trim(formData.portfolioUrl),
  linkedInUrl: trim(formData.linkedInUrl),
  gitHubUrl: trim(formData.gitHubUrl),
  certificates: normalizeCertificates(formData.certificates),
});

const expertProfileService = {
  async getMyExpertProfile() {
    const response = await expertProfileApi.getMyExpertProfile();
    return normalizeData(response);
  },

  async createExpertProfile(formData) {
    const payload = buildCreatePayload(formData);
    const response = await expertProfileApi.createExpertProfile(payload);

    return normalizeData(response);
  },

  async resubmitExpertProfile(formData) {
    const payload = buildCreatePayload(formData);
    const response = await expertProfileApi.resubmitExpertProfile(payload);

    return normalizeData(response);
  },

  async updateBasicExpertProfile(formData) {
    const payload = buildBasicPayload(formData);
    const response = await expertProfileApi.updateBasicExpertProfile(payload);

    return normalizeData(response);
  },

  async updateVerificationExpertProfile(formData) {
    const payload = buildVerificationPayload(formData);
    const response =
      await expertProfileApi.updateVerificationExpertProfile(payload);

    return normalizeData(response);
  },
};

export default expertProfileService;