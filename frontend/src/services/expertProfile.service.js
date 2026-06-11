import expertProfileApi from "../api/expertProfile.api";

const expertProfileService = {
  async getMyProfile() {
    const response = await expertProfileApi.getMyProfile();
    return response.data;
  },

  async saveProfile(formData, certificates) {
    const payload = {
      avatarUrl: formData.avatarUrl,
      professionalTitle: formData.professionalTitle,
      bio: formData.bio,
      skills: formData.skills,
      yearsOfExperience: Number(formData.yearsOfExperience),
      portfolioUrl: formData.portfolioUrl,
      githubUrl: formData.githubUrl,
      linkedInUrl: formData.linkedInUrl,
      expectedProjectBudgetMin: Number(formData.expectedProjectBudgetMin),
      expectedProjectBudgetMax: Number(formData.expectedProjectBudgetMax),
      preferredProjectDurationDays: Number(
        formData.preferredProjectDurationDays
      ),
      availableForWork: Boolean(formData.availableForWork),
      certificates: certificates,
    };

    const response = await expertProfileApi.saveProfile(payload);
    return response.data;
  },
};

export default expertProfileService;