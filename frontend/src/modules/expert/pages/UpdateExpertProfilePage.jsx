import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertProfileService from "../../../services/expertProfile.service";
import uploadService from "../../../services/upload.service";
import authService from "../../../services/auth.service";

const CERTIFICATE_TYPE_OPTIONS = [
  { label: "Course Certificate", value: "COURSE_CERTIFICATE" },
  { label: "Professional Certificate", value: "PROFESSIONAL_CERTIFICATE" },
  { label: "Bootcamp Certificate", value: "BOOTCAMP_CERTIFICATE" },
  { label: "Degree Certificate", value: "DEGREE_CERTIFICATE" },
  { label: "Award Certificate", value: "AWARD_CERTIFICATE" },
  { label: "Other", value: "OTHER" },
];

const CERTIFICATE_TYPES = CERTIFICATE_TYPE_OPTIONS.map((item) => item.value);

const emptyBasicForm = {
  fullName: "",
  avatarUrl: "",
  professionalTitle: "",
  bio: "",
  availableForWork: true,
};

const emptyVerificationForm = {
  skills: "",
  yearsOfExperience: "",
  portfolioUrl: "",
  linkedInUrl: "",
  gitHubUrl: "",
  certificates: [],
};

export default function UpdateExpertProfilePage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("basic");
  const [basicForm, setBasicForm] = useState(emptyBasicForm);
  const [verificationForm, setVerificationForm] = useState(
    emptyVerificationForm
  );

  const [loading, setLoading] = useState(true);
  const [savingBasic, setSavingBasic] = useState(false);
  const [savingVerification, setSavingVerification] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [syncingAvatar, setSyncingAvatar] = useState(false);

  const [basicSubmitted, setBasicSubmitted] = useState(false);
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const basicErrors = useMemo(() => validateBasicForm(basicForm), [basicForm]);

  const verificationErrors = useMemo(
    () => validateVerificationForm(verificationForm),
    [verificationForm]
  );

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      setModal(null);

      const result = await expertProfileService.getMyExpertProfile();
      const profile = unwrapData(result);

      setBasicForm(buildBasicFormFromProfile(profile));
      setVerificationForm(buildVerificationFormFromProfile(profile));
    } catch (err) {
      console.error("LOAD UPDATE PROFILE ERROR:", getRawPayload(err));

      const status = err?.response?.status || err?.status;

      if (status === 404) {
        navigate("/expert/setup-profile", { replace: true });
        return;
      }

      setError(getFriendlyError(err, "Cannot load expert profile."));
    } finally {
      setLoading(false);
    }
  };

  const updateBasicField = (name, value) => {
    setError("");
    setMessage("");
    setModal(null);

    setBasicForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateVerificationField = (name, value) => {
    setError("");
    setMessage("");
    setModal(null);

    setVerificationForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateCertificate = (index, name, value) => {
    setError("");
    setMessage("");
    setModal(null);

    setVerificationForm((prev) => {
      const certificates = [...(prev.certificates || [])];

      certificates[index] = {
        ...certificates[index],
        [name]: value,
      };

      return {
        ...prev,
        certificates,
      };
    });
  };

  const addCertificate = () => {
    if ((verificationForm.certificates || []).length >= 10) return;

    setVerificationForm((prev) => ({
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
    setVerificationForm((prev) => ({
      ...prev,
      certificates: (prev.certificates || []).filter((_, i) => i !== index),
    }));
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingAvatar(true);
      setSyncingAvatar(false);
      setError("");
      setMessage("");
      setModal(null);

      const uploadResult = await uploadService.uploadImage(file, "avatar");
      const imageUrl = extractUploadUrl(uploadResult);

      if (!imageUrl) {
        throw new Error("Upload succeeded but image URL was not found.");
      }

      updateBasicField("avatarUrl", imageUrl);

      if (typeof authService.updateMyAvatar === "function") {
        try {
          setSyncingAvatar(true);
          await authService.updateMyAvatar(imageUrl);
          setMessage("Avatar uploaded successfully.");
        } catch (avatarErr) {
          console.error("SYNC AUTH AVATAR ERROR:", getRawPayload(avatarErr));

          setError(
            "Avatar was uploaded, but account avatar could not be synced. Please click Save Basic Information to keep it in your expert profile."
          );
        }
      }
    } catch (err) {
      console.error("UPLOAD AVATAR ERROR:", getRawPayload(err));
      setError(getFriendlyError(err, "Cannot upload avatar."));
    } finally {
      setUploadingAvatar(false);
      setSyncingAvatar(false);
      event.target.value = "";
    }
  };

  const handleSaveBasic = async (event) => {
    event.preventDefault();

    setBasicSubmitted(true);
    setError("");
    setMessage("");
    setModal(null);

    const errors = validateBasicForm(basicForm);

    if (Object.keys(errors).length > 0) {
      setActiveTab("basic");
      setError("Please check the highlighted basic profile fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSavingBasic(true);

      const payload = buildBasicPayload(basicForm);

      await expertProfileService.updateBasicExpertProfile(payload);

      if (payload.avatarUrl && typeof authService.updateMyAvatar === "function") {
        try {
          setSyncingAvatar(true);
          await authService.updateMyAvatar(payload.avatarUrl);
        } catch (avatarErr) {
          console.error("SYNC AUTH AVATAR ON SAVE ERROR:", getRawPayload(avatarErr));
        } finally {
          setSyncingAvatar(false);
        }
      }

      updateLocalUserStatus("ACTIVE");

      setModal({
        type: "success",
        title: "Basic profile updated",
        message: "Your basic profile information has been updated.",
        detail: "",
        showBackProfile: true,
        showEditAgain: false,
      });
    } catch (err) {
      console.error("UPDATE BASIC PROFILE ERROR:", getRawPayload(err));
      setError(getFriendlyError(err, "Cannot update basic profile."));
    } finally {
      setSavingBasic(false);
      setSyncingAvatar(false);
    }
  };

  const handleSaveVerification = async (event) => {
    event.preventDefault();

    setVerificationSubmitted(true);
    setError("");
    setMessage("");
    setModal(null);

    const errors = validateVerificationForm(verificationForm);

    if (Object.keys(errors).length > 0) {
      setActiveTab("verification");
      setError("Please check the highlighted verification fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSavingVerification(true);

      const payload = buildVerificationPayload(verificationForm);

      let result;

      result =
        await expertProfileService.updateVerificationExpertProfile(payload);

      const data = unwrapData(result);
      const applied = Boolean(data?.applied || data?.Applied);
      const reviewStatus = getReviewStatus(data);
      const resultMessage = getResultMessage(data);
      const missingInformation = getMissingInformation(data);

      updateLocalUserStatus("ACTIVE");

      if (
        applied ||
        reviewStatus === "APPROVED" ||
        reviewStatus === "ACTIVE" ||
        !reviewStatus
      ) {
        setModal({
          type: "success",
          title: "Verification information updated",
          message:
            resultMessage ||
            "Your verification information has been updated. Your profile score will refresh automatically.",
          detail: "",
          showBackProfile: true,
          showEditAgain: false,
        });

        return;
      }

      setModal({
        type: "warning",
        title: "Improve your verification details",
        message:
          "Your current profile is still active. The new verification details were not applied yet.",
        checklist: buildVerificationChecklist({
          missingInformation,
          resultMessage,
        }),
        showBackProfile: true,
        showEditAgain: true,
      });
    } catch (err) {
      console.error("UPDATE VERIFICATION ERROR:", getRawPayload(err));

      setModal({
        type: "danger",
        title: "Verification update failed",
        message: getFriendlyError(
          err,
          "Cannot update verification information. Your current profile was not changed."
        ),
        detail: "",
        showBackProfile: true,
        showEditAgain: true,
      });
    } finally {
      setSavingVerification(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading update profile...
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate("/expert/profile")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to profile
          </button>

          <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
            <div className="relative border-b border-white/10 px-5 py-6 md:px-7">
              <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
                    <span className="material-symbols-outlined text-[15px]">
                      storefront
                    </span>
                    Expert profile
                  </div>

                  <h1 className="text-2xl font-black text-white md:text-3xl">
                    Make your profile easier to hire
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                    Keep your public introduction clear and your proof of work up to date.
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-400/20 bg-green-400/10 text-green-300">
                    <span className="material-symbols-outlined text-[20px]">
                      verified
                    </span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500">
                      Profile status
                    </p>
                    <p className="text-sm font-black text-white">Active expert</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                className={`inline-flex min-w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                  activeTab === "basic"
                    ? "bg-cyan-400 text-black"
                    : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  badge
                </span>
                Public profile
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("verification")}
                className={`inline-flex min-w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                  activeTab === "verification"
                    ? "bg-purple-400 text-black"
                    : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  workspace_premium
                </span>
                Skills & proof
              </button>
            </div>
          </section>

          {message && (
            <Alert type="success" title="Update result" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Update error" message={error} />
          )}

          {activeTab === "basic" && (
            <BasicProfileForm
              formData={basicForm}
              errors={basicSubmitted ? basicErrors : {}}
              saving={savingBasic}
              uploadingAvatar={uploadingAvatar}
              syncingAvatar={syncingAvatar}
              onChange={updateBasicField}
              onSubmit={handleSaveBasic}
              onAvatarUpload={handleAvatarUpload}
              onCancel={() => navigate("/expert/profile")}
            />
          )}

          {activeTab === "verification" && (
            <VerificationProfileForm
              formData={verificationForm}
              errors={verificationSubmitted ? verificationErrors : {}}
              saving={savingVerification}
              onChange={updateVerificationField}
              onSubmit={handleSaveVerification}
              onCertificateChange={updateCertificate}
              onAddCertificate={addCertificate}
              onRemoveCertificate={removeCertificate}
              onCancel={() => navigate("/expert/profile")}
            />
          )}
        </div>
      </div>

      {modal && (
        <ResultModal
          modal={modal}
          onClose={() => setModal(null)}
          onBackProfile={() => navigate("/expert/profile", { replace: true })}
        />
      )}
    </ExpertLayout>
  );
}

function BasicProfileForm({
  formData,
  errors,
  saving,
  uploadingAvatar,
  syncingAvatar,
  onChange,
  onSubmit,
  onAvatarUpload,
  onCancel,
}) {
  const busy = saving || uploadingAvatar || syncingAvatar;

  return (
    <form onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-white/10 bg-[#151a22] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.2)] md:p-7">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
              <span className="material-symbols-outlined text-[20px]">
                person_edit
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Public profile
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                This is what clients see first.
              </p>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-5 rounded-2xl border border-white/10 bg-black/15 p-4 sm:flex-row sm:items-center">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-cyan-400/30 bg-cyan-400/10">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-cyan-300">
                  <span className="material-symbols-outlined text-5xl">
                    person
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-black text-white">Profile photo</p>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                Use a clear square photo with a simple background.
              </p>

              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-black">
                <span className="material-symbols-outlined text-[18px]">
                  photo_camera
                </span>
                {uploadingAvatar
                  ? "Uploading..."
                  : syncingAvatar
                    ? "Updating..."
                    : "Change photo"}

                <input
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={onAvatarUpload}
                  className="hidden"
                />
              </label>

              <FieldError message={errors.avatarUrl} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextInput
              label="Full Name"
              value={formData.fullName}
              error={errors.fullName}
              onChange={(value) => onChange("fullName", value)}
              placeholder="Your full name"
              required
            />

            <TextInput
              label="Professional Title"
              value={formData.professionalTitle}
              error={errors.professionalTitle}
              onChange={(value) => onChange("professionalTitle", value)}
              placeholder="AI Automation Engineer"
              required
            />
          </div>

          <div className="mt-5">
            <TextareaInput
              label="Bio"
              value={formData.bio}
              error={errors.bio}
              onChange={(value) => onChange("bio", value)}
              placeholder="Summarize your expertise, strongest outcomes, and the type of work you do best."
              rows={6}
              required
              maxLength={2000}
              showCount
            />
          </div>

          <div className="mt-5">
            <AvailabilityToggle
              checked={formData.availableForWork}
              disabled={busy}
              onChange={(checked) => onChange("availableForWork", checked)}
            />
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                save
              </span>
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_16px_45px_rgba(0,0,0,0.2)]">
            <div className="h-20 bg-gradient-to-r from-cyan-400/20 via-purple-400/10 to-transparent" />

            <div className="-mt-10 p-5">
              <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-[#151a22] bg-cyan-400/10">
                {formData.avatarUrl ? (
                  <img
                    src={formData.avatarUrl}
                    alt="Public profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-cyan-300">
                    <span className="material-symbols-outlined text-4xl">
                      person
                    </span>
                  </div>
                )}
              </div>

              <h3 className="mt-4 break-words text-lg font-black text-white">
                {formData.fullName || "Your name"}
              </h3>

              <p className="mt-1 break-words text-sm font-semibold text-cyan-300">
                {formData.professionalTitle || "Professional title"}
              </p>

              <p className="mt-4 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-gray-400">
                {formData.bio ||
                  "Your introduction will appear here as clients browse expert profiles."}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    formData.availableForWork
                      ? "bg-green-400"
                      : "bg-gray-500"
                  }`}
                />
                <span className="text-xs font-bold text-gray-400">
                  {formData.availableForWork
                    ? "Available for work"
                    : "Not accepting new work"}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <p className="text-sm font-black text-white">Profile checklist</p>
            <div className="mt-3 space-y-2">
              <ChecklistItem
                done={Boolean(formData.avatarUrl)}
                label="Professional photo"
              />
              <ChecklistItem
                done={String(formData.professionalTitle || "").trim().length >= 5}
                label="Clear professional title"
              />
              <ChecklistItem
                done={String(formData.bio || "").trim().length >= 50}
                label="Bio with enough detail"
              />
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}

function VerificationProfileForm({
  formData,
  errors,
  saving,
  onChange,
  onSubmit,
  onCertificateChange,
  onAddCertificate,
  onRemoveCertificate,
  onCancel,
}) {
  const proofCount = [
    formData.portfolioUrl,
    formData.linkedInUrl,
    formData.gitHubUrl,
  ].filter((value) => String(value || "").trim()).length;

  return (
    <form onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-[#151a22] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.2)] md:p-7">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-400/10 text-purple-300">
                <span className="material-symbols-outlined text-[20px]">
                  psychology
                </span>
              </div>

              <div>
                <h2 className="text-xl font-black text-white">
                  Skills and experience
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Keep the skills focused on services you actively offer.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_210px]">
              <TextInput
                label="Skills"
                value={formData.skills}
                error={errors.skills}
                onChange={(value) => onChange("skills", value)}
                placeholder="AI Automation, RAG, Chatbot, Python"
                required
              />

              <ReadonlyNumberInput
                label="Years Of Experience"
                value={formData.yearsOfExperience}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#151a22] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.2)] md:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                  <span className="material-symbols-outlined text-[20px]">
                    link
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-black text-white">
                    Proof of work
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Add links clients can open and review.
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-gray-400">
                {proofCount}/3 added
              </span>
            </div>

            <div className="space-y-4">
              <ProofLinkInput
                icon="language"
                label="Portfolio"
                required
                value={formData.portfolioUrl}
                error={errors.portfolioUrl}
                onChange={(value) => onChange("portfolioUrl", value)}
                placeholder="https://your-portfolio.com"
              />

              <ProofLinkInput
                brand="github"
                label="GitHub"
                required
                value={formData.gitHubUrl}
                error={errors.gitHubUrl}
                onChange={(value) => onChange("gitHubUrl", value)}
                placeholder="https://github.com/your-name"
              />

              <ProofLinkInput
                brand="linkedin"
                label="LinkedIn"
                value={formData.linkedInUrl}
                error={errors.linkedInUrl}
                onChange={(value) => onChange("linkedInUrl", value)}
                placeholder="https://linkedin.com/in/your-name"
              />
            </div>

            <FieldError message={errors.publicLinks} />
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#151a22] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.2)] md:p-7">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
                  <span className="material-symbols-outlined text-[20px]">
                    workspace_premium
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-black text-white">
                    Certificates
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Add only credentials that strengthen your profile.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={saving || (formData.certificates || []).length >= 10}
                onClick={onAddCertificate}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-400/40 bg-purple-400/10 px-4 py-2.5 text-sm font-black text-purple-200 transition hover:bg-purple-400 hover:text-black disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>
                Add certificate
              </button>
            </div>

            <FieldError message={errors.certificates} />
            <FieldError message={errors.duplicateCertificates} />

            {(formData.certificates || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 p-6 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-600">
                  workspace_premium
                </span>
                <p className="mt-2 font-black text-white">
                  No certificates added
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Certificates are optional.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {formData.certificates.map((certificate, index) => (
                  <div
                    key={`${certificate.certificateUrl}-${index}`}
                    className="rounded-2xl border border-white/10 bg-black/15 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
                          <span className="material-symbols-outlined text-[18px]">
                            verified
                          </span>
                        </div>

                        <p className="font-black text-white">
                          Certificate {index + 1}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onRemoveCertificate(index)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-black text-red-300 transition hover:bg-red-400/10"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          delete
                        </span>
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
                      <TextInput
                        label="Certificate URL"
                        value={certificate.certificateUrl}
                        error={errors[`certificateUrl_${index}`]}
                        onChange={(value) =>
                          onCertificateChange(index, "certificateUrl", value)
                        }
                        placeholder="https://..."
                      />

                      <SelectInput
                        label="Certificate Type"
                        value={certificate.certificateType}
                        error={errors[`certificateType_${index}`]}
                        onChange={(value) =>
                          onCertificateChange(index, "certificateType", value)
                        }
                        options={CERTIFICATE_TYPE_OPTIONS}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-white/10 bg-[#151a22] p-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-400 px-5 py-2.5 text-sm font-black text-black transition hover:bg-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                verified
              </span>
              {saving ? "Reviewing..." : "Save verification"}
            </button>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-3xl border border-purple-400/20 bg-purple-400/[0.06] p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-400/10 text-purple-300">
              <span className="material-symbols-outlined">shield_person</span>
            </div>

            <h3 className="mt-4 font-black text-white">
              Verification review
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Updated proof is reviewed before it replaces the information on your active profile.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#151a22] p-4">
            <p className="text-sm font-black text-white">Proof checklist</p>
            <div className="mt-3 space-y-2">
              <ChecklistItem
                done={String(formData.skills || "").trim().length >= 10}
                label="Focused skills"
              />
              <ChecklistItem
                done={Boolean(String(formData.portfolioUrl || "").trim())}
                label="Portfolio link"
              />
              <ChecklistItem
                done={Boolean(String(formData.gitHubUrl || "").trim())}
                label="GitHub profile"
              />
              <ChecklistItem
                done={(formData.certificates || []).length > 0}
                label="Certificate evidence"
                optional
              />
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}

function AvailabilityToggle({ checked, disabled, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
            checked
              ? "border-green-400/20 bg-green-400/10 text-green-300"
              : "border-white/10 bg-white/[0.04] text-gray-500"
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">
            work
          </span>
        </div>

        <div>
          <p className="font-black text-white">Available for work</p>
          <p className="mt-1 text-sm text-gray-500">
            Let clients know whether you are accepting new projects.
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-green-400" : "bg-gray-700"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function ChecklistItem({ done, label, optional = false }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`material-symbols-outlined text-[17px] ${
          done ? "text-green-300" : "text-gray-600"
        }`}
      >
        {done ? "check_circle" : "radio_button_unchecked"}
      </span>
      <span className={done ? "text-gray-300" : "text-gray-500"}>
        {label}
      </span>
      {optional && (
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-gray-600">
          Optional
        </span>
      )}
    </div>
  );
}

function ProofLinkInput({
  icon,
  brand,
  label,
  required,
  value,
  error,
  onChange,
  placeholder,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-200">
          {brand === "github" ? (
            <GitHubLogo className="h-5 w-5" />
          ) : brand === "linkedin" ? (
            <LinkedInLogo className="h-5 w-5" />
          ) : (
            <span className="material-symbols-outlined text-[18px]">
              {icon}
            </span>
          )}
        </div>

        <div>
          <p className="text-sm font-black text-white">
            {label} {required && <span className="text-red-300">*</span>}
          </p>
          <p className="text-xs text-gray-600">
            {required ? "Required proof" : "Optional"}
          </p>
        </div>
      </div>

      <input
        type="url"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-[#0f141d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-400 ${
          error ? "border-red-400/60" : "border-white/10"
        }`}
      />

      <FieldError message={error} />
    </div>
  );
}

function GitHubLogo({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12 .7C5.7.7.6 5.8.6 12.1c0 5 3.3 9.2 7.8 10.7.6.1.8-.3.8-.6v-2.2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.3 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.6 11.6 0 0 1 6 0c2.3-1.6 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.9 1.2 2 1.2 3.2 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6 4.5-1.5 7.8-5.7 7.8-10.7C23.4 5.8 18.3.7 12 .7Z" />
    </svg>
  );
}

function LinkedInLogo({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M20.4 3H3.6C3.3 3 3 3.3 3 3.6v16.8c0 .3.3.6.6.6h16.8c.3 0 .6-.3.6-.6V3.6c0-.3-.3-.6-.6-.6ZM8.3 18.3H5.7V9.8h2.6v8.5ZM7 8.6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm11.3 9.7h-2.6v-4.1c0-1 0-2.3-1.4-2.3-1.4 0-1.7 1.1-1.7 2.3v4.2H10v-8.6h2.5V11h.1c.4-.7 1.2-1.5 2.5-1.5 2.7 0 3.2 1.8 3.2 4.1v4.7Z" />
    </svg>
  );
}

function TextInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label} {required && <span className="text-red-400">*</span>}
      </span>

      <input
        type="text"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] ${error ? "border-red-400/60" : "border-white/10"
          }`}
      />

      <FieldError message={error} />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label} {required && <span className="text-red-400">*</span>}
      </span>

      <input
        type="number"
        min="0"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] ${error ? "border-red-400/60" : "border-white/10"
          }`}
      />

      <FieldError message={error} />
    </label>
  );
}

function ReadonlyNumberInput({ label, value }) {
  return (
    <div>
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>

      <div className="flex min-h-[46px] items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4">
        <span className="text-sm font-black text-white">
          {value === "" || value === null || value === undefined
            ? "N/A"
            : `${value} year${Number(value) === 1 ? "" : "s"}`}
        </span>
        <span className="material-symbols-outlined text-[17px] text-gray-600">
          lock
        </span>
      </div>
    </div>
  );
}

function SelectInput({ label, value, onChange, error, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>

      <select
        value={value || "COURSE_CERTIFICATE"}
        onChange={(event) => onChange(event.target.value)}
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
    </label>
  );
}

function TextareaInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  rows = 5,
  required = false,
  maxLength,
  showCount = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label} {required && <span className="text-red-400">*</span>}
      </span>

      <textarea
        rows={rows}
        value={value ?? ""}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] ${error ? "border-red-400/60" : "border-white/10"
          }`}
      />

      {showCount && maxLength ? (
        <p className="mt-2 text-right text-xs font-semibold text-gray-600">
          {String(value || "").length}/{maxLength}
        </p>
      ) : null}

      <FieldError message={error} />
    </label>
  );
}

function FieldError({ message }) {
  if (!message) return null;

  return <p className="mt-2 text-xs font-semibold text-red-300">{message}</p>;
}

function Alert({ type, title, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 text-sm ${style}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1 whitespace-pre-line">{message}</p>
    </div>
  );
}

function ResultModal({ modal, onClose, onBackProfile }) {
  const config =
    modal.type === "success"
      ? {
          icon: "check_circle",
          iconClass:
            "border-green-400/30 bg-green-400/10 text-green-300",
          badgeClass:
            "border-green-400/30 bg-green-400/10 text-green-200",
          badgeLabel: "Updated",
          primaryClass:
            "bg-green-400 text-black hover:bg-green-300",
        }
      : modal.type === "warning"
        ? {
            icon: "tips_and_updates",
            iconClass:
              "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
            badgeClass:
              "border-yellow-400/30 bg-yellow-400/10 text-yellow-200",
            badgeLabel: "Needs Improvement",
            primaryClass:
              "bg-yellow-300 text-black hover:bg-yellow-200",
          }
        : {
            icon: "error",
            iconClass:
              "border-red-400/30 bg-red-400/10 text-red-300",
            badgeClass:
              "border-red-400/30 bg-red-400/10 text-red-200",
            badgeLabel: "Update Failed",
            primaryClass:
              "bg-red-400 text-black hover:bg-red-300",
          };

  const checklist = Array.isArray(modal.checklist)
    ? modal.checklist
    : [];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#151a22] shadow-[0_32px_110px_rgba(0,0,0,0.72)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="border-b border-white/10 p-5">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${config.iconClass}`}
            >
              <span className="material-symbols-outlined text-[26px]">
                {config.icon}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${config.badgeClass}`}
              >
                {config.badgeLabel}
              </span>

              <h3 className="mt-3 text-xl font-black text-white">
                {modal.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                {modal.message}
              </p>
            </div>
          </div>
        </div>

        {checklist.length > 0 && (
          <div className="space-y-3 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">
              Recommended updates
            </p>

            {checklist.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
                  <span className="material-symbols-outlined text-[18px]">
                    {item.icon || "checklist"}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    {item.title}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {modal.detail && checklist.length === 0 && (
          <div className="p-5">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-gray-300">
              {modal.detail}
            </div>
          </div>
        )}

        {modal.type === "warning" && (
          <div className="mx-5 mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4">
            <div className="flex gap-3">
              <span className="material-symbols-outlined mt-0.5 text-cyan-300">
                shield
              </span>

              <div>
                <p className="text-sm font-black text-white">
                  Your current profile is safe
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-400">
                  The existing approved profile remains unchanged until the new
                  verification details pass review.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
          {modal.showBackProfile && (
            <button
              type="button"
              onClick={onBackProfile}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:border-white/20 hover:text-white"
            >
              Back to Profile
            </button>
          )}

          {modal.showEditAgain && (
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${config.primaryClass}`}
            >
              Edit Verification
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function buildVerificationChecklist({
  missingInformation,
  resultMessage,
}) {
  const sourceText = `${missingInformation || ""} ${resultMessage || ""}`
    .trim()
    .toLowerCase();

  const items = [];

  if (
    sourceText.includes("portfolio") ||
    sourceText.includes("project") ||
    sourceText.includes("repositories")
  ) {
    items.push({
      icon: "work",
      title: "Add stronger project proof",
      description:
        "Use direct links to AI, chatbot, RAG, or automation projects instead of a general homepage.",
    });
  }

  if (
    sourceText.includes("github") ||
    sourceText.includes("repository")
  ) {
    items.push({
      icon: "code",
      title: "Improve your GitHub evidence",
      description:
        "Link to public repositories with clear README files, project descriptions, and working source code.",
    });
  }

  if (sourceText.includes("linkedin")) {
    items.push({
      icon: "badge",
      title: "Add a valid LinkedIn profile",
      description:
        "Use a public personal LinkedIn profile URL that can be opened without special access.",
    });
  }

  if (
    sourceText.includes("certificate") ||
    sourceText.includes("holder") ||
    sourceText.includes("course")
  ) {
    items.push({
      icon: "workspace_premium",
      title: "Use verifiable certificate links",
      description:
        "Certificate pages should show the holder name, course or certificate title, issuer, and issue details.",
    });
  }

  if (items.length === 0) {
    items.push(
      {
        icon: "link",
        title: "Review your public proof links",
        description:
          "Make sure each link is public, accessible, and directly related to your expertise.",
      },
      {
        icon: "verified",
        title: "Add clearer verification evidence",
        description:
          "Provide enough information for clients and the review system to verify your experience.",
      }
    );
  }

  return items.slice(0, 4);
}

function validateBasicForm(formData) {
  const errors = {};

  if (isEmpty(formData.fullName)) {
    errors.fullName = "Full name is required.";
  }

  if (isEmpty(formData.professionalTitle)) {
    errors.professionalTitle = "Professional title is required.";
  }

  if (isEmpty(formData.bio)) {
    errors.bio = "Bio is required.";
  } else if (String(formData.bio).trim().length < 50) {
    errors.bio = "Bio must be at least 50 characters.";
  }

  if (!isEmpty(formData.avatarUrl) && !isValidUrl(formData.avatarUrl)) {
    errors.avatarUrl = "Avatar URL must start with http:// or https://";
  }

  return errors;
}

function validateVerificationForm(formData) {
  const errors = {};

  if (isEmpty(formData.skills)) {
    errors.skills = "Skills are required.";
  } else if (String(formData.skills).trim().length < 10) {
    errors.skills = "Skills must be more specific.";
  }

  

  if (isEmpty(formData.portfolioUrl)) {
    errors.portfolioUrl = "Portfolio URL is required.";
  } else if (!isValidUrl(formData.portfolioUrl)) {
    errors.portfolioUrl = "Portfolio URL must start with http:// or https://";
  }

  if (isEmpty(formData.gitHubUrl)) {
    errors.gitHubUrl = "GitHub URL is required.";
  } else if (!isValidUrl(formData.gitHubUrl)) {
    errors.gitHubUrl = "GitHub URL must start with http:// or https://";
  } else if (!isGitHubUrl(formData.gitHubUrl)) {
    errors.gitHubUrl = "Please enter a valid GitHub profile URL.";
  }

  if (!isEmpty(formData.linkedInUrl) && !isValidUrl(formData.linkedInUrl)) {
    errors.linkedInUrl =
      "LinkedIn URL must start with http:// or https://. You can leave it empty.";
  }

  if (errors.portfolioUrl || errors.gitHubUrl) {
    errors.publicLinks =
      "Portfolio and GitHub are required. LinkedIn is optional.";
  }

  const certificates = formData.certificates || [];
  const certificateUrls = [];

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

function buildBasicPayload(formData) {
  return {
    fullName: String(formData.fullName || "").trim(),
    avatarUrl: String(formData.avatarUrl || "").trim() || null,
    professionalTitle: String(formData.professionalTitle || "").trim(),
    bio: String(formData.bio || "").trim(),
    availableForWork: Boolean(formData.availableForWork),
  };
}

function buildVerificationPayload(formData) {
  return {
    skills: String(formData.skills || "").trim(),
    portfolioUrl: String(formData.portfolioUrl || "").trim(),
    linkedInUrl: String(formData.linkedInUrl || "").trim(),
    gitHubUrl: String(formData.gitHubUrl || "").trim(),
    certificates: normalizeCertificatesForPayload(formData.certificates),
  };
}

function buildBasicFormFromProfile(profile) {
  return {
    fullName: profile?.fullName || profile?.FullName || "",
    avatarUrl: profile?.avatarUrl || profile?.AvatarUrl || "",
    professionalTitle:
      profile?.professionalTitle || profile?.ProfessionalTitle || "",
    bio: profile?.bio || profile?.Bio || "",
    availableForWork:
      profile?.availableForWork ?? profile?.AvailableForWork ?? true,
  };
}

function buildVerificationFormFromProfile(profile) {
  const certificates = profile?.certificates || profile?.Certificates || [];

  return {
    skills: toSkillText(profile?.skills || profile?.Skills),
    yearsOfExperience:
      profile?.yearsOfExperience ?? profile?.YearsOfExperience ?? "",
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

function normalizeCertificatesForForm(certificates) {
  if (!Array.isArray(certificates)) return [];

  return certificates
    .map((item) => ({
      certificateUrl:
        item?.certificateUrl || item?.CertificateUrl || item?.url || "",
      certificateType:
        item?.certificateType || item?.CertificateType || "OTHER",
    }))
    .filter((item) => item.certificateUrl)
    .map((item) => ({
      certificateUrl: String(item.certificateUrl || "").trim(),
      certificateType: CERTIFICATE_TYPES.includes(item.certificateType)
        ? item.certificateType
        : "OTHER",
    }));
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

function getFriendlyError(error, fallback = "Something went wrong.") {
  const payload = getRawPayload(error);

  const message =
    typeof payload === "string"
      ? payload
      : payload?.message ||
      payload?.title ||
      payload?.detail ||
      payload?.error ||
      error?.message ||
      "";

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

  if (message.includes("Business email already exists")) {
    return "This business email is already used by another account.";
  }

  if (message.includes("Phone number already exists")) {
    return "This phone number is already used by another account.";
  }

  return message || fallback;
}

function getResultMessage(data) {
  return (
    data?.message ||
    data?.Message ||
    data?.reviewNote ||
    data?.ReviewNote ||
    data?.profileReviewNote ||
    data?.ProfileReviewNote ||
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

function updateLocalUserStatus(status) {
  if (!status) return;

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

function unwrapData(result) {
  if (!result) return result;

  if (result.data?.data) return result.data.data;
  if (result.data) return result.data;

  return result;
}

function getRawPayload(error) {
  return (
    error?.originalError?.response?.data ||
    error?.response?.data ||
    error?.data ||
    error
  );
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

function toSkillText(value) {
  if (!value) return "";

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value || "");
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
    const parts = url.pathname.split("/").filter(Boolean);

    return host === "github.com" && parts.length >= 1;
  } catch {
    return false;
  }
}