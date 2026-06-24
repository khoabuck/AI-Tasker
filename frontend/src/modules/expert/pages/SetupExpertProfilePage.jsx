import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import authService from "../../../services/auth.service";
import expertProfileService from "../../../services/expertProfile.service";
import uploadService from "../../../services/upload.service";
import { useAuth } from "../../../context/AuthContext";

const SETUP_DRAFT_KEY = "aitasker_expert_profile_setup_draft";
const EDIT_DRAFT_KEY = "aitasker_expert_profile_edit_draft";
const CORRECTION_DRAFT_KEY = "aitasker_expert_profile_correction_draft";

const MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS = 5;

const CERTIFICATE_TYPE_OPTIONS = [
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

const CERTIFICATE_TYPES = CERTIFICATE_TYPE_OPTIONS.map((item) => item.value);

const emptyForm = {
  avatarUrl: "",
  professionalTitle: "",
  bio: "",
  skills: "",
  yearsOfExperience: "",
  availableForWork: true,
  portfolioUrl: "",
  linkedInUrl: "",
  gitHubUrl: "",
  certificates: [],
};

function createEmptyForm() {
  return {
    ...emptyForm,
    certificates: [],
  };
}

export default function SetupExpertProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { handleLogout: logoutContext } = useAuth();

  const isEditPage = location.pathname === "/expert/profile/edit";
  const draftKey = isEditPage ? EDIT_DRAFT_KEY : SETUP_DRAFT_KEY;

  const [formData, setFormData] = useState(() => createEmptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});

  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const [reviewLimit, setReviewLimit] = useState({
    submissionCount: 0,
    lockedUntil: "",
    reviewStatus: "",
    userStatus: "",
    remainingAttempts: "",
    maxAttempts: MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS,
  });

  const formErrors = useMemo(() => validateForm(formData), [formData]);

  const isReviewLocked = isExpertProfileReviewLocked(reviewLimit);
  const isNoAttemptsLeft = hasNoExpertProfileAttemptsLeft(reviewLimit);
  const remainingReviewAttempts =
    getRemainingExpertProfileAttempts(reviewLimit);

  const shouldDisableSubmit =
    saving || uploadingAvatar || isReviewLocked || isNoAttemptsLeft;

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditPage]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(draftKey, JSON.stringify(formData));
    }
  }, [formData, draftKey, loading]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError("");

      const correctionDraft = readJson(CORRECTION_DRAFT_KEY);
      const normalDraft = readJson(draftKey);

      let profile = null;

      try {
        profile = await expertProfileService.getMyExpertProfile();

        const nextLimit = extractExpertProfileReviewLimit(profile);
        setReviewLimit(nextLimit);

        if (shouldRedirectToLockedPage(nextLimit)) {
          updateLocalUserStatus("EXPERT_PROFILE_LOCKED");
          navigate("/expert/profile-locked", { replace: true });
          return;
        }

        const reviewStatus = getReviewStatus(profile);
        const userStatus = getUserStatus(profile);

        if (reviewStatus === "APPROVED" || userStatus === "ACTIVE") {
          updateLocalUserStatus("ACTIVE");
          navigate("/expert/dashboard", { replace: true });
          return;
        }

        if (!isEditPage) {
          const hasExistingProfile =
            reviewStatus === "NEEDS_CORRECTION" ||
            reviewStatus === "REJECTED" ||
            userStatus === "PENDING_PROFILE";

          if (hasExistingProfile) {
            navigate("/expert/profile/edit", { replace: true });
            return;
          }
        }
      } catch (profileErr) {
        if (profileErr?.response?.status !== 404 && profileErr?.status !== 404) {
          throw profileErr;
        }

        profile = null;
      }

      if (correctionDraft) {
        const safeDraft = removeDeprecatedExpertFields(correctionDraft);

        setFormData({
          ...createEmptyForm(),
          ...safeDraft,
          certificates: normalizeCertificatesForForm(safeDraft.certificates),
        });

        return;
      }

      if (normalDraft) {
        const safeDraft = removeDeprecatedExpertFields(normalDraft);

        setFormData({
          ...createEmptyForm(),
          ...safeDraft,
          certificates: normalizeCertificatesForForm(safeDraft.certificates),
        });

        return;
      }

      if (isEditPage && profile) {
        setFormData(buildFormFromProfile(profile));
        return;
      }

      setFormData(createEmptyForm());
    } catch (err) {
      console.error("LOAD EXPERT PROFILE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const refreshProfileLimitFromBackend = async () => {
    try {
      const profile = await expertProfileService.getMyExpertProfile();
      const nextLimit = extractExpertProfileReviewLimit(profile);
      setReviewLimit(nextLimit);
      return nextLimit;
    } catch (refreshError) {
      console.error(
        "REFRESH PROFILE LIMIT ERROR:",
        refreshError?.response?.data || refreshError
      );
      return null;
    }
  };

  const markTouched = (name) => {
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const getFieldError = (name) => {
    if (!submitted && !touched[name]) return "";
    return formErrors[name] || "";
  };

  const updateField = (name, value) => {
    setError("");
    setModal(null);

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateCertificate = (index, name, value) => {
    setError("");
    setModal(null);

    setFormData((prev) => {
      const nextCertificates = [...(prev.certificates || [])];

      nextCertificates[index] = {
        ...nextCertificates[index],
        [name]: value,
      };

      return {
        ...prev,
        certificates: nextCertificates,
      };
    });
  };

  const addCertificate = () => {
    if ((formData.certificates || []).length >= 10) return;

    setFormData((prev) => ({
      ...prev,
      certificates: [
        ...(prev.certificates || []),
        {
          certificateUrl: "",
          certificateType: "COURSE_CERTIFICATE",
        },
      ],
    }));
  };

  const removeCertificate = (index) => {
    setFormData((prev) => ({
      ...prev,
      certificates: (prev.certificates || []).filter((_, i) => i !== index),
    }));
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingAvatar(true);
      setError("");
      setModal(null);

      const uploadResult = await uploadService.uploadImage(file, "avatar");
      const imageUrl = extractUploadUrl(uploadResult);

      if (!imageUrl) {
        throw new Error("Avatar upload succeeded but image URL was not found.");
      }

      updateField("avatarUrl", imageUrl);

      if (typeof authService.updateMyAvatar === "function") {
        try {
          await authService.updateMyAvatar(imageUrl);
        } catch (avatarErr) {
          console.error(
            "SYNC AUTH AVATAR ERROR:",
            avatarErr?.response?.data || avatarErr
          );
        }
      }
    } catch (err) {
      console.error("AVATAR UPLOAD ERROR:", err?.response?.data || err);

      setModal({
        type: "danger",
        title: "Upload failed",
        message: getFriendlyError(err),
        detail: "",
        showResubmit: false,
        showClose: true,
      });
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitted(true);
    setError("");
    setModal(null);

    if (isReviewLocked || isNoAttemptsLeft) {
      navigate("/expert/profile-locked", { replace: true });
      return;
    }

    const errors = validateForm(formData);

    if (Object.keys(errors).length > 0) {
      setError(
        "Please check the highlighted fields before submitting. Portfolio and GitHub are required. LinkedIn and certificates are optional."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);

      const submitPayload = {
        ...formData,
        certificates: normalizeCertificatesForPayload(formData.certificates),
      };

      const result = isEditPage
        ? await expertProfileService.resubmitExpertProfile(submitPayload)
        : await expertProfileService.createExpertProfile(submitPayload);

      const nextLimit = extractExpertProfileReviewLimit(result);
      setReviewLimit(nextLimit);

      const reviewStatus = getReviewStatus(result);
      const userStatus = getUserStatus(result);
      const reviewNote = getReviewNote(result);
      const missingInformation = getMissingInformation(result);

      const lockedByBackend = shouldRedirectToLockedPage(nextLimit);

      if (lockedByBackend) {
        saveCorrectionDraft(submitPayload);
        updateLocalUserStatus("EXPERT_PROFILE_LOCKED");

        navigate("/expert/profile-locked", { replace: true });
        return;
      }

      if (reviewStatus === "APPROVED" || userStatus === "ACTIVE") {
        clearExpertProfileDrafts();
        updateLocalUserStatus("ACTIVE");

        setModal({
          type: "success",
          title: "Setup profile successfully",
          message: "Your expert profile has been approved.",
          detail: "Redirecting to dashboard...",
          showResubmit: false,
          showClose: false,
        });

        setTimeout(() => {
          window.location.replace("/expert/dashboard");
        }, 900);

        return;
      }

      if (reviewStatus === "NEEDS_CORRECTION") {
        saveCorrectionDraft(submitPayload);
        updateLocalUserStatus("PENDING_PROFILE");

        const remaining = getRemainingExpertProfileAttempts(nextLimit);

        setModal({
          type: "warning",
          title:
            remaining <= 0
              ? "Final review attempt used"
              : "Profile needs correction",
          message:
            reviewNote ||
            "Your profile was submitted, but it needs some corrections before approval.",
          detail: `${
            missingInformation ||
            "Please review your bio, skills, Portfolio, GitHub, and certificate URLs if provided."
          }\n\n${buildExpertProfileAttemptText(nextLimit)}`,
          showResubmit: !shouldRedirectToLockedPage(nextLimit),
          showClose: true,
        });

        return;
      }

      if (reviewStatus === "REJECTED") {
        saveCorrectionDraft(submitPayload);
        updateLocalUserStatus("PENDING_PROFILE");

        const remaining = getRemainingExpertProfileAttempts(nextLimit);

        setModal({
          type: "danger",
          title:
            remaining <= 0
              ? "Final review attempt used"
              : "Profile was rejected",
          message:
            reviewNote ||
            "Your expert profile was rejected. Please update your information and submit again.",
          detail: `${
            missingInformation ||
            "Please check your profile information, Portfolio, GitHub, and certificate URLs if provided."
          }\n\n${buildExpertProfileAttemptText(nextLimit)}`,
          showResubmit: !shouldRedirectToLockedPage(nextLimit),
          showClose: true,
        });

        return;
      }

      saveCorrectionDraft(submitPayload);

      setModal({
        type: "info",
        title: "Profile submitted",
        message:
          "Your expert profile has been submitted. Please check your profile status later.",
        detail: buildExpertProfileAttemptText(nextLimit),
        showResubmit: false,
        showClose: true,
      });
    } catch (err) {
      console.error("EXPERT PROFILE SUBMIT ERROR:", err?.response?.data || err);

      saveCorrectionDraft(formData);

      const friendlyError = getFriendlyError(err);
      const refreshedLimit = await refreshProfileLimitFromBackend();

      if (
        friendlyError.toLowerCase().includes("locked") ||
        shouldRedirectToLockedPage(refreshedLimit)
      ) {
        updateLocalUserStatus("EXPERT_PROFILE_LOCKED");
        navigate("/expert/profile-locked", { replace: true });
        return;
      }

      setModal({
        type: "danger",
        title: "Submit failed",
        message: friendlyError,
        detail:
          "Your form data has been saved. You can go to resubmit page and try again.",
        showResubmit: true,
        showClose: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGoResubmit = () => {
    saveCorrectionDraft(formData);
    setModal(null);
    navigate("/expert/profile/edit", { replace: true });
  };

  const handleClearDraft = () => {
    clearExpertProfileDrafts();
    setFormData(createEmptyForm());
    setTouched({});
    setSubmitted(false);
    setModal(null);
    setError("");
  };

  const handleLogout = async () => {
    try {
      if (typeof logoutContext === "function") {
        logoutContext();
      }
    } catch (logoutError) {
      console.error("AUTH CONTEXT LOGOUT ERROR:", logoutError);
    }

    try {
      if (typeof authService.logout === "function") {
        await authService.logout();
      }
    } catch (logoutError) {
      console.error("AUTH SERVICE LOGOUT ERROR:", logoutError);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("role");

    sessionStorage.clear();

    window.location.replace("/login");
  };

  if (loading) {
    return (
      <SetupShell onLogout={handleLogout}>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading expert profile form...
        </div>
      </SetupShell>
    );
  }

  return (
    <SetupShell onLogout={handleLogout}>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              {isEditPage ? "Resubmit Expert Profile" : "Setup Expert Profile"}
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              {isEditPage
                ? "Update and resubmit your expert profile"
                : "Create your expert profile"}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Complete your profile so clients can understand your skills,
              experience, public work links, and optional certificates.
              Portfolio and GitHub are required. LinkedIn is optional.
            </p>
          </div>

          {(isEditPage ||
            reviewLimit.submissionCount > 0 ||
            reviewLimit.lockedUntil) && (
            <ExpertProfileReviewLimitNotice
              submissionCount={reviewLimit.submissionCount}
              remainingAttempts={remainingReviewAttempts}
              lockedUntil={reviewLimit.lockedUntil}
              locked={isReviewLocked || isNoAttemptsLeft}
              max={
                reviewLimit.maxAttempts ||
                MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS
              }
            />
          )}

          {error && (
            <Alert
              type="danger"
              title="Please check your form"
              message={error}
            />
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
          >
            <section>
              <h2 className="mb-4 text-lg font-bold text-white">
                Basic Information
              </h2>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-[180px_1fr]">
                <div>
                  <div className="mb-3 h-36 w-36 overflow-hidden rounded-3xl border border-cyan-400/30 bg-cyan-400/10">
                    {formData.avatarUrl ? (
                      <img
                        src={formData.avatarUrl}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-cyan-300">
                        <span className="material-symbols-outlined text-6xl">
                          person
                        </span>
                      </div>
                    )}
                  </div>

                  <label className="inline-flex cursor-pointer rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black">
                    {uploadingAvatar ? "Uploading..." : "Upload Avatar"}

                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingAvatar || saving}
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <TextInput
                    label="Professional Title"
                    required
                    value={formData.professionalTitle}
                    onChange={(value) =>
                      updateField("professionalTitle", value)
                    }
                    onBlur={() => markTouched("professionalTitle")}
                    error={getFieldError("professionalTitle")}
                    placeholder="Example: AI Automation Engineer"
                  />

                  <TextArea
                    label="Bio"
                    required
                    value={formData.bio}
                    onChange={(value) => updateField("bio", value)}
                    onBlur={() => markTouched("bio")}
                    error={getFieldError("bio")}
                    placeholder="At least 50 characters. Describe your AI experience, projects, and strengths."
                  />

                  <TextInput
                    label="Skills"
                    required
                    value={formData.skills}
                    onChange={(value) => updateField("skills", value)}
                    onBlur={() => markTouched("skills")}
                    error={getFieldError("skills")}
                    placeholder="AI Automation, RAG, Chatbot, Python, ASP.NET Core"
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-white/10 pt-6">
              <h2 className="mb-4 text-lg font-bold text-white">
                Work Availability
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <NumberInput
                  label="Years of Experience"
                  required
                  value={formData.yearsOfExperience}
                  onChange={(value) => updateField("yearsOfExperience", value)}
                  onBlur={() => markTouched("yearsOfExperience")}
                  error={getFieldError("yearsOfExperience")}
                  placeholder="Example: 3"
                />

                <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-gray-300">
                      Available for work
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Show clients that you are ready for new projects.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={Boolean(formData.availableForWork)}
                    onChange={(event) =>
                      updateField("availableForWork", event.target.checked)
                    }
                    className="h-5 w-5 accent-cyan-400"
                  />
                </label>
              </div>
            </section>

            <section className="border-t border-white/10 pt-6">
              <h2 className="mb-4 text-lg font-bold text-white">
                Public Links
              </h2>

              <p className="mb-4 text-sm text-gray-500">
                Portfolio and GitHub are required for verification. LinkedIn is
                optional.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <TextInput
                  label="Portfolio URL"
                  required
                  value={formData.portfolioUrl}
                  onChange={(value) => updateField("portfolioUrl", value)}
                  onBlur={() => markTouched("portfolioUrl")}
                  error={getFieldError("portfolioUrl")}
                  placeholder="https://your-portfolio.com"
                />

                <TextInput
                  label="LinkedIn URL"
                  value={formData.linkedInUrl}
                  onChange={(value) => updateField("linkedInUrl", value)}
                  onBlur={() => markTouched("linkedInUrl")}
                  error={getFieldError("linkedInUrl")}
                  placeholder="https://linkedin.com/in/you"
                />

                <TextInput
                  label="GitHub URL"
                  required
                  value={formData.gitHubUrl}
                  onChange={(value) => updateField("gitHubUrl", value)}
                  onBlur={() => markTouched("gitHubUrl")}
                  error={getFieldError("gitHubUrl")}
                  placeholder="https://github.com/you"
                />
              </div>

              <FieldError message={submitted ? formErrors.publicLinks : ""} />
            </section>

            <section className="border-t border-white/10 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Certificates
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Optional. Maximum 10 certificates are allowed. If you add
                    one, only Certificate URL and Certificate Type are required.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addCertificate}
                  disabled={
                    saving ||
                    uploadingAvatar ||
                    (formData.certificates || []).length >= 10
                  }
                  className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Certificate
                </button>
              </div>

              <FieldError message={submitted ? formErrors.certificates : ""} />
              <FieldError
                message={submitted ? formErrors.duplicateCertificates : ""}
              />

              {(formData.certificates || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-gray-400">
                  <p className="font-bold text-gray-300">
                    No certificates added.
                  </p>
                  <p className="mt-1">
                    You can submit without certificates. Certificates only help
                    increase evidence score if the link can be verified.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.certificates.map((certificate, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">
                            Certificate {index + 1}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Backend will read the URL to detect holder,
                            certificate name, and issuer if possible.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeCertificate(index)}
                          disabled={saving || uploadingAvatar}
                          className="text-sm font-bold text-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <TextInput
                          label="Certificate URL"
                          value={certificate.certificateUrl || ""}
                          onChange={(value) =>
                            updateCertificate(index, "certificateUrl", value)
                          }
                          onBlur={() => markTouched(`certificateUrl_${index}`)}
                          error={getFieldError(`certificateUrl_${index}`)}
                          placeholder="https://www.coursera.org/account/accomplishments/verify/ABC123"
                        />

                        <SelectInput
                          label="Certificate Type"
                          value={
                            certificate.certificateType ||
                            "COURSE_CERTIFICATE"
                          }
                          onChange={(value) =>
                            updateCertificate(index, "certificateType", value)
                          }
                          onBlur={() => markTouched(`certificateType_${index}`)}
                          error={getFieldError(`certificateType_${index}`)}
                          options={CERTIFICATE_TYPE_OPTIONS}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClearDraft}
                disabled={saving || uploadingAvatar}
                className="rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear Draft
              </button>

              <button
                type="submit"
                disabled={shouldDisableSubmit}
                className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Submitting..."
                  : isReviewLocked
                  ? "Profile Locked"
                  : isNoAttemptsLeft
                  ? "No Attempts Left"
                  : isEditPage
                  ? "Resubmit Profile"
                  : "Submit Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {modal && (
        <ResultModal
          modal={modal}
          onClose={() => setModal(null)}
          onGoResubmit={handleGoResubmit}
        />
      )}
    </SetupShell>
  );
}

function SetupShell({ children, onLogout }) {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e1e2eb]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d1117]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <div className="inline-flex items-center text-xl font-extrabold tracking-tight">
            <span className="text-[#00F0FF]">AI</span>
            <span className="ml-1 text-white">Tasker</span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
            Logout
          </button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

function ExpertProfileReviewLimitNotice({
  submissionCount,
  remainingAttempts,
  lockedUntil,
  locked,
  max,
}) {
  const style = locked
    ? "border-red-500/30 bg-red-500/10 text-red-300"
    : remainingAttempts <= 1
    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
    : "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";

  return (
    <section className={`mb-6 rounded-2xl border p-5 ${style}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-bold">
            {locked
              ? "Profile review limit reached"
              : "Profile review attempts"}
          </p>

          <p className="mt-2 text-sm leading-6">
            {locked
              ? "You have used all expert profile review submissions or your profile review is currently locked."
              : "Each correction-required review uses one submission attempt."}
          </p>

          {lockedUntil && (
            <p className="mt-2 text-sm font-bold">
              Locked until: {formatDateTime(lockedUntil)}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-center">
          <p className="text-xs uppercase tracking-wider opacity-80">
            Attempts Remaining
          </p>

          <p className="mt-1 text-2xl font-black">
            {remainingAttempts}/{max}
          </p>

          <p className="mt-1 text-xs opacity-70">
            Used: {submissionCount}/{max}
          </p>
        </div>
      </div>
    </section>
  );
}

function ResultModal({ modal, onClose, onGoResubmit }) {
  const icon =
    modal.type === "success"
      ? "check_circle"
      : modal.type === "warning"
      ? "warning"
      : modal.type === "danger"
      ? "error"
      : "info";

  const color =
    modal.type === "success"
      ? "text-green-300"
      : modal.type === "warning"
      ? "text-yellow-300"
      : modal.type === "danger"
      ? "text-red-300"
      : "text-cyan-300";

  const buttonColor =
    modal.type === "success"
      ? "border-green-300/50 bg-green-300/10 text-green-200 hover:bg-green-300 hover:text-black"
      : modal.type === "warning"
      ? "border-yellow-300/50 bg-yellow-300/10 text-yellow-200 hover:bg-yellow-300 hover:text-black"
      : "border-red-300/50 bg-red-300/10 text-red-200 hover:bg-red-300 hover:text-black";

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <span className={`material-symbols-outlined text-3xl ${color}`}>
              {icon}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-white">
              {modal.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-300">
              {modal.message}
            </p>
          </div>
        </div>

        {modal.detail && (
          <div className="mb-5 whitespace-pre-line rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-gray-300">
            {modal.detail}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {modal.showClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
            >
              Close
            </button>
          )}

          {modal.showResubmit && (
            <button
              type="button"
              onClick={onGoResubmit}
              className={`rounded-xl border px-5 py-3 text-sm font-bold transition ${buttonColor}`}
            >
              Go to Resubmit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Alert({ type, title, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-6 rounded-xl border px-5 py-4 text-sm ${style}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function validateForm(data) {
  const errors = {};

  if (isEmpty(data.professionalTitle)) {
    errors.professionalTitle = "Professional title is required.";
  } else if (String(data.professionalTitle).trim().length < 5) {
    errors.professionalTitle = "Professional title should be at least 5 characters.";
  }

  if (isEmpty(data.bio)) {
    errors.bio = "Bio is required.";
  } else if (String(data.bio).trim().length < 50) {
    errors.bio = "Bio must be at least 50 characters.";
  }

  if (isEmpty(data.skills)) {
    errors.skills = "Skills are required.";
  } else if (String(data.skills).trim().length < 10) {
    errors.skills = "Skills must be more specific.";
  }

  if (isEmpty(data.yearsOfExperience)) {
    errors.yearsOfExperience = "Years of experience is required.";
  }

  const years = Number(data.yearsOfExperience || 0);

  if (
    !isEmpty(data.yearsOfExperience) &&
    (!Number.isFinite(years) || years < 0)
  ) {
    errors.yearsOfExperience = "Years of experience must be 0 or higher.";
  }

  if (isEmpty(data.portfolioUrl)) {
    errors.portfolioUrl = "Portfolio URL is required.";
  } else if (!isValidUrl(data.portfolioUrl)) {
    errors.portfolioUrl = "Portfolio URL must start with http:// or https://";
  }

  if (isEmpty(data.gitHubUrl)) {
    errors.gitHubUrl = "GitHub URL is required.";
  } else if (!isValidUrl(data.gitHubUrl)) {
    errors.gitHubUrl = "GitHub URL must start with http:// or https://";
  } else if (!isGitHubUrl(data.gitHubUrl)) {
    errors.gitHubUrl = "Please enter a valid GitHub profile URL.";
  }

  if (!isEmpty(data.linkedInUrl) && !isValidUrl(data.linkedInUrl)) {
    errors.linkedInUrl =
      "LinkedIn URL must start with http:// or https://. You can leave it empty.";
  }

  if (errors.portfolioUrl || errors.gitHubUrl) {
    errors.publicLinks =
      "Portfolio and GitHub are required. LinkedIn is optional.";
  }

  const certificateUrls = [];
  const certificates = data.certificates || [];

  if (certificates.length > 10) {
    errors.certificates = "Maximum 10 certificates are allowed.";
  }

  certificates.forEach((item, index) => {
    const certificateUrl = String(item?.certificateUrl || "").trim();
    const certificateType = String(item?.certificateType || "").trim();

    if (!certificateUrl) {
      return;
    }

    if (!isValidUrl(certificateUrl)) {
      errors[`certificateUrl_${index}`] =
        "Certificate URL must start with http:// or https://";
    }

    if (!certificateType) {
      errors[`certificateType_${index}`] = "Certificate type is required.";
    } else if (!CERTIFICATE_TYPES.includes(certificateType)) {
      errors[`certificateType_${index}`] = "Certificate type is invalid.";
    }

    certificateUrls.push(certificateUrl.toLowerCase());
  });

  if (certificateUrls.length !== new Set(certificateUrls).size) {
    errors.duplicateCertificates = "Certificate URLs must not be duplicated.";
  }

  return errors;
}

function TextInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  error,
  type = "text",
  inputMode,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-300">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <input
        type={type}
        inputMode={inputMode}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] ${
          error ? "border-red-400/60" : "border-white/10"
        }`}
      />

      <FieldError message={error} />
    </div>
  );
}

function NumberInput(props) {
  return (
    <TextInput
      {...props}
      inputMode="numeric"
      onChange={(nextValue) => {
        if (/^\d*$/.test(nextValue)) props.onChange(nextValue);
      }}
    />
  );
}

function SelectInput({
  label,
  value,
  onChange,
  onBlur,
  required,
  error,
  options,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-300">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF] ${
          error ? "border-red-400/60" : "border-white/10"
        }`}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#151a22] text-white"
          >
            {option.label}
          </option>
        ))}
      </select>

      <FieldError message={error} />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  error,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-300">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={5}
        className={`w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] ${
          error ? "border-red-400/60" : "border-white/10"
        }`}
      />

      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;

  return <p className="mt-2 text-xs font-semibold text-red-300">{message}</p>;
}

function buildFormFromProfile(profile) {
  const certificates = profile?.certificates || profile?.Certificates || [];

  return {
    avatarUrl: profile?.avatarUrl || profile?.AvatarUrl || "",
    professionalTitle:
      profile?.professionalTitle || profile?.ProfessionalTitle || "",
    bio: profile?.bio || profile?.Bio || "",
    skills: profile?.skills || profile?.Skills || "",
    yearsOfExperience:
      profile?.yearsOfExperience ?? profile?.YearsOfExperience ?? "",
    availableForWork:
      profile?.availableForWork ?? profile?.AvailableForWork ?? true,
    portfolioUrl: profile?.portfolioUrl || profile?.PortfolioUrl || "",
    linkedInUrl:
      profile?.linkedInUrl ||
      profile?.LinkedInUrl ||
      profile?.linkedinUrl ||
      "",
    gitHubUrl:
      profile?.gitHubUrl || profile?.GitHubUrl || profile?.githubUrl || "",
    certificates: normalizeCertificatesForForm(certificates),
  };
}

function removeDeprecatedExpertFields(data) {
  const next = { ...(data || {}) };

  delete next.expectedProjectBudgetMin;
  delete next.expectedProjectBudgetMax;
  delete next.preferredProjectDurationDays;
  delete next.ExpectedProjectBudgetMin;
  delete next.ExpectedProjectBudgetMax;
  delete next.PreferredProjectDurationDays;

  delete next.linkedinUrl;
  delete next.githubUrl;

  next.certificates = normalizeCertificatesForForm(next.certificates);

  return next;
}

function normalizeCertificatesForForm(certificates) {
  if (!Array.isArray(certificates)) return [];

  return certificates
    .map((item) => {
      const certificateUrl =
        item?.certificateUrl || item?.CertificateUrl || item?.url || "";

      const certificateType =
        item?.certificateType || item?.CertificateType || "OTHER";

      return {
        certificateUrl: String(certificateUrl || "").trim(),
        certificateType: CERTIFICATE_TYPES.includes(certificateType)
          ? certificateType
          : "OTHER",
      };
    })
    .filter((item) => item.certificateUrl);
}

function normalizeCertificatesForPayload(certificates) {
  if (!Array.isArray(certificates)) return [];

  return certificates
    .map((item) => ({
      certificateUrl: String(item?.certificateUrl || "").trim(),
      certificateType: CERTIFICATE_TYPES.includes(item?.certificateType)
        ? item.certificateType
        : "OTHER",
    }))
    .filter((item) => item.certificateUrl);
}

function extractExpertProfileReviewLimit(data) {
  const maxAttempts =
    Number(
      data?.maxReviewAttempts ||
        data?.MaxReviewAttempts ||
        data?.profileReviewMaxSubmissions ||
        data?.ProfileReviewMaxSubmissions ||
        0
    ) || MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS;

  return {
    submissionCount: Number(
      data?.profileReviewSubmissionCount ||
        data?.ProfileReviewSubmissionCount ||
        data?.reviewAttempts ||
        data?.ReviewAttempts ||
        data?.submissionCount ||
        data?.SubmissionCount ||
        0
    ),
    lockedUntil:
      data?.profileReviewLockedUntil ||
      data?.ProfileReviewLockedUntil ||
      data?.lockedUntil ||
      data?.LockedUntil ||
      "",
    reviewStatus: String(
      data?.profileReviewStatus ||
        data?.ProfileReviewStatus ||
        data?.reviewStatus ||
        data?.ReviewStatus ||
        data?.status ||
        data?.Status ||
        ""
    )
      .trim()
      .toUpperCase(),
    userStatus: String(data?.userStatus || data?.UserStatus || "")
      .trim()
      .toUpperCase(),
    remainingAttempts:
      data?.remainingReviewAttempts ??
      data?.RemainingReviewAttempts ??
      data?.profileReviewRemainingAttempts ??
      data?.ProfileReviewRemainingAttempts ??
      "",
    maxAttempts,
  };
}

function isExpertProfileReviewLocked(limit) {
  if (!limit) return false;

  const reviewStatus = String(limit.reviewStatus || "").toUpperCase();
  const userStatus = String(limit.userStatus || "").toUpperCase();

  if (
    reviewStatus === "LOCKED" ||
    userStatus === "EXPERT_PROFILE_LOCKED" ||
    userStatus === "LOCKED"
  ) {
    return true;
  }

  if (!limit.lockedUntil) return false;

  const lockedUntilTime = new Date(limit.lockedUntil).getTime();

  if (!Number.isFinite(lockedUntilTime)) return false;

  return lockedUntilTime > Date.now();
}

function hasNoExpertProfileAttemptsLeft(limit) {
  if (!limit) return false;
  if (isExpertProfileReviewLocked(limit)) return true;

  const max = Number(limit.maxAttempts || MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS);
  const used = Number(limit.submissionCount || 0);

  if (limit.remainingAttempts !== "" && limit.remainingAttempts !== null) {
    const remaining = Number(limit.remainingAttempts);
    return Number.isFinite(remaining) && remaining <= 0 && used >= max;
  }

  return used >= max;
}

function getRemainingExpertProfileAttempts(limit) {
  if (!limit) return MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS;

  if (limit.remainingAttempts !== "" && limit.remainingAttempts !== null) {
    const remaining = Number(limit.remainingAttempts);

    if (Number.isFinite(remaining)) {
      return Math.max(0, remaining);
    }
  }

  const max = Number(limit.maxAttempts || MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS);
  const used = Number(limit.submissionCount || 0);

  return Math.max(0, max - used);
}

function shouldRedirectToLockedPage(limit) {
  if (!limit) return false;

  return (
    isExpertProfileReviewLocked(limit) ||
    hasNoExpertProfileAttemptsLeft(limit)
  );
}

function buildExpertProfileAttemptText(limit) {
  if (!limit) return "";

  const max = Number(limit.maxAttempts || MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS);
  const used = Number(limit.submissionCount || 0);
  const remaining = getRemainingExpertProfileAttempts(limit);

  return `Review attempts: ${used}/${max}. Remaining attempts: ${remaining}/${max}.`;
}

function getReviewStatus(data) {
  return String(
    data?.profileReviewStatus ||
      data?.ProfileReviewStatus ||
      data?.reviewStatus ||
      data?.ReviewStatus ||
      data?.status ||
      data?.Status ||
      ""
  )
    .trim()
    .toUpperCase();
}

function getUserStatus(data) {
  return String(data?.userStatus || data?.UserStatus || "")
    .trim()
    .toUpperCase();
}

function getReviewNote(data) {
  return (
    data?.reviewNote ||
    data?.ReviewNote ||
    data?.correctionNote ||
    data?.CorrectionNote ||
    data?.rejectionReason ||
    data?.RejectionReason ||
    data?.verificationNote ||
    data?.VerificationNote ||
    ""
  );
}

function getMissingInformation(data) {
  const value =
    data?.missingInformation ||
    data?.MissingInformation ||
    data?.missingFields ||
    data?.MissingFields ||
    "";

  if (Array.isArray(value)) return value.join(", ");

  return String(value || "");
}

function updateLocalUserStatus(status) {
  try {
    const rawUser = localStorage.getItem("user");

    if (!rawUser) return;

    const user = JSON.parse(rawUser);

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...user,
        status,
      })
    );
  } catch {
    // Ignore localStorage errors
  }
}

function saveCorrectionDraft(data) {
  try {
    localStorage.setItem(
      CORRECTION_DRAFT_KEY,
      JSON.stringify({
        ...data,
        certificates: normalizeCertificatesForPayload(data?.certificates),
      })
    );
  } catch {
    // Ignore localStorage errors
  }
}

function clearExpertProfileDrafts() {
  try {
    localStorage.removeItem(SETUP_DRAFT_KEY);
    localStorage.removeItem(EDIT_DRAFT_KEY);
    localStorage.removeItem(CORRECTION_DRAFT_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

function readJson(key) {
  try {
    const value = localStorage.getItem(key);

    if (!value) return null;

    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractUploadUrl(result) {
  if (!result) return "";

  if (typeof result === "string") return result;

  return (
    result.url ||
    result.imageUrl ||
    result.fileUrl ||
    result.avatarUrl ||
    result.data?.url ||
    result.data?.imageUrl ||
    result.data?.fileUrl ||
    result.data?.avatarUrl ||
    ""
  );
}

function getFriendlyError(error) {
  if (typeof expertProfileService.getFriendlyExpertProfileError === "function") {
    try {
      return expertProfileService.getFriendlyExpertProfileError(error);
    } catch {
      // fallback below
    }
  }

  const data = error?.response?.data;
  const message =
    data?.message ||
    data?.title ||
    data?.error ||
    data?.detail ||
    (typeof data === "string" ? data : "") ||
    error?.message ||
    "";

  return cleanupBackendMessage(message);
}

function cleanupBackendMessage(message) {
  const text = String(message || "").trim();

  if (!text) return "Something went wrong. Please try again.";

  if (text.includes("Certificate URL is invalid")) {
    return "Certificate URL is invalid.";
  }

  if (text.includes("Certificate type is invalid")) {
    return "Certificate type is invalid.";
  }

  if (text.includes("Duplicate certificate URL")) {
    return "Certificate URLs must not be duplicated.";
  }

  if (text.includes("already used by another expert")) {
    return "This certificate URL is already used by another expert.";
  }

  if (text.includes("PortfolioUrl") || text.includes("portfolioUrl")) {
    return "Portfolio URL is required or invalid.";
  }

  if (
    text.includes("GitHubUrl") ||
    text.includes("gitHubUrl") ||
    text.includes("githubUrl")
  ) {
    return "GitHub URL is required or invalid.";
  }

  if (
    text.includes("LinkedInUrl") ||
    text.includes("linkedInUrl") ||
    text.includes("linkedinUrl")
  ) {
    return "LinkedIn is optional. You can leave it empty or check the URL again.";
  }

  return text;
}

function isEmpty(value) {
  return String(value ?? "").trim().length === 0;
}

function isValidUrl(value) {
  try {
    const url = new URL(String(value || "").trim());

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isGitHubUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathParts = url.pathname.split("/").filter(Boolean);

    return host === "github.com" && pathParts.length >= 1;
  } catch {
    return false;
  }
}

function formatDateTime(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}