import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import authService from "../../../services/auth.service";
import expertProfileService from "../../../services/expertProfile.service";
import uploadService from "../../../services/upload.service";

const SETUP_DRAFT_KEY = "aitasker_expert_profile_setup_draft";
const EDIT_DRAFT_KEY = "aitasker_expert_profile_edit_draft";
const CORRECTION_DRAFT_KEY = "aitasker_expert_profile_correction_draft";

const emptyForm = {
  avatarUrl: "",
  professionalTitle: "",
  bio: "",
  skills: "",
  yearsOfExperience: "",
  expectedProjectBudgetMin: "",
  expectedProjectBudgetMax: "",
  preferredProjectDurationDays: "",
  availableForWork: true,
  portfolioUrl: "",
  linkedInUrl: "",
  gitHubUrl: "",
  certificates: [
    {
      certificateName: "",
      certificateIssuer: "",
      certificateUrl: "",
      issuedAt: "",
    },
  ],
};

export default function SetupExpertProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const isEditPage = location.pathname === "/expert/profile/edit";
  const draftKey = isEditPage ? EDIT_DRAFT_KEY : SETUP_DRAFT_KEY;

  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(isEditPage);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});

  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const formErrors = useMemo(() => validateForm(formData), [formData]);

  useEffect(() => {
    loadInitialData();
  }, [isEditPage]);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(formData));
  }, [formData, draftKey]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError("");

      const correctionDraft = readJson(CORRECTION_DRAFT_KEY);
      const normalDraft = readJson(draftKey);

      if (correctionDraft) {
        setFormData({
          ...emptyForm,
          ...correctionDraft,
          certificates:
            Array.isArray(correctionDraft.certificates) &&
            correctionDraft.certificates.length > 0
              ? correctionDraft.certificates
              : emptyForm.certificates,
        });
        return;
      }

      if (normalDraft) {
        setFormData({
          ...emptyForm,
          ...normalDraft,
          certificates:
            Array.isArray(normalDraft.certificates) &&
            normalDraft.certificates.length > 0
              ? normalDraft.certificates
              : emptyForm.certificates,
        });
        return;
      }

      if (isEditPage) {
        const profile = await expertProfileService.getMyExpertProfile();

        setFormData({
          avatarUrl: profile?.avatarUrl || "",
          professionalTitle: profile?.professionalTitle || "",
          bio: profile?.bio || "",
          skills: profile?.skills || "",
          yearsOfExperience: profile?.yearsOfExperience ?? "",
          expectedProjectBudgetMin: profile?.expectedProjectBudgetMin ?? "",
          expectedProjectBudgetMax: profile?.expectedProjectBudgetMax ?? "",
          preferredProjectDurationDays:
            profile?.preferredProjectDurationDays ?? "",
          availableForWork:
            profile?.availableForWork === undefined
              ? true
              : Boolean(profile.availableForWork),
          portfolioUrl: profile?.portfolioUrl || "",
          linkedInUrl: profile?.linkedInUrl || "",
          gitHubUrl: profile?.gitHubUrl || "",
          certificates:
            Array.isArray(profile?.certificates) &&
            profile.certificates.length > 0
              ? profile.certificates.map((item) => ({
                  certificateName: item.certificateName || "",
                  certificateIssuer: item.certificateIssuer || "",
                  certificateUrl: item.certificateUrl || "",
                  issuedAt: item.issuedAt
                    ? String(item.issuedAt).slice(0, 10)
                    : "",
                }))
              : emptyForm.certificates,
        });
      }
    } catch (err) {
      console.error("LOAD EXPERT PROFILE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
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

  const getGroupError = (name, fieldNames = []) => {
    const groupTouched = fieldNames.some((fieldName) => touched[fieldName]);

    if (!submitted && !groupTouched) return "";

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
      const nextCertificates = [...prev.certificates];

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
    setFormData((prev) => ({
      ...prev,
      certificates: [
        ...prev.certificates,
        {
          certificateName: "",
          certificateIssuer: "",
          certificateUrl: "",
          issuedAt: "",
        },
      ],
    }));
  };

  const removeCertificate = (index) => {
    setFormData((prev) => {
      const nextCertificates = prev.certificates.filter((_, i) => i !== index);

      return {
        ...prev,
        certificates:
          nextCertificates.length > 0
            ? nextCertificates
            : emptyForm.certificates,
      };
    });
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingAvatar(true);
      setError("");
      setModal(null);

      const imageUrl = await uploadService.uploadImage(file, "avatar");

      updateField("avatarUrl", imageUrl);
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
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitted(true);
    setError("");
    setModal(null);

    const errors = validateForm(formData);

    if (Object.keys(errors).length > 0) {
      setError("Please check the highlighted fields before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);

      const result = isEditPage
        ? await expertProfileService.resubmitExpertProfile(formData)
        : await expertProfileService.createExpertProfile(formData);

      console.log("EXPERT PROFILE SUBMIT SUCCESS:", result);

      const reviewStatus = getReviewStatus(result);
      const userStatus = getUserStatus(result);
      const reviewNote = getReviewNote(result);
      const missingInformation = getMissingInformation(result);

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
        saveCorrectionDraft(formData);
        updateLocalUserStatus("PENDING_PROFILE");

        setModal({
          type: "warning",
          title: "Profile needs correction",
          message:
            reviewNote ||
            "Your profile was submitted, but it needs some corrections before approval.",
          detail:
            missingInformation ||
            "Please review your bio, skills, public links, and certificates.",
          showResubmit: true,
          showClose: true,
        });

        return;
      }

      if (reviewStatus === "REJECTED") {
        saveCorrectionDraft(formData);
        updateLocalUserStatus("PENDING_PROFILE");

        setModal({
          type: "danger",
          title: "Profile was rejected",
          message:
            reviewNote ||
            "Your expert profile was rejected. Please update your information and submit again.",
          detail:
            missingInformation ||
            "Please check your profile information, public links, and certificates.",
          showResubmit: true,
          showClose: true,
        });

        return;
      }

      saveCorrectionDraft(formData);

      setModal({
        type: "info",
        title: "Profile submitted",
        message:
          "Your expert profile has been submitted. Please check your profile status later.",
        detail: "",
        showResubmit: false,
        showClose: true,
      });
    } catch (err) {
      console.error("EXPERT PROFILE SUBMIT ERROR:", err?.response?.data || err);

      saveCorrectionDraft(formData);

      setModal({
        type: "danger",
        title: "Submit failed",
        message: getFriendlyError(err),
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
    setFormData(emptyForm);
    setTouched({});
    setSubmitted(false);
    setModal(null);
    setError("");
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate("/login", { replace: true });
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
              experience, budget, and public work links.
            </p>
          </div>

          {error && (
            <Alert type="danger" title="Please check your form" message={error} />
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
                    placeholder="Example: Full-stack React Developer"
                  />

                  <TextArea
                    label="Bio"
                    required
                    value={formData.bio}
                    onChange={(value) => updateField("bio", value)}
                    onBlur={() => markTouched("bio")}
                    error={getFieldError("bio")}
                    placeholder="At least 50 characters."
                  />

                  <TextInput
                    label="Skills"
                    required
                    value={formData.skills}
                    onChange={(value) => updateField("skills", value)}
                    onBlur={() => markTouched("skills")}
                    error={getFieldError("skills")}
                    placeholder="React, JavaScript, C#, SQL"
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-white/10 pt-6">
              <h2 className="mb-4 text-lg font-bold text-white">
                Work Preferences
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <NumberInput
                  label="Years of Experience"
                  required
                  value={formData.yearsOfExperience}
                  onChange={(value) => updateField("yearsOfExperience", value)}
                  onBlur={() => markTouched("yearsOfExperience")}
                  error={getFieldError("yearsOfExperience")}
                  placeholder="Example: 2"
                />

                <NumberInput
                  label="Preferred Duration Days"
                  required
                  value={formData.preferredProjectDurationDays}
                  onChange={(value) =>
                    updateField("preferredProjectDurationDays", value)
                  }
                  onBlur={() => markTouched("preferredProjectDurationDays")}
                  error={getFieldError("preferredProjectDurationDays")}
                  placeholder="Example: 14"
                />

                <NumberInput
                  label="Minimum Budget"
                  required
                  value={formData.expectedProjectBudgetMin}
                  onChange={(value) =>
                    updateField("expectedProjectBudgetMin", value)
                  }
                  onBlur={() => markTouched("expectedProjectBudgetMin")}
                  error={getFieldError("expectedProjectBudgetMin")}
                  placeholder="Example: 100"
                />

                <NumberInput
                  label="Maximum Budget"
                  required
                  value={formData.expectedProjectBudgetMax}
                  onChange={(value) =>
                    updateField("expectedProjectBudgetMax", value)
                  }
                  onBlur={() => markTouched("expectedProjectBudgetMax")}
                  error={getFieldError("expectedProjectBudgetMax")}
                  placeholder="Example: 1000"
                />
              </div>

              <label className="mt-4 flex items-center gap-3 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.availableForWork}
                  onChange={(event) =>
                    updateField("availableForWork", event.target.checked)
                  }
                  className="h-4 w-4"
                />
                Available for work
              </label>
            </section>

            <section className="border-t border-white/10 pt-6">
              <h2 className="mb-4 text-lg font-bold text-white">
                Public Links
              </h2>

              <p className="mb-4 text-sm text-gray-500">
                Add at least 2 public links.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <TextInput
                  label="Portfolio URL"
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
                  value={formData.gitHubUrl}
                  onChange={(value) => updateField("gitHubUrl", value)}
                  onBlur={() => markTouched("gitHubUrl")}
                  error={getFieldError("gitHubUrl")}
                  placeholder="https://github.com/you"
                />
              </div>

              <FieldError
                message={getGroupError("publicLinks", [
                  "portfolioUrl",
                  "linkedInUrl",
                  "gitHubUrl",
                ])}
              />
            </section>

            <section className="border-t border-white/10 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Certificates</h2>

                <button
                  type="button"
                  onClick={addCertificate}
                  className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  Add Certificate
                </button>
              </div>

              <FieldError message={submitted ? formErrors.certificates : ""} />
              <FieldError
                message={submitted ? formErrors.duplicateCertificates : ""}
              />

              <div className="space-y-4">
                {formData.certificates.map((certificate, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <p className="font-bold text-white">
                        Certificate {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeCertificate(index)}
                        className="text-sm font-bold text-red-300 hover:text-red-200"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <TextInput
                        label="Certificate Name"
                        required
                        value={certificate.certificateName}
                        onChange={(value) =>
                          updateCertificate(index, "certificateName", value)
                        }
                        onBlur={() => markTouched(`certificateName_${index}`)}
                        error={getFieldError(`certificateName_${index}`)}
                        placeholder="Example: React Developer Certificate"
                      />

                      <TextInput
                        label="Issuer"
                        required
                        value={certificate.certificateIssuer}
                        onChange={(value) =>
                          updateCertificate(index, "certificateIssuer", value)
                        }
                        onBlur={() => markTouched(`certificateIssuer_${index}`)}
                        error={getFieldError(`certificateIssuer_${index}`)}
                        placeholder="Example: Coursera"
                      />

                      <TextInput
                        label="Certificate URL"
                        required
                        value={certificate.certificateUrl}
                        onChange={(value) =>
                          updateCertificate(index, "certificateUrl", value)
                        }
                        onBlur={() => markTouched(`certificateUrl_${index}`)}
                        error={getFieldError(`certificateUrl_${index}`)}
                        placeholder="https://certificate-link.com"
                      />

                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-300">
                          Issued At
                        </label>

                        <input
                          type="date"
                          value={certificate.issuedAt}
                          onChange={(event) =>
                            updateCertificate(
                              index,
                              "issuedAt",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClearDraft}
                className="rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
              >
                Clear Draft
              </button>

              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Submitting..."
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
            <h3 className="text-xl font-extrabold text-white">{modal.title}</h3>

            <p className="mt-2 text-sm leading-6 text-gray-300">
              {modal.message}
            </p>
          </div>
        </div>

        {modal.detail && (
          <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-gray-300">
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

  if (isEmpty(data.expectedProjectBudgetMin)) {
    errors.expectedProjectBudgetMin = "Minimum budget is required.";
  }

  if (isEmpty(data.expectedProjectBudgetMax)) {
    errors.expectedProjectBudgetMax = "Maximum budget is required.";
  }

  if (isEmpty(data.preferredProjectDurationDays)) {
    errors.preferredProjectDurationDays = "Preferred duration is required.";
  }

  const minBudget = Number(data.expectedProjectBudgetMin || 0);
  const maxBudget = Number(data.expectedProjectBudgetMax || 0);

  if (minBudget < 0) {
    errors.expectedProjectBudgetMin = "Minimum budget must be 0 or higher.";
  }

  if (maxBudget < 0) {
    errors.expectedProjectBudgetMax = "Maximum budget must be 0 or higher.";
  }

  if (minBudget && maxBudget && minBudget > maxBudget) {
    errors.expectedProjectBudgetMax =
      "Maximum budget must be greater than minimum budget.";
  }

  const duration = Number(data.preferredProjectDurationDays || 0);

  if (duration <= 0) {
    errors.preferredProjectDurationDays =
      "Preferred duration must be greater than 0.";
  }

  const publicLinks = [
    data.portfolioUrl,
    data.linkedInUrl,
    data.gitHubUrl,
  ].filter((item) => !isEmpty(item));

  if (publicLinks.length < 2) {
    errors.publicLinks =
      "Please add at least 2 links: Portfolio, LinkedIn, or GitHub.";
  }

  ["portfolioUrl", "linkedInUrl", "gitHubUrl"].forEach((field) => {
    if (!isEmpty(data[field]) && !isValidUrl(data[field])) {
      errors[field] = "URL must start with http:// or https://";
    }
  });

  const certificateUrls = [];
  const certificates = data.certificates || [];

  const validCertificates = certificates.filter(
    (item) =>
      !isEmpty(item.certificateName) ||
      !isEmpty(item.certificateIssuer) ||
      !isEmpty(item.certificateUrl)
  );

  if (validCertificates.length === 0) {
    errors.certificates = "At least one certificate is required.";
  }

  certificates.forEach((item, index) => {
    const hasAnyValue =
      !isEmpty(item.certificateName) ||
      !isEmpty(item.certificateIssuer) ||
      !isEmpty(item.certificateUrl) ||
      !isEmpty(item.issuedAt);

    if (!hasAnyValue) return;

    if (isEmpty(item.certificateName)) {
      errors[`certificateName_${index}`] = "Certificate name is required.";
    }

    if (isEmpty(item.certificateIssuer)) {
      errors[`certificateIssuer_${index}`] = "Certificate issuer is required.";
    }

    if (isEmpty(item.certificateUrl)) {
      errors[`certificateUrl_${index}`] = "Certificate URL is required.";
    }

    if (!isEmpty(item.certificateUrl) && !isValidUrl(item.certificateUrl)) {
      errors[`certificateUrl_${index}`] =
        "Certificate URL must start with http:// or https://";
    }

    if (!isEmpty(item.certificateUrl)) {
      certificateUrls.push(String(item.certificateUrl).trim().toLowerCase());
    }
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
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-300">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF]"
      />

      <FieldError message={error} />
    </div>
  );
}

function NumberInput(props) {
  return (
    <TextInput
      {...props}
      onChange={(nextValue) => {
        if (/^\d*$/.test(nextValue)) props.onChange(nextValue);
      }}
    />
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={5}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF]"
      />

      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;

  return <p className="mt-2 text-xs font-semibold text-red-300">{message}</p>;
}

function getReviewStatus(result) {
  return String(
    result?.profileReviewStatus ||
      result?.ProfileReviewStatus ||
      result?.reviewStatus ||
      result?.ReviewStatus ||
      ""
  )
    .trim()
    .toUpperCase();
}

function getUserStatus(result) {
  return String(result?.userStatus || result?.UserStatus || "")
    .trim()
    .toUpperCase();
}

function getReviewNote(result) {
  return (
    result?.profileReviewNote ||
    result?.ProfileReviewNote ||
    result?.reviewNote ||
    result?.ReviewNote ||
    result?.aiReviewNote ||
    result?.AiReviewNote ||
    ""
  );
}

function getMissingInformation(result) {
  const value =
    result?.missingInformation ||
    result?.MissingInformation ||
    result?.missingInfo ||
    result?.MissingInfo ||
    "";

  if (Array.isArray(value)) return value.join(", ");

  return String(value || "");
}

function saveCorrectionDraft(data) {
  localStorage.setItem(CORRECTION_DRAFT_KEY, JSON.stringify(data));
  localStorage.setItem(EDIT_DRAFT_KEY, JSON.stringify(data));
  localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify(data));
}

function clearExpertProfileDrafts() {
  localStorage.removeItem(SETUP_DRAFT_KEY);
  localStorage.removeItem(EDIT_DRAFT_KEY);
  localStorage.removeItem(CORRECTION_DRAFT_KEY);
}

function updateLocalUserStatus(status) {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...user,
        role: "EXPERT",
        status,
      })
    );
  } catch (error) {
    console.error("UPDATE LOCAL USER STATUS ERROR:", error);
  }
}

function readJson(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function isEmpty(value) {
  return String(value || "").trim() === "";
}

function isValidUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function getFriendlyError(err) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request because the current token does not have EXPERT permission.";
  }

  const rawMessage =
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.response?.data ||
    err?.message ||
    "";

  return String(rawMessage || "Something went wrong. Please try again.");

  

}
