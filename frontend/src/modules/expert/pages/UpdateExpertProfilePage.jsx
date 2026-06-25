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
  const [profileSnapshot, setProfileSnapshot] = useState(null);

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

      setProfileSnapshot(profile);
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

      if (typeof expertProfileService.updateBasicExpertProfile === "function") {
        await expertProfileService.updateBasicExpertProfile(payload);
      } else {
        await expertProfileService.updateExpertProfile(
          buildCombinedPayload({
            profileSnapshot,
            basicForm,
            verificationForm,
          })
        );
      }

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

      if (
        typeof expertProfileService.updateVerificationExpertProfile ===
        "function"
      ) {
        result =
          await expertProfileService.updateVerificationExpertProfile(payload);
      } else {
        result = await expertProfileService.updateExpertProfile(
          buildCombinedPayload({
            profileSnapshot,
            basicForm,
            verificationForm,
          })
        );
      }

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
        title: "Verification needs improvement",
        message:
          resultMessage ||
          "Your verification update needs more evidence before it can be applied.",
        detail:
          missingInformation ||
          "Please improve your skills, public proof links, or certificates and try again.",
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

          <section className="mb-8 rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Update Profile
            </p>

            <h1 className="text-3xl font-extrabold text-white md:text-4xl">
              Update your expert profile
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
              Basic information is saved directly. Verification information can
              refresh your profile score after review.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  activeTab === "basic"
                    ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                }`}
              >
                <p className="font-bold">Basic Information</p>
                <p className="mt-1 text-xs">
                  Name, avatar, title, bio and availability.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("verification")}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  activeTab === "verification"
                    ? "border-purple-400/60 bg-purple-400/10 text-purple-200"
                    : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                }`}
              >
                <p className="font-bold">Verification Information</p>
                <p className="mt-1 text-xs">
                  Skills, experience, portfolio, GitHub and certificates.
                </p>
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
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-white">
          Basic Information
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-400">
          This section updates your public profile directly.
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:flex-row md:items-center">
        <div className="h-28 w-28 overflow-hidden rounded-3xl border border-cyan-400/30 bg-cyan-400/10">
          {formData.avatarUrl ? (
            <img
              src={formData.avatarUrl}
              alt="Avatar"
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

        <div className="flex-1">
          <p className="font-bold text-white">Profile Avatar</p>

          <p className="mt-1 text-sm text-gray-400">
            Upload an image or paste an image URL.
          </p>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black">
              {uploadingAvatar
                ? "Uploading..."
                : syncingAvatar
                ? "Updating..."
                : "Upload Avatar"}

              <input
                type="file"
                accept="image/*"
                disabled={saving || uploadingAvatar || syncingAvatar}
                onChange={onAvatarUpload}
                className="hidden"
              />
            </label>

            <input
              type="url"
              value={formData.avatarUrl}
              disabled={saving || uploadingAvatar || syncingAvatar}
              onChange={(event) => onChange("avatarUrl", event.target.value)}
              placeholder="https://avatar-url..."
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
            />
          </div>

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

        <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 md:col-span-2">
          <div>
            <p className="text-sm font-bold text-white">Available For Work</p>
            <p className="mt-1 text-xs text-gray-500">
              Show clients that you are ready for new projects.
            </p>
          </div>

          <input
            type="checkbox"
            checked={Boolean(formData.availableForWork)}
            disabled={saving}
            onChange={(event) =>
              onChange("availableForWork", event.target.checked)
            }
            className="h-5 w-5 accent-cyan-400"
          />
        </label>
      </div>

      <div className="mt-5">
        <TextareaInput
          label="Bio"
          value={formData.bio}
          error={errors.bio}
          onChange={(value) => onChange("bio", value)}
          placeholder="Introduce your expertise, experience, and working style..."
          rows={7}
          required
        />
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving || uploadingAvatar || syncingAvatar}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving || uploadingAvatar || syncingAvatar}
          className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-6 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Basic Information"}
        </button>
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
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-white">
          Verification Information
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-400">
          Add strong public evidence so clients can trust your expertise.
        </p>
      </div>

      <section>
        <h3 className="mb-4 text-lg font-bold text-white">
          Skills & Experience
        </h3>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextInput
            label="Skills"
            value={formData.skills}
            error={errors.skills}
            onChange={(value) => onChange("skills", value)}
            placeholder="AI Automation, RAG, Chatbot, Python"
            required
          />

          <NumberInput
            label="Years Of Experience"
            value={formData.yearsOfExperience}
            error={errors.yearsOfExperience}
            onChange={(value) => onChange("yearsOfExperience", value)}
            placeholder="2"
            required
          />
        </div>
      </section>

      <section className="mt-8 border-t border-white/10 pt-6">
        <h3 className="mb-2 text-lg font-bold text-white">
          Public Proof Links
        </h3>

        <p className="mb-4 text-sm text-gray-500">
          Portfolio and GitHub are required. LinkedIn is optional.
        </p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <TextInput
            label="Portfolio URL"
            value={formData.portfolioUrl}
            error={errors.portfolioUrl}
            onChange={(value) => onChange("portfolioUrl", value)}
            placeholder="https://portfolio.com"
            required
          />

          <TextInput
            label="LinkedIn URL"
            value={formData.linkedInUrl}
            error={errors.linkedInUrl}
            onChange={(value) => onChange("linkedInUrl", value)}
            placeholder="https://linkedin.com/in/..."
          />

          <TextInput
            label="GitHub URL"
            value={formData.gitHubUrl}
            error={errors.gitHubUrl}
            onChange={(value) => onChange("gitHubUrl", value)}
            placeholder="https://github.com/..."
            required
          />
        </div>

        <FieldError message={errors.publicLinks} />
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Certificates</h3>
            <p className="mt-1 text-sm text-gray-500">
              Optional. If you add one, only certificate URL and type are
              required.
            </p>
          </div>

          <button
            type="button"
            disabled={saving || (formData.certificates || []).length >= 10}
            onClick={onAddCertificate}
            className="rounded-xl border border-purple-400/50 bg-purple-400/10 px-4 py-2 text-sm font-bold text-purple-200 transition hover:bg-purple-400 hover:text-black disabled:opacity-50"
          >
            Add Certificate
          </button>
        </div>

        <FieldError message={errors.certificates} />
        <FieldError message={errors.duplicateCertificates} />

        {(formData.certificates || []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm leading-6 text-gray-400">
            <p className="font-bold text-gray-300">No certificates added.</p>
            <p className="mt-1">
              You can save without certificates. Adding certificates can
              strengthen your profile.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.certificates.map((certificate, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="font-bold text-white">Certificate {index + 1}</p>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onRemoveCertificate(index)}
                    className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl border border-purple-400/60 bg-purple-400/10 px-6 py-3 text-sm font-bold text-purple-200 transition hover:bg-purple-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Verification Information"}
        </button>
      </div>
    </form>
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
        className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] ${
          error ? "border-red-400/60" : "border-white/10"
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
        className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] ${
          error ? "border-red-400/60" : "border-white/10"
        }`}
      />

      <FieldError message={error} />
    </label>
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
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label} {required && <span className="text-red-400">*</span>}
      </span>

      <textarea
        rows={rows}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] ${
          error ? "border-red-400/60" : "border-white/10"
        }`}
      />

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
  const icon =
    modal.type === "success"
      ? "check_circle"
      : modal.type === "warning"
      ? "warning"
      : "error";

  const color =
    modal.type === "success"
      ? "text-green-300"
      : modal.type === "warning"
      ? "text-yellow-300"
      : "text-red-300";

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-2xl">
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
          <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-gray-300">
            {modal.detail}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {modal.showEditAgain && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-yellow-300/50 bg-yellow-300/10 px-5 py-3 text-sm font-bold text-yellow-200 transition hover:bg-yellow-300 hover:text-black"
            >
              Edit Again
            </button>
          )}

          {modal.showBackProfile && (
            <button
              type="button"
              onClick={onBackProfile}
              className="rounded-xl border border-cyan-300/50 bg-cyan-300/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-300 hover:text-black"
            >
              Back to Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
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

  if (isEmpty(formData.yearsOfExperience)) {
    errors.yearsOfExperience = "Years of experience is required.";
  }

  const years = Number(formData.yearsOfExperience || 0);

  if (!isEmpty(formData.yearsOfExperience) && years < 0) {
    errors.yearsOfExperience = "Years of experience must be 0 or higher.";
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
    yearsOfExperience: Number(formData.yearsOfExperience || 0),
    portfolioUrl: String(formData.portfolioUrl || "").trim(),
    linkedInUrl: String(formData.linkedInUrl || "").trim(),
    gitHubUrl: String(formData.gitHubUrl || "").trim(),
    certificates: normalizeCertificatesForPayload(formData.certificates),
  };
}

function buildCombinedPayload({ profileSnapshot, basicForm, verificationForm }) {
  return {
    avatarUrl: String(basicForm.avatarUrl || "").trim(),
    fullName: String(basicForm.fullName || "").trim(),
    professionalTitle: String(basicForm.professionalTitle || "").trim(),
    bio: String(basicForm.bio || "").trim(),
    availableForWork: Boolean(basicForm.availableForWork),

    skills: String(verificationForm.skills || "").trim(),
    yearsOfExperience: Number(verificationForm.yearsOfExperience || 0),
    portfolioUrl: String(verificationForm.portfolioUrl || "").trim(),
    linkedInUrl: String(verificationForm.linkedInUrl || "").trim(),
    gitHubUrl: String(verificationForm.gitHubUrl || "").trim(),
    certificates: normalizeCertificatesForPayload(
      verificationForm.certificates
    ),

    expertProfileId:
      profileSnapshot?.expertProfileId || profileSnapshot?.ExpertProfileId,
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