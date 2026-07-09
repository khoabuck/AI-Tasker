import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import authService from "../../../services/auth.service";
import expertProfileService from "../../../services/expertProfile.service";
import uploadService from "../../../services/upload.service";
import { useAuth } from "../../../context/AuthContext";

const SETUP_DRAFT_KEY = "aitasker_expert_profile_setup_draft";
const EDIT_DRAFT_KEY = "aitasker_expert_profile_edit_draft";
const CORRECTION_DRAFT_KEY = "aitasker_expert_profile_correction_draft";
const CORRECTION_FEEDBACK_KEY = "aitasker_expert_profile_correction_feedback";
const RESUBMIT_COUNTER_KEY = "aitasker_expert_profile_resubmit_counter";
const FIELD_SCORE_FEEDBACK_KEY = "aitasker_expert_profile_field_score_feedback";

const MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS = 5;

const CERTIFICATE_TYPE_OPTIONS = [
  { label: "Course Certificate", value: "COURSE_CERTIFICATE" },
  { label: "Professional Certificate", value: "PROFESSIONAL_CERTIFICATE" },
  { label: "Bootcamp Certificate", value: "BOOTCAMP_CERTIFICATE" },
  { label: "Degree Certificate", value: "DEGREE_CERTIFICATE" },
  { label: "Award Certificate", value: "AWARD_CERTIFICATE" },
  { label: "Other", value: "OTHER" },
];

const CERTIFICATE_TYPES = CERTIFICATE_TYPE_OPTIONS.map((item) => item.value);

const emptyForm = {
  fullName: "",
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
    remainingAttempts: MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS,
    maxAttempts: MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS,
  });

  const [resubmitCounter, setResubmitCounter] = useState(() =>
    readJson(RESUBMIT_COUNTER_KEY)
  );

  const [fieldScores, setFieldScores] = useState(() => {
    if (!isEditPage) return {};
    return buildFieldScoreMap(readJson(FIELD_SCORE_FEEDBACK_KEY));
  });

  const formErrors = useMemo(() => validateForm(formData), [formData]);

  const displayReviewLimit = useMemo(() => {
    if (!isEditPage || !resubmitCounter) return reviewLimit;

    const maxAttempts =
      Number(resubmitCounter.maxAttempts || 0) ||
      Number(reviewLimit.maxAttempts || 0) ||
      MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS;

    const submissionCount = Math.min(
      maxAttempts,
      Math.max(0, Number(resubmitCounter.submissionCount || 0))
    );

    const remainingAttempts = Math.max(
      0,
      Number.isFinite(Number(resubmitCounter.remainingAttempts))
        ? Number(resubmitCounter.remainingAttempts)
        : maxAttempts - submissionCount
    );

    return {
      ...reviewLimit,
      submissionCount,
      remainingAttempts,
      maxAttempts,
    };
  }, [isEditPage, reviewLimit, resubmitCounter]);

  const isReviewLocked = isExpertProfileReviewLocked(reviewLimit);
  const isNoAttemptsLeft = hasNoExpertProfileAttemptsLeft(reviewLimit);
  const remainingReviewAttempts =
    getRemainingExpertProfileAttempts(displayReviewLimit);

  const shouldDisableSubmit =
    saving || uploadingAvatar || isReviewLocked || isNoAttemptsLeft;

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditPage]);

  useEffect(() => {
    if (isEditPage) {
      setFieldScores(buildFieldScoreMap(readJson(FIELD_SCORE_FEEDBACK_KEY)));
    } else {
      setFieldScores({});
    }
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

      const registeredFullName = await getRegisteredFullNameFromAuth();
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
        if (
          profileErr?.response?.status !== 404 &&
          profileErr?.status !== 404
        ) {
          throw profileErr;
        }

        profile = null;
      }

      if (correctionDraft) {
        const safeDraft = removeDeprecatedExpertFields(correctionDraft);

        setFormData({
          ...createEmptyForm(),
          ...safeDraft,
          fullName: safeDraft.fullName || registeredFullName,
          availableForWork: true,
          certificates: normalizeCertificatesForForm(safeDraft.certificates),
        });

        return;
      }

      if (normalDraft) {
        const safeDraft = removeDeprecatedExpertFields(normalDraft);

        setFormData({
          ...createEmptyForm(),
          ...safeDraft,
          fullName: safeDraft.fullName || registeredFullName,
          availableForWork: true,
          certificates: normalizeCertificatesForForm(safeDraft.certificates),
        });

        return;
      }

      if (isEditPage && profile) {
        const profileForm = buildFormFromProfile(profile);

        setFormData({
          ...profileForm,
          fullName: profileForm.fullName || registeredFullName,
        });
        return;
      }

      setFormData({
        ...createEmptyForm(),
        fullName: registeredFullName,
      });
    } catch (err) {
      console.error("LOAD EXPERT PROFILE ERROR:", getRawBackendPayload(err));
      setError(
        "We could not load your expert profile right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshProfileLimitFromServer = async () => {
    try {
      const profile = await expertProfileService.getMyExpertProfile();
      const nextLimit = extractExpertProfileReviewLimit(profile);

      setReviewLimit(nextLimit);
      return nextLimit;
    } catch (refreshError) {
      console.error(
        "REFRESH PROFILE LIMIT ERROR:",
        getRawBackendPayload(refreshError)
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
            getRawBackendPayload(avatarErr)
          );
        }
      }
    } catch (err) {
      console.error("AVATAR UPLOAD ERROR:", getRawBackendPayload(err));

      setModal({
        type: "danger",
        title: "Upload failed",
        message: "We could not upload your avatar. Please try again.",
        feedback: null,
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
        "Please check the highlighted fields before submitting your profile."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);

      const submitPayload = {
        ...formData,
        availableForWork: true,
        certificates: normalizeCertificatesForPayload(formData.certificates),
      };

      const previousLimit = reviewLimit;

      const result = isEditPage
        ? await expertProfileService.resubmitExpertProfile(submitPayload)
        : await expertProfileService.createExpertProfile(submitPayload);

      saveCorrectionFeedback(result);

      const nextLimitFromResult = extractExpertProfileReviewLimit(result);
      const refreshedLimit = await refreshProfileLimitFromServer();

      let nextLimit = chooseBestReviewLimit(
        previousLimit,
        nextLimitFromResult,
        refreshedLimit
      );

      if (!didReviewLimitMoveForward(previousLimit, nextLimit)) {
        nextLimit = advanceReviewLimitLocally(previousLimit, result);
      }

      setReviewLimit(nextLimit);

      if (isEditPage) {
        const nextCounter = updateResubmitCounterAfterSubmit(nextLimit);
        setResubmitCounter(nextCounter);
      }

      const reviewStatus = getReviewStatus(result);
      const userStatus = getUserStatus(result);
      const missingInformation = getMissingInformation(result);

      const feedback = buildReviewFeedback({
        backendPayload: result,
        missingInformation,
        limit: isEditPage ? displayReviewLimit : nextLimit,
      });

      if (shouldRedirectToLockedPage(nextLimit)) {
        saveCorrectionDraft(submitPayload);
        updateLocalUserStatus("EXPERT_PROFILE_LOCKED");
        navigate("/expert/profile-locked", { replace: true });
        return;
      }

      if (reviewStatus === "APPROVED" || userStatus === "ACTIVE") {
        clearExpertProfileDrafts();
        clearCorrectionFeedback();
        clearFieldScoreFeedback();
        localStorage.removeItem(RESUBMIT_COUNTER_KEY);
        updateLocalUserStatus("ACTIVE");

        setModal({
          type: "success",
          title: "Profile approved",
          message:
            "Great work. Your expert profile has been approved and is now ready for clients.",
          feedback,
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

        setModal({
          type: "warning",
          title: "Your profile needs improvement",
          message:
            "Your profile is not ready for approval yet. Review your total score and the score summary below.",
          feedback,
          showResubmit: !shouldRedirectToLockedPage(nextLimit),
          showClose: true,
        });

        return;
      }

      if (reviewStatus === "REJECTED") {
        saveCorrectionDraft(submitPayload);
        updateLocalUserStatus("PENDING_PROFILE");

        setModal({
          type: "danger",
          title: "Your profile was not approved",
          message:
            "Your profile did not meet the approval requirements. Please review the score summary before resubmitting.",
          feedback,
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
          "Your profile was submitted successfully. Please review the feedback below.",
        feedback,
        showResubmit: false,
        showClose: true,
      });
    } catch (err) {
      console.error("EXPERT PROFILE SUBMIT ERROR:", getRawBackendPayload(err));

      saveCorrectionDraft(formData);

      const refreshedLimit = await refreshProfileLimitFromServer();

      if (shouldRedirectToLockedPage(refreshedLimit)) {
        updateLocalUserStatus("EXPERT_PROFILE_LOCKED");
        navigate("/expert/profile-locked", { replace: true });
        return;
      }

      setModal({
        type: "danger",
        title: "Submit failed",
        message:
          getSimpleSubmitError(err) ||
          "We could not submit your profile. Please check your information and try again.",
        feedback: null,
        showResubmit: true,
        showClose: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGoResubmit = () => {
    saveCorrectionDraft(formData);

    if (modal?.feedback) {
      saveFieldScoreFeedback(modal.feedback);
      setFieldScores(buildFieldScoreMap(modal.feedback));
    }

    const currentCounter = readJson(RESUBMIT_COUNTER_KEY);

    if (currentCounter) {
      setResubmitCounter(currentCounter);

      setReviewLimit((prev) => ({
        ...prev,
        submissionCount: Number(currentCounter.submissionCount || 0),
        remainingAttempts: Number(currentCounter.remainingAttempts || 0),
        maxAttempts:
          Number(currentCounter.maxAttempts || 0) ||
          Number(prev.maxAttempts || MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS),
      }));
    } else {
      const maxAttempts =
        Number(reviewLimit.maxAttempts || 0) ||
        MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS;

      const nextCounter = startResubmitCounter(maxAttempts);
      setResubmitCounter(nextCounter);

      setReviewLimit((prev) => ({
        ...prev,
        submissionCount: 0,
        remainingAttempts: maxAttempts,
        maxAttempts,
      }));
    }

    setModal(null);
    navigate("/expert/profile/edit", { replace: true });
  };

  const handleClearDraft = () => {
    clearExpertProfileDrafts();
    clearFieldScoreFeedback();
    setFieldScores({});
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
          Loading your profile form...
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
              {isEditPage ? "Update Expert Profile" : "Setup Expert Profile"}
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              {isEditPage
                ? "Improve and resubmit your profile"
                : "Create your expert profile"}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Complete your profile so clients can understand your name, skills,
              experience, public work links, and optional certificates.
              Portfolio and GitHub are required. LinkedIn is optional.
            </p>
          </div>

          {(isEditPage ||
            Number(displayReviewLimit.submissionCount || 0) > 0 ||
            displayReviewLimit.lockedUntil) && (
              <ExpertProfileReviewLimitNotice
                submissionCount={displayReviewLimit.submissionCount}
                remainingAttempts={remainingReviewAttempts}
                lockedUntil={displayReviewLimit.lockedUntil}
                locked={isReviewLocked || isNoAttemptsLeft}
                max={
                  displayReviewLimit.maxAttempts ||
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
                    label="Full Name"
                    required
                    value={formData.fullName}
                    onChange={(value) => updateField("fullName", value)}
                    onBlur={() => markTouched("fullName")}
                    error={getFieldError("fullName")}
                    placeholder="Example: Nguyen Van A"
                    scoreBadge={getFieldScoreBadge(fieldScores, "fullName")}
                  />

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
                    scoreBadge={getFieldScoreBadge(fieldScores, "professionalTitle")}
                  />

                  <TextArea
                    label="Bio"
                    required
                    value={formData.bio}
                    onChange={(value) => updateField("bio", value)}
                    onBlur={() => markTouched("bio")}
                    error={getFieldError("bio")}
                    placeholder="At least 50 characters. Describe your AI experience, projects, and strengths."
                    scoreBadge={getFieldScoreBadge(fieldScores, "bio")}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
                    <TextInput
                      label="Skills"
                      required
                      value={formData.skills}
                      onChange={(value) => updateField("skills", value)}
                      onBlur={() => markTouched("skills")}
                      error={getFieldError("skills")}
                      placeholder="AI Automation, RAG, Chatbot, Python, ASP.NET Core"
                      scoreBadge={getFieldScoreBadge(fieldScores, "skills")}
                    />

                    <NumberInput
                      label="Years of Experience"
                      required
                      value={formData.yearsOfExperience}
                      onChange={(value) =>
                        updateField("yearsOfExperience", value)
                      }
                      onBlur={() => markTouched("yearsOfExperience")}
                      error={getFieldError("yearsOfExperience")}
                      placeholder="3"
                      scoreBadge={getFieldScoreBadge(fieldScores, "yearsOfExperience")}
                    />
                  </div>
                </div>
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
                  scoreBadge={getFieldScoreBadge(fieldScores, "portfolioUrl")}
                />

                <TextInput
                  label="LinkedIn URL"
                  value={formData.linkedInUrl}
                  onChange={(value) => updateField("linkedInUrl", value)}
                  onBlur={() => markTouched("linkedInUrl")}
                  error={getFieldError("linkedInUrl")}
                  placeholder="https://linkedin.com/in/you"
                  scoreBadge={getFieldScoreBadge(fieldScores, "linkedInUrl")}
                />

                <TextInput
                  label="GitHub URL"
                  required
                  value={formData.gitHubUrl}
                  onChange={(value) => updateField("gitHubUrl", value)}
                  onBlur={() => markTouched("gitHubUrl")}
                  error={getFieldError("gitHubUrl")}
                  placeholder="https://github.com/you"
                  scoreBadge={getFieldScoreBadge(fieldScores, "gitHubUrl")}
                />
              </div>

              <FieldError message={submitted ? formErrors.publicLinks : ""} />
            </section>

            <section className="border-t border-white/10 pt-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Certificates
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Optional. If you add one, only Certificate URL and
                    Certificate Type are required.
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
                    You can submit without certificates. Adding certificates can
                    help strengthen your profile.
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
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-white">
                              Certificate {index + 1}
                            </p>

                            {getFieldScoreBadge(fieldScores, "certificates") ? (
                              <ScoreBadge
                                badge={getFieldScoreBadge(fieldScores, "certificates")}
                              />
                            ) : null}
                          </div>

                          <p className="mt-1 text-xs text-gray-500">
                            We will review the certificate link automatically.
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
            {locked ? "Submission limit reached" : "Profile submissions"}
          </p>

          <p className="mt-2 text-sm leading-6">
            {locked
              ? "You have no remaining profile submission attempts."
              : "You have a limited number of attempts to improve and resubmit your profile."}
          </p>

          {lockedUntil && (
            <p className="mt-2 text-sm font-bold">
              Available again: {formatDateTime(lockedUntil)}
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
  const config =
    modal.type === "success"
      ? {
        icon: "check_circle",
        iconColor: "text-green-300",
        badge: "Approved",
        badgeClass: "border-green-400/30 bg-green-400/10 text-green-200",
        actionClass:
          "border-green-300/50 bg-green-300/10 text-green-200 hover:bg-green-300 hover:text-black",
      }
      : modal.type === "warning"
        ? {
          icon: "warning",
          iconColor: "text-yellow-300",
          badge: "Needs Improvement",
          badgeClass: "border-yellow-400/30 bg-yellow-400/10 text-yellow-200",
          actionClass:
            "border-cyan-300/50 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300 hover:text-black",
        }
        : modal.type === "danger"
          ? {
            icon: "error",
            iconColor: "text-red-300",
            badge: "Action Required",
            badgeClass: "border-red-400/30 bg-red-400/10 text-red-200",
            actionClass:
              "border-cyan-300/50 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300 hover:text-black",
          }
          : {
            icon: "info",
            iconColor: "text-cyan-300",
            badge: "Submitted",
            badgeClass: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
            actionClass:
              "border-cyan-300/50 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300 hover:text-black",
          };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        className="
          max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-2xl
          border border-white/10 bg-[#151a22]
          shadow-[0_30px_120px_rgba(0,0,0,0.65)]
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
        "
      >
        <div className="border-b border-white/10 p-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <span
                className={`material-symbols-outlined text-3xl ${config.iconColor}`}
              >
                {config.icon}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${config.badgeClass}`}
              >
                {config.badge}
              </span>

              <h3 className="mt-2 text-lg font-extrabold text-white">
                {modal.title}
              </h3>

              <p className="mt-2 text-sm leading-5 text-gray-300">
                {modal.message}
              </p>
            </div>
          </div>
        </div>

        {modal.feedback ? (
          <ReviewFeedbackPanel feedback={modal.feedback} />
        ) : null}

        <div className="flex flex-col gap-3 border-t border-white/10 p-4 sm:flex-row sm:justify-end">
          {modal.showClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
            >
              Review Later
            </button>
          )}

          {modal.showResubmit && (
            <button
              type="button"
              onClick={onGoResubmit}
              className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${config.actionClass}`}
            >
              Update and Resubmit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewFeedbackPanel({ feedback }) {
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ScoreCard
          label="Current Score"
          value={feedback.scoreText || "N/A"}
          helper="Your total score from this profile review."
          tone={feedback.isPassing ? "success" : "warning"}
        />

        <ScoreCard
          label="Required Score"
          value={feedback.passThresholdText || "N/A"}
          helper="Minimum score required to activate your expert profile."
          tone="info"
        />
      </div>

      <ScoreBreakdownTable items={feedback.scoreBreakdownItems || []} />

      <ImprovementChecklist
        items={feedback.improvementItems || []}
        fallback={feedback.fixAction}
      />
    </div>
  );
}

function ScoreBreakdownTable({ items }) {
  const summaryItems = buildPopupScoreSummaryItems(items);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            Score Summary
          </p>
          <p className="mt-1 text-xs text-gray-400">
            A short overview of your main review categories.
          </p>
        </div>
      </div>

      {summaryItems.length > 0 ? (
        <div className="divide-y divide-white/10">
          {summaryItems.map((item) => (
            <div
              key={item.key}
              className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3"
            >
              <p className="text-sm font-bold text-white">{item.title}</p>

              <p className="text-right font-mono text-sm font-black text-gray-100">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-5 text-sm leading-6 text-gray-400">
          No score summary was returned by the server. Please review the
          general feedback below and improve your profile evidence.
        </div>
      )}
    </div>
  );
}

function buildPopupScoreSummaryItems(items) {
  const sourceItems = Array.isArray(items) ? items : [];

  const profile = findScoreItem(sourceItems, ["profile", "completeness"]);
  const aiSkill = findScoreItem(sourceItems, ["ai", "skill"]) || findScoreItem(sourceItems, ["skill"]);
  const experience = findScoreItem(sourceItems, ["experience"]) || findScoreItem(sourceItems, ["credibility"]);
  const proof =
    findScoreItem(sourceItems, ["proof"]) ||
    findScoreItem(sourceItems, ["portfolio", "github"]) ||
    combineScoreItems(
      "portfolioGithubProof",
      "Portfolio / GitHub Proof",
      sourceItems.filter((item) => {
        const text = getScoreItemText(item);
        return (
          text.includes("portfolio") ||
          text.includes("github") ||
          text.includes("git hub") ||
          text.includes("linkedin") ||
          text.includes("linked in")
        );
      })
    );
  const certificate = findScoreItem(sourceItems, ["certificate"]);
  const trustRisk = findScoreItem(sourceItems, ["trust"]) || findScoreItem(sourceItems, ["risk"]);

  return [
    normalizePopupScoreItem("profileCompleteness", "Profile Completeness", profile),
    normalizePopupScoreItem("aiSkillRelevance", "AI Skill Relevance", aiSkill),
    normalizePopupScoreItem("experience", "Experience", experience),
    normalizePopupScoreItem("portfolioGithubProof", "Portfolio / GitHub Proof", proof),
    normalizePopupScoreItem("certificateEvidence", "Certificate Evidence", certificate),
    normalizePopupScoreItem("trustRisk", "Trust Risk", trustRisk),
  ].filter(Boolean);
}

function normalizePopupScoreItem(key, title, item) {
  if (!item) return null;

  return {
    key,
    title,
    text: formatSectionScore(item),
  };
}

function findScoreItem(items, keywords) {
  return items.find((item) => {
    const text = getScoreItemText(item);
    return keywords.every((keyword) => text.includes(keyword));
  });
}

function combineScoreItems(key, title, items) {
  const validItems = (items || []).filter((item) => Number(item?.maxScore || 0) > 0);

  if (validItems.length === 0) return null;

  return {
    key,
    title,
    score: validItems.reduce((sum, item) => sum + Number(item.score || 0), 0),
    maxScore: validItems.reduce((sum, item) => sum + Number(item.maxScore || 0), 0),
  };
}

function getScoreItemText(item) {
  return String(`${item?.key || ""} ${item?.title || ""}`).toLowerCase();
}

function formatSectionScore(item) {
  if (!item) return "N/A";

  const score = formatScoreNumber(item.score);
  const maxScore = Number(item.maxScore || 0);

  if (maxScore > 0) return `${score}/${formatScoreNumber(maxScore)}`;

  return String(score || "N/A");
}

function formatScoreNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return String(value ?? "N/A");

  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(2)));
}

function ImprovementChecklist({ items, fallback }) {
  const safeItems = Array.isArray(items) ? items.slice(0, 4) : [];

  return (
    <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="material-symbols-outlined mt-0.5 text-yellow-300">
          checklist
        </span>

        <div>
          <p className="font-extrabold text-yellow-100">
            Recommended Improvements
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-300">
            Focus on these items before resubmitting.
          </p>
        </div>
      </div>

      {safeItems.length > 0 ? (
        <div className="space-y-2">
          {safeItems.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
            >
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-300/20 text-[11px] font-black text-yellow-100">
                  {index + 1}
                </div>

                <div>
                  <p className="text-sm font-bold text-white">
                    {item.title || `Improvement ${index + 1}`}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-300">
                    {item.description || fallback}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-gray-200">
          {fallback ||
            "Add clearer project evidence, public work links, and verifiable profile information."}
        </p>
      )}
    </div>
  );
}

function ScoreCard({ label, value, helper, tone }) {
  const toneClass =
    tone === "success"
      ? "border-green-400/20 bg-green-400/10"
      : tone === "warning"
        ? "border-yellow-400/20 bg-yellow-400/10"
        : "border-cyan-400/20 bg-cyan-400/10";

  const valueClass =
    tone === "success"
      ? "text-green-200"
      : tone === "warning"
        ? "text-yellow-200"
        : "text-cyan-200";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
        {label}
      </p>

      <p className={`mt-3 text-3xl font-black ${valueClass}`}>{value}</p>

      <p className="mt-2 text-xs leading-5 text-gray-400">{helper}</p>
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
  scoreBadge,
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} scoreBadge={scoreBadge} />

      <input
        type={type}
        inputMode={inputMode}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] ${error ? "border-red-400/60" : "border-white/10"
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
  scoreBadge,
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} scoreBadge={scoreBadge} />

      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF] ${error ? "border-red-400/60" : "border-white/10"
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
  scoreBadge,
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} scoreBadge={scoreBadge} />

      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={5}
        className={`w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${error ? "border-red-400/60" : "border-white/10"
          }`}
      />

      <FieldError message={error} />
    </div>
  );
}

function FieldLabel({ label, required, scoreBadge }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <label className="block text-sm font-bold text-gray-300">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      {scoreBadge ? <ScoreBadge badge={scoreBadge} /> : null}
    </div>
  );
}

function ScoreBadge({ badge }) {
  const toneClass =
    badge.tone === "success"
      ? "border-green-400/30 bg-green-400/10 text-green-200"
      : badge.tone === "danger"
        ? "border-red-400/30 bg-red-400/10 text-red-200"
        : "border-yellow-400/30 bg-yellow-400/10 text-yellow-100";

  const icon = badge.tone === "success" ? "✓" : "⚠";

  return (
    <span
      title={badge.label || "Review score"}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${toneClass}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{badge.text}</span>
    </span>
  );
}

function FieldError({ message }) {
  if (!message) return null;

  return <p className="mt-2 text-xs font-semibold text-red-300">{message}</p>;
}
function validateForm(data) {
  const errors = {};

  if (isEmpty(data.fullName)) {
    errors.fullName = "Full name is required.";
  } else if (String(data.fullName).trim().length < 2) {
    errors.fullName = "Full name should be at least 2 characters.";
  }

  if (isEmpty(data.professionalTitle)) {
    errors.professionalTitle = "Professional title is required.";
  } else if (String(data.professionalTitle).trim().length < 5) {
    errors.professionalTitle =
      "Professional title should be at least 5 characters.";
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

    if (!certificateUrl) return;

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

function buildFormFromProfile(profile) {
  const certificates = profile?.certificates || profile?.Certificates || [];

  return {
    fullName:
      profile?.fullName ||
      profile?.FullName ||
      profile?.userFullName ||
      profile?.UserFullName ||
      profile?.name ||
      "",
    avatarUrl: profile?.avatarUrl || profile?.AvatarUrl || "",
    professionalTitle:
      profile?.professionalTitle || profile?.ProfessionalTitle || "",
    bio: profile?.bio || profile?.Bio || "",
    skills: profile?.skills || profile?.Skills || "",
    yearsOfExperience:
      profile?.yearsOfExperience ?? profile?.YearsOfExperience ?? "",
    availableForWork: true,
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

  next.availableForWork = true;
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

function buildReviewFeedback({ backendPayload, missingInformation, limit }) {
  const reviewNote = getReviewNote(backendPayload);
  const scoreInfo = extractProfileScoreInfo(backendPayload);
  const parsedScore = parseFinalProfileScore(reviewNote);

  const scoreText =
    parsedScore.text ||
    scoreInfo.profileScoreText ||
    buildScoreText(scoreInfo) ||
    "N/A";

  const passThreshold =
    parsePassThreshold(reviewNote) ?? scoreInfo.profilePassScore ?? null;

  const passThresholdText =
    passThreshold !== null && passThreshold !== undefined
      ? `${passThreshold}/${scoreInfo.profileScoreMax || 100}`
      : "N/A";

  const normalizedLimit = normalizeReviewLimit(limit);
  const scoreBreakdownItems = buildScoreBreakdownItems(
    backendPayload,
    reviewNote
  );

  const improvementItems = buildImprovementItems({
    reviewNote,
    missingInformation,
    scoreBreakdownItems,
  });

  const scorePercent = getScorePercent(scoreText);
  const passPercent =
    passThreshold !== null && scoreInfo.profileScoreMax
      ? Math.round(
        (Number(passThreshold) / Number(scoreInfo.profileScoreMax)) * 100
      )
      : 70;

  return {
    scoreText,
    passThresholdText,
    scoreBreakdownItems,
    improvementItems,
    isPassing: scorePercent !== null && scorePercent >= passPercent,
    fixAction: buildFixAction({
      reviewNote,
      missingInformation,
      improvementItems,
    }),
    attempts: {
      used: normalizedLimit.submissionCount,
      remaining: normalizedLimit.remainingAttempts,
      max: normalizedLimit.maxAttempts,
    },
  };
}

function buildScoreBreakdownItems(data, reviewNote) {
  const raw = data?.raw || data?.Raw || data || {};

  const scoreBreakdown =
    data?.scoreBreakdown ||
    data?.ScoreBreakdown ||
    raw?.scoreBreakdown ||
    raw?.ScoreBreakdown ||
    null;

  const items = [];

  if (scoreBreakdown && typeof scoreBreakdown === "object") {
    Object.entries(scoreBreakdown).forEach(([key, value]) => {
      if (value && typeof value === "object") {
        const score = Number(
          value.score ?? value.value ?? value.points ?? value.currentScore ?? 0
        );

        const maxScore = Number(value.maxScore ?? value.max ?? value.total ?? 0);

        const note =
          value.note ||
          value.reason ||
          value.description ||
          value.message ||
          "";

        const passedValue = value.passed ?? value.isPassed;
        const passed =
          typeof passedValue === "boolean"
            ? passedValue
            : maxScore > 0
              ? score / maxScore >= 0.7
              : false;

        items.push({
          key,
          title: value.label || value.name || toReadableLabel(key),
          score: Number.isFinite(score) ? score : 0,
          maxScore: Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 0,
          note,
          status: passed ? "good" : "weak",
        });
      } else if (typeof value === "number") {
        items.push({
          key,
          title: toReadableLabel(key),
          score: value,
          maxScore: 0,
          note: "",
          status: "info",
        });
      }
    });
  }

  if (items.length > 0) return items;

  return buildScoreBreakdownFromReviewNote(reviewNote);
}

function buildScoreBreakdownFromReviewNote(reviewNote) {
  const text = String(reviewNote || "");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  const result = [];

  lines.forEach((line) => {
    const match = line.match(
      /^(.+?):\s*(\d+)\s*\/\s*(\d+)(?:\s*[-–]\s*(.+))?$/i
    );

    if (!match) return;

    const score = Number(match[2]);
    const maxScore = Number(match[3]);

    result.push({
      key: toCamelKey(match[1]),
      title: match[1].trim(),
      score,
      maxScore,
      note: match[4] || "",
      status: maxScore > 0 && score / maxScore >= 0.7 ? "good" : "weak",
    });
  });

  return result;
}

function buildImprovementItems({
  reviewNote,
  missingInformation,
  scoreBreakdownItems,
}) {
  const groupedItems = [];
  const weakScoreItems = (scoreBreakdownItems || []).filter(isLowScoreItem);

  const missingText = String(missingInformation || "").trim();

  if (missingText) {
    addUniqueImprovement(groupedItems, {
      key: "missing",
      title: "Add missing information",
      description: shortenText(missingText, 120),
    });
  }

  weakScoreItems.forEach((item) => {
    addUniqueImprovement(groupedItems, getImprovementSuggestion(item));
  });

  const textItems = extractUsefulFeedbackLines(reviewNote);

  textItems.forEach((item) => {
    addUniqueImprovement(groupedItems, {
      key: toCamelKey(item.title),
      title: item.title,
      description: shortenText(item.description, 120),
    });
  });

  if (groupedItems.length > 0) return groupedItems.slice(0, 4);

  return [
    {
      key: "evidence",
      title: "Add stronger evidence",
      description:
        "Add real project links, GitHub repositories, portfolio case studies, or certificates.",
    },
  ];
}

function isLowScoreItem(item) {
  if (!item) return false;

  const maxScore = Number(item.maxScore || 0);
  const score = Number(item.score || 0);

  if (!Number.isFinite(maxScore) || maxScore <= 0) return false;
  if (!Number.isFinite(score)) return false;

  return score / maxScore < 0.7;
}

function getImprovementSuggestion(item) {
  const title = String(item?.title || "").toLowerCase();

  if (title.includes("portfolio") || title.includes("github")) {
    return {
      key: "public-work",
      title: "Improve portfolio and GitHub proof",
      description:
        "Show real AI projects with clear repositories, demos, screenshots, or case studies.",
    };
  }

  if (title.includes("proof") || title.includes("evidence")) {
    return {
      key: "project-proof",
      title: "Add stronger project proof",
      description:
        "Include direct AI project links, demos, screenshots, or real work examples.",
    };
  }

  if (title.includes("linkedin")) {
    return {
      key: "professional-profile",
      title: "Add professional profile evidence",
      description:
        "Add LinkedIn if available, or strengthen your public work and profile links.",
    };
  }

  if (title.includes("certificate") || title.includes("trust")) {
    return {
      key: "verification",
      title: "Make your information easier to verify",
      description:
        "Use consistent names across your profile, certificates, and public links.",
    };
  }

  if (title.includes("bio") || title.includes("skill") || title.includes("profile")) {
    return {
      key: "profile-detail",
      title: "Clarify your expert profile",
      description:
        "Describe your AI skills, experience, and project results more clearly.",
    };
  }

  return {
    key: toCamelKey(item?.title || "improvement"),
    title: `Improve ${item?.title || "this section"}`,
    description: "Add clearer and more verifiable information for this section.",
  };
}

function addUniqueImprovement(items, nextItem) {
  if (!nextItem) return;

  const key = String(nextItem.key || nextItem.title || "").toLowerCase();

  if (items.some((item) => String(item.key || item.title || "").toLowerCase() === key)) {
    return;
  }

  items.push(nextItem);
}

function shortenText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function extractUsefulFeedbackLines(reviewNote) {
  const text = String(reviewNote || "").trim();

  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/Final profile score/i.test(line) &&
        !/Pass threshold/i.test(line) &&
        line.length >= 12
    );

  const useful = lines.filter((line) =>
    /missing|weak|invalid|not enough|low|required|unsupported|evidence|portfolio|github|certificate|experience|bio|skill/i.test(
      line
    )
  );

  return useful.slice(0, 6).map((line, index) => {
    const [label, ...rest] = line.split(":");
    const hasLabel = rest.length > 0 && label.length <= 45;

    return {
      title: hasLabel ? label.trim() : `Issue ${index + 1}`,
      description: hasLabel ? rest.join(":").trim() : line,
    };
  });
}

function buildFixAction({ reviewNote, missingInformation, improvementItems }) {
  const missingText = String(missingInformation || "").trim();

  if (missingText) {
    return "Complete the missing information listed above, then resubmit your profile for another review.";
  }

  const text = String(reviewNote || "").trim();

  const actionFromText =
    extractSentence(text, /Additional evidence is required/i) ||
    extractSentence(text, /Please add/i) ||
    extractSentence(text, /You should add/i) ||
    "";

  if (actionFromText) return actionFromText;

  const titles = (improvementItems || []).map((item) => item.title);

  if (titles.length > 0) {
    return `Improve these sections: ${titles.join(
      ", "
    )}. After updating them, click "Update and Resubmit Profile".`;
  }

  return "Add stronger evidence such as detailed project descriptions, certificates, GitHub repositories, portfolio links, or a LinkedIn profile.";
}

function extractProfileScoreInfo(data) {
  const raw = data?.raw || data?.Raw || data || {};

  const profileScore = toNumberOrNull(
    pickFirst(
      data?.profileScore,
      data?.ProfileScore,
      data?.score,
      data?.Score,
      raw?.profileScore,
      raw?.ProfileScore,
      raw?.score,
      raw?.Score
    )
  );

  const profileScoreMax = toNumberOrNull(
    pickFirst(
      data?.profileScoreMax,
      data?.ProfileScoreMax,
      data?.maxScore,
      data?.MaxScore,
      data?.scoreMax,
      data?.ScoreMax,
      raw?.profileScoreMax,
      raw?.ProfileScoreMax,
      raw?.maxScore,
      raw?.MaxScore,
      raw?.scoreMax,
      raw?.ScoreMax
    )
  );

  const profilePassScore = toNumberOrNull(
    pickFirst(
      data?.profilePassScore,
      data?.ProfilePassScore,
      data?.passScore,
      data?.PassScore,
      data?.requiredScore,
      data?.RequiredScore,
      raw?.profilePassScore,
      raw?.ProfilePassScore,
      raw?.passScore,
      raw?.PassScore,
      raw?.requiredScore,
      raw?.RequiredScore
    )
  );

  const profileScoreText =
    pickFirst(
      data?.profileScoreText,
      data?.ProfileScoreText,
      raw?.profileScoreText,
      raw?.ProfileScoreText
    ) || buildScoreText({ profileScore, profileScoreMax });

  return {
    profileScore,
    profileScoreMax,
    profilePassScore,
    profileScoreText,
  };
}

function parseFinalProfileScore(text) {
  const match = String(text || "").match(
    /Final profile score:\s*(\d+)\s*\/\s*(\d+)/i
  );

  if (!match) {
    return {
      score: null,
      maxScore: null,
      text: "",
    };
  }

  return {
    score: Number(match[1]),
    maxScore: Number(match[2]),
    text: `${match[1]}/${match[2]}`,
  };
}

function parsePassThreshold(text) {
  return extractNumber(text, /Pass threshold:\s*(\d+)/i);
}

function extractExpertProfileReviewLimit(data) {
  const raw = data?.raw || data?.Raw || data || {};

  const maxAttempts =
    toNumberOrNull(
      pickFirst(
        data?.maxReviewAttempts,
        data?.MaxReviewAttempts,
        data?.profileReviewMaxSubmissions,
        data?.ProfileReviewMaxSubmissions,
        data?.maxAttempts,
        data?.MaxAttempts,
        raw?.maxReviewAttempts,
        raw?.MaxReviewAttempts,
        raw?.profileReviewMaxSubmissions,
        raw?.ProfileReviewMaxSubmissions,
        raw?.maxAttempts,
        raw?.MaxAttempts
      )
    ) || MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS;

  const submissionCount =
    toNumberOrNull(
      pickFirst(
        data?.profileReviewSubmissionCount,
        data?.ProfileReviewSubmissionCount,
        data?.reviewAttempts,
        data?.ReviewAttempts,
        data?.submissionCount,
        data?.SubmissionCount,
        data?.submissionCountUsed,
        data?.SubmissionCountUsed,
        raw?.profileReviewSubmissionCount,
        raw?.ProfileReviewSubmissionCount,
        raw?.reviewAttempts,
        raw?.ReviewAttempts,
        raw?.submissionCount,
        raw?.SubmissionCount,
        raw?.submissionCountUsed,
        raw?.SubmissionCountUsed
      )
    ) || 0;

  const explicitRemaining = toNumberOrNull(
    pickFirst(
      data?.remainingReviewAttempts,
      data?.RemainingReviewAttempts,
      data?.profileReviewRemainingAttempts,
      data?.ProfileReviewRemainingAttempts,
      data?.remainingAttempts,
      data?.RemainingAttempts,
      raw?.remainingReviewAttempts,
      raw?.RemainingReviewAttempts,
      raw?.profileReviewRemainingAttempts,
      raw?.ProfileReviewRemainingAttempts,
      raw?.remainingAttempts,
      raw?.RemainingAttempts
    )
  );

  const remainingAttempts =
    explicitRemaining !== null
      ? Math.max(0, explicitRemaining)
      : Math.max(0, maxAttempts - submissionCount);

  return {
    submissionCount,
    lockedUntil:
      pickFirst(
        data?.profileReviewLockedUntil,
        data?.ProfileReviewLockedUntil,
        data?.lockedUntil,
        data?.LockedUntil,
        raw?.profileReviewLockedUntil,
        raw?.ProfileReviewLockedUntil,
        raw?.lockedUntil,
        raw?.LockedUntil
      ) || "",
    reviewStatus: String(
      pickFirst(
        data?.profileReviewStatus,
        data?.ProfileReviewStatus,
        data?.reviewStatus,
        data?.ReviewStatus,
        data?.status,
        data?.Status,
        raw?.profileReviewStatus,
        raw?.ProfileReviewStatus,
        raw?.reviewStatus,
        raw?.ReviewStatus,
        raw?.status,
        raw?.Status
      ) || ""
    )
      .trim()
      .toUpperCase(),
    userStatus: String(
      pickFirst(
        data?.userStatus,
        data?.UserStatus,
        raw?.userStatus,
        raw?.UserStatus
      ) || ""
    )
      .trim()
      .toUpperCase(),
    remainingAttempts,
    maxAttempts,
  };
}

function chooseBestReviewLimit(previousLimit, resultLimit, refreshedLimit) {
  if (isMeaningfulReviewLimit(refreshedLimit)) {
    return normalizeReviewLimit(refreshedLimit);
  }

  if (isMeaningfulReviewLimit(resultLimit)) {
    return normalizeReviewLimit(resultLimit);
  }

  return normalizeReviewLimit(previousLimit);
}

function isMeaningfulReviewLimit(limit) {
  if (!limit) return false;

  return (
    Number(limit.submissionCount || 0) > 0 ||
    Number(limit.remainingAttempts || 0) <
    Number(limit.maxAttempts || MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS) ||
    Boolean(limit.lockedUntil) ||
    Boolean(limit.reviewStatus) ||
    Boolean(limit.userStatus)
  );
}

function normalizeReviewLimit(limit) {
  const maxAttempts =
    Number(limit?.maxAttempts || MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS) ||
    MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS;

  const submissionCount = Math.max(0, Number(limit?.submissionCount || 0));

  const remainingAttempts =
    limit?.remainingAttempts !== "" &&
      limit?.remainingAttempts !== null &&
      limit?.remainingAttempts !== undefined
      ? Math.max(0, Number(limit.remainingAttempts || 0))
      : Math.max(0, maxAttempts - submissionCount);

  return {
    submissionCount,
    lockedUntil: limit?.lockedUntil || "",
    reviewStatus: String(limit?.reviewStatus || "").toUpperCase(),
    userStatus: String(limit?.userStatus || "").toUpperCase(),
    remainingAttempts,
    maxAttempts,
  };
}

function didReviewLimitMoveForward(previousLimit, nextLimit) {
  if (!previousLimit || !nextLimit) return false;

  const previousUsed = Number(previousLimit.submissionCount || 0);
  const nextUsed = Number(nextLimit.submissionCount || 0);

  const previousRemaining = getRemainingExpertProfileAttempts(previousLimit);
  const nextRemaining = getRemainingExpertProfileAttempts(nextLimit);

  return nextUsed > previousUsed || nextRemaining < previousRemaining;
}

function advanceReviewLimitLocally(previousLimit, result) {
  const base = normalizeReviewLimit(previousLimit);
  const reviewStatus = getReviewStatus(result);

  const shouldCountAttempt =
    reviewStatus === "NEEDS_CORRECTION" ||
    reviewStatus === "REJECTED" ||
    reviewStatus === "PENDING" ||
    reviewStatus === "";

  if (!shouldCountAttempt) return base;

  const nextUsed = Math.min(base.maxAttempts, Number(base.submissionCount) + 1);

  return {
    ...base,
    submissionCount: nextUsed,
    remainingAttempts: Math.max(0, base.maxAttempts - nextUsed),
    reviewStatus: reviewStatus || base.reviewStatus,
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
  const remaining = getRemainingExpertProfileAttempts(limit);

  return remaining <= 0 && Number(limit.submissionCount || 0) >= max;
}

function getRemainingExpertProfileAttempts(limit) {
  if (!limit) return MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS;

  if (
    limit.remainingAttempts !== "" &&
    limit.remainingAttempts !== null &&
    limit.remainingAttempts !== undefined
  ) {
    const remaining = Number(limit.remainingAttempts);

    if (Number.isFinite(remaining)) return Math.max(0, remaining);
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

function buildScoreText(scoreInfo) {
  const score = scoreInfo?.profileScore;
  const maxScore = scoreInfo?.profileScoreMax;

  if (score === null || score === undefined) return "";
  if (maxScore === null || maxScore === undefined) return String(score);

  return `${score}/${maxScore}`;
}

function getScorePercent(scoreText) {
  const match = String(scoreText || "").match(/(\d+)\s*\/\s*(\d+)/);

  if (!match) return null;

  const score = Number(match[1]);
  const maxScore = Number(match[2]);

  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
    return null;
  }

  return Math.round((score / maxScore) * 100);
}

function getReviewStatus(data) {
  const raw = data?.raw || data?.Raw || data || {};

  return String(
    pickFirst(
      data?.profileReviewStatus,
      data?.ProfileReviewStatus,
      data?.reviewStatus,
      data?.ReviewStatus,
      data?.status,
      data?.Status,
      raw?.profileReviewStatus,
      raw?.ProfileReviewStatus,
      raw?.reviewStatus,
      raw?.ReviewStatus,
      raw?.status,
      raw?.Status
    ) || ""
  )
    .trim()
    .toUpperCase();
}

function getUserStatus(data) {
  const raw = data?.raw || data?.Raw || data || {};

  return String(
    pickFirst(
      data?.userStatus,
      data?.UserStatus,
      raw?.userStatus,
      raw?.UserStatus
    ) || ""
  )
    .trim()
    .toUpperCase();
}

function getReviewNote(data) {
  const raw = data?.raw || data?.Raw || data || {};

  return (
    pickFirst(
      data?.profileReviewNote,
      data?.ProfileReviewNote,
      data?.reviewNote,
      data?.ReviewNote,
      data?.correctionNote,
      data?.CorrectionNote,
      data?.rejectionReason,
      data?.RejectionReason,
      data?.verificationNote,
      data?.VerificationNote,
      raw?.profileReviewNote,
      raw?.ProfileReviewNote,
      raw?.reviewNote,
      raw?.ReviewNote,
      raw?.correctionNote,
      raw?.CorrectionNote,
      raw?.rejectionReason,
      raw?.RejectionReason,
      raw?.verificationNote,
      raw?.VerificationNote
    ) || ""
  );
}

function getMissingInformation(data) {
  const raw = data?.raw || data?.Raw || data || {};

  const value = pickFirst(
    data?.missingInformation,
    data?.MissingInformation,
    data?.missingFields,
    data?.MissingFields,
    raw?.missingInformation,
    raw?.MissingInformation,
    raw?.missingFields,
    raw?.MissingFields
  );

  if (Array.isArray(value)) return value.join(", ");

  return String(value || "");
}

function saveFieldScoreFeedback(feedback) {
  try {
    localStorage.setItem(
      FIELD_SCORE_FEEDBACK_KEY,
      JSON.stringify({
        scoreBreakdownItems: feedback?.scoreBreakdownItems || [],
      })
    );
  } catch {
    // Ignore localStorage errors
  }
}

function clearFieldScoreFeedback() {
  try {
    localStorage.removeItem(FIELD_SCORE_FEEDBACK_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

function buildFieldScoreMap(feedback) {
  const items = Array.isArray(feedback?.scoreBreakdownItems)
    ? feedback.scoreBreakdownItems
    : Array.isArray(feedback)
      ? feedback
      : [];

  const map = {};

  const profile = findScoreItem(items, ["profile", "completeness"]);
  const aiSkill = findScoreItem(items, ["ai", "skill"]) || findScoreItem(items, ["skill"]);
  const experience = findScoreItem(items, ["experience"]) || findScoreItem(items, ["credibility"]);
  const portfolio = findScoreItem(items, ["portfolio"]);
  const github = findScoreItem(items, ["github"]) || findScoreItem(items, ["git", "hub"]);
  const linkedIn = findScoreItem(items, ["linkedin"]) || findScoreItem(items, ["linked", "in"]);
  const certificate = findScoreItem(items, ["certificate"]);

  const profileBadge = buildScoreBadgeFromItem(profile);
  const aiSkillBadge = buildScoreBadgeFromItem(aiSkill);
  const experienceBadge = buildScoreBadgeFromItem(experience);
  const portfolioBadge = buildScoreBadgeFromItem(portfolio);
  const githubBadge = buildScoreBadgeFromItem(github);
  const linkedInBadge = buildScoreBadgeFromItem(linkedIn);
  const certificateBadge = buildScoreBadgeFromItem(certificate);

  if (profileBadge) {
    map.fullName = profileBadge;
    map.professionalTitle = profileBadge;
    map.bio = profileBadge;
  }

  if (aiSkillBadge) {
    map.skills = aiSkillBadge;
  }

  if (experienceBadge) {
    map.yearsOfExperience = experienceBadge;
  }

  if (portfolioBadge) {
    map.portfolioUrl = portfolioBadge;
  }

  if (githubBadge) {
    map.gitHubUrl = githubBadge;
  }

  if (linkedInBadge) {
    map.linkedInUrl = linkedInBadge;
  }

  if (certificateBadge) {
    map.certificates = certificateBadge;
  }

  return map;
}

function buildScoreBadgeFromItem(item) {
  if (!item) return null;

  const maxScore = Number(item.maxScore || 0);
  const score = Number(item.score || 0);

  if (!Number.isFinite(score)) return null;

  const text = maxScore > 0
    ? `${formatScoreNumber(score)}/${formatScoreNumber(maxScore)}`
    : formatScoreNumber(score);

  const percent = maxScore > 0 ? score / maxScore : null;

  return {
    text,
    label: item.title || "Review score",
    tone:
      percent === null
        ? "warning"
        : percent >= 0.8
          ? "success"
          : percent >= 0.5
            ? "warning"
            : "danger",
  };
}

function getFieldScoreBadge(fieldScores, fieldName) {
  if (!fieldScores || !fieldName) return null;

  return fieldScores[fieldName] || null;
}

async function getRegisteredFullNameFromAuth() {
  const storedName = extractRegisteredFullName(authService.getCurrentUser?.());

  try {
    const freshUser = await authService.refreshCurrentUser();
    return extractRegisteredFullName(freshUser) || storedName;
  } catch {
    return storedName;
  }
}

function extractRegisteredFullName(user) {
  if (!user) return "";

  return String(
    pickFirst(
      user.fullName,
      user.FullName,
      user.name,
      user.Name,
      user.displayName,
      user.DisplayName
    ) || ""
  ).trim();
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

function startResubmitCounter(maxAttempts) {
  const safeMax =
    Number(maxAttempts || 0) || MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS;

  const counter = {
    submissionCount: 0,
    remainingAttempts: safeMax,
    maxAttempts: safeMax,
  };

  try {
    localStorage.setItem(RESUBMIT_COUNTER_KEY, JSON.stringify(counter));
  } catch {
    // Ignore localStorage errors
  }

  return counter;
}

function updateResubmitCounterAfterSubmit(limit) {
  const current = readJson(RESUBMIT_COUNTER_KEY);

  const maxAttempts =
    Number(current?.maxAttempts || 0) ||
    Number(limit?.maxAttempts || 0) ||
    MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS;

  const currentUsed = Math.max(0, Number(current?.submissionCount || 0));
  const nextUsed = Math.min(maxAttempts, currentUsed + 1);

  const counter = {
    submissionCount: nextUsed,
    remainingAttempts: Math.max(0, maxAttempts - nextUsed),
    maxAttempts,
  };

  try {
    localStorage.setItem(RESUBMIT_COUNTER_KEY, JSON.stringify(counter));
  } catch {
    // Ignore localStorage errors
  }

  return counter;
}

function saveCorrectionDraft(data) {
  try {
    localStorage.setItem(
      CORRECTION_DRAFT_KEY,
      JSON.stringify({
        ...data,
        availableForWork: true,
        certificates: normalizeCertificatesForPayload(data?.certificates),
      })
    );
  } catch {
    // Ignore localStorage errors
  }
}

function saveCorrectionFeedback(data) {
  try {
    localStorage.setItem(CORRECTION_FEEDBACK_KEY, JSON.stringify(data || {}));
  } catch {
    // Ignore localStorage errors
  }
}

function clearCorrectionFeedback() {
  try {
    localStorage.removeItem(CORRECTION_FEEDBACK_KEY);
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

function getRawBackendPayload(error) {
  return (
    error?.originalError?.response?.data ||
    error?.response?.data ||
    error?.data ||
    error
  );
}

function getSimpleSubmitError(error) {
  const payload = getRawBackendPayload(error);

  if (typeof payload === "string") return payload;

  const message =
    payload?.message ||
    payload?.title ||
    payload?.detail ||
    payload?.error ||
    error?.message ||
    "";

  if (!message) return "";

  if (message.includes("FullName") || message.includes("fullName")) {
    return "Full name is required.";
  }

  if (message.includes("Certificate URL is invalid")) {
    return "One of your certificate links is invalid.";
  }

  if (message.includes("Certificate type is invalid")) {
    return "One of your certificate types is invalid.";
  }

  if (message.includes("Duplicate certificate URL")) {
    return "Certificate links must not be duplicated.";
  }

  if (message.includes("already used by another expert")) {
    return "One of your certificate links is already used by another expert.";
  }

  return message;
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);

  if (!Number.isFinite(number)) return null;

  return number;
}

function extractNumber(text, regex) {
  const match = String(text || "").match(regex);

  if (!match) return null;

  const value = Number(match[1]);

  return Number.isFinite(value) ? value : null;
}

function extractSentence(text, regex) {
  const sentences = String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.find((sentence) => regex.test(sentence)) || "";
}

function toReadableLabel(value) {
  return String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function toCamelKey(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^./, (char) => char.toLowerCase());
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}