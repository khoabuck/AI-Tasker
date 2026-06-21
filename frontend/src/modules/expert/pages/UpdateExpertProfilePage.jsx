import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertProfileService from "../../../services/expertProfile.service";
import uploadService from "../../../services/upload.service";
import authService from "../../../services/auth.service";

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
  certificates: [
    {
      certificateName: "",
      certificateIssuer: "",
      certificateUrl: "",
      issuedAt: "",
    },
  ],
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
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      setModal(null);

      const profile = await expertProfileService.getMyExpertProfile();

      setBasicForm({
        fullName: profile?.fullName || profile?.FullName || "",
        avatarUrl: profile?.avatarUrl || profile?.AvatarUrl || "",
        professionalTitle:
          profile?.professionalTitle || profile?.ProfessionalTitle || "",
        bio: profile?.bio || profile?.Bio || "",
        availableForWork:
          profile?.availableForWork ??
          profile?.AvailableForWork ??
          true,
      });

      setVerificationForm({
        skills: toSkillText(profile?.skills || profile?.Skills),
        yearsOfExperience:
          profile?.yearsOfExperience ?? profile?.YearsOfExperience ?? "",
        portfolioUrl: profile?.portfolioUrl || profile?.PortfolioUrl || "",
        linkedInUrl: profile?.linkedInUrl || profile?.LinkedInUrl || "",
        gitHubUrl: profile?.gitHubUrl || profile?.GitHubUrl || "",
        certificates: normalizeCertificatesForForm(
          profile?.certificates || profile?.Certificates
        ),
      });
    } catch (err) {
      console.error("LOAD UPDATE PROFILE ERROR:", err?.response?.data || err);

      if (err?.response?.status === 404) {
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
      const certificates = [...prev.certificates];

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
    setVerificationForm((prev) => ({
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
    setVerificationForm((prev) => {
      const certificates = prev.certificates.filter((_, i) => i !== index);

      return {
        ...prev,
        certificates:
          certificates.length > 0
            ? certificates
            : emptyVerificationForm.certificates,
      };
    });
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

      const imageUrl = await uploadService.uploadImage(file, "avatar");

      updateBasicField("avatarUrl", imageUrl);

      try {
        setSyncingAvatar(true);

        await authService.updateMyAvatar(imageUrl);

        setMessage(
          "Avatar uploaded successfully. Your account avatar was updated."
        );
      } catch (avatarErr) {
        console.error(
          "SYNC AUTH AVATAR ERROR:",
          avatarErr?.response?.data || avatarErr
        );

        setError(
          getFriendlyError(
            avatarErr,
            "Avatar was uploaded, but account avatar could not be updated. Please click Save Basic Information to keep it in your expert profile."
          )
        );
      }
    } catch (err) {
      console.error("UPLOAD AVATAR ERROR:", err?.response?.data || err);

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

      if (payload.avatarUrl) {
        try {
          setSyncingAvatar(true);
          await authService.updateMyAvatar(payload.avatarUrl);
        } catch (avatarErr) {
          console.error(
            "SYNC AUTH AVATAR ON SAVE ERROR:",
            avatarErr?.response?.data || avatarErr
          );
        } finally {
          setSyncingAvatar(false);
        }
      }

      updateLocalUserStatus("ACTIVE");

      setModal({
        type: "success",
        title: "Basic profile updated",
        message:
          "Your basic profile was updated directly. AI review was not required.",
        showBackProfile: true,
        showEditAgain: false,
      });
    } catch (err) {
      console.error("UPDATE BASIC PROFILE ERROR:", err?.response?.data || err);

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

      const result =
        await expertProfileService.updateVerificationExpertProfile(payload);

      console.log("UPDATE VERIFICATION RESULT:", result);

      updateLocalUserStatus("ACTIVE");

      const applied = Boolean(result?.applied || result?.Applied);
      const reviewStatus = getReviewStatus(result);
      const resultMessage = getResultMessage(result);
      const missingInformation = getMissingInformation(result);

      if (applied) {
        setModal({
          type: "success",
          title: "Verification update approved",
          message:
            resultMessage ||
            "AI approved your verification update. The new data has been applied.",
          detail: "",
          showBackProfile: true,
          showEditAgain: false,
        });

        return;
      }

      setModal({
        type: "warning",
        title: `Verification update ${reviewStatus || "needs correction"}`,
        message:
          resultMessage ||
          "AI did not approve this update. Your current verified profile was kept.",
        detail:
          missingInformation ||
          "Please improve your skills, public proof links, or certificates and try again.",
        showBackProfile: true,
        showEditAgain: true,
      });
    } catch (err) {
      console.error("UPDATE VERIFICATION ERROR:", err?.response?.data || err);

      setModal({
        type: "danger",
        title: "Verification update failed",
        message: getFriendlyError(
          err,
          "Cannot update verification profile. Your current verified profile was not changed."
        ),
        detail: "Your current profile was not changed.",
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
              Basic information is saved directly. Verification information is
              sent to AI review and only approved updates are applied.
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
                  Skills, experience, portfolio, social proof and certificates.
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
          This section updates your public profile directly without AI review.
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
            Upload image or paste image URL.
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
          placeholder="Junior AI Chatbot Developer"
          required
        />


        <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
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
          This section is reviewed by AI before being applied to your verified
          profile.
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
            placeholder="React, JavaScript, C#, SQL"
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
          Add at least 2 links: Portfolio, LinkedIn, or GitHub.
        </p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <TextInput
            label="Portfolio URL"
            value={formData.portfolioUrl}
            error={errors.portfolioUrl}
            onChange={(value) => onChange("portfolioUrl", value)}
            placeholder="https://portfolio.com"
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
          />
        </div>

        <FieldError message={errors.publicLinks} />
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Certificates</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add at least one certificate or public certificate proof.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onAddCertificate}
            className="rounded-xl border border-purple-400/50 bg-purple-400/10 px-4 py-2 text-sm font-bold text-purple-200 transition hover:bg-purple-400 hover:text-black disabled:opacity-50"
          >
            Add Certificate
          </button>
        </div>

        <FieldError message={errors.certificates} />
        <FieldError message={errors.duplicateCertificates} />

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
                  disabled={saving || formData.certificates.length === 1}
                  onClick={() => onRemoveCertificate(index)}
                  className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextInput
                  label="Certificate Name"
                  value={certificate.certificateName}
                  error={errors[`certificateName_${index}`]}
                  onChange={(value) =>
                    onCertificateChange(index, "certificateName", value)
                  }
                  placeholder="AWS Cloud Practitioner"
                />

                <TextInput
                  label="Certificate Issuer"
                  value={certificate.certificateIssuer}
                  error={errors[`certificateIssuer_${index}`]}
                  onChange={(value) =>
                    onCertificateChange(index, "certificateIssuer", value)
                  }
                  placeholder="Amazon"
                />

                <TextInput
                  label="Certificate URL"
                  value={certificate.certificateUrl}
                  error={errors[`certificateUrl_${index}`]}
                  onChange={(value) =>
                    onCertificateChange(index, "certificateUrl", value)
                  }
                  placeholder="https://..."
                />

                <DateInput
                  label="Issued At"
                  value={certificate.issuedAt}
                  onChange={(value) =>
                    onCertificateChange(index, "issuedAt", value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
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
          {saving ? "Submitting to AI..." : "Submit AI Verification"}
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
        value={value}
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
        value={value}
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

function DateInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>

      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
      />
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
        value={value}
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

  const publicLinks = [
    formData.portfolioUrl,
    formData.linkedInUrl,
    formData.gitHubUrl,
  ].filter((item) => !isEmpty(item));

  if (publicLinks.length < 2) {
    errors.publicLinks =
      "Please add at least 2 links: Portfolio, LinkedIn, or GitHub.";
  }

  ["portfolioUrl", "linkedInUrl", "gitHubUrl"].forEach((field) => {
    if (!isEmpty(formData[field]) && !isValidUrl(formData[field])) {
      errors[field] = "URL must start with http:// or https://";
    }
  });

  const certificates = formData.certificates || [];

  const validCertificates = certificates.filter(hasAnyCertificateValue);

  if (validCertificates.length === 0) {
    errors.certificates = "At least one certificate is required.";
  }

  const certificateUrls = [];

  certificates.forEach((item, index) => {
    const hasAnyValue = hasAnyCertificateValue(item);

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
    portfolioUrl: String(formData.portfolioUrl || "").trim() || null,
    linkedInUrl: String(formData.linkedInUrl || "").trim() || null,
    gitHubUrl: String(formData.gitHubUrl || "").trim() || null,
    certificates: (formData.certificates || [])
      .filter(hasAnyCertificateValue)
      .map((item) => ({
        certificateName: String(item.certificateName || "").trim(),
        certificateIssuer: String(item.certificateIssuer || "").trim(),
        certificateUrl: String(item.certificateUrl || "").trim(),
        issuedAt: item.issuedAt || null,
      })),
  };
}

function normalizeCertificatesForForm(certificates) {
  if (!Array.isArray(certificates) || certificates.length === 0) {
    return emptyVerificationForm.certificates;
  }

  return certificates.map((item) => ({
    certificateName: item.certificateName || item.CertificateName || "",
    certificateIssuer: item.certificateIssuer || item.CertificateIssuer || "",
    certificateUrl: item.certificateUrl || item.CertificateUrl || "",
    issuedAt: toDateInputValue(item.issuedAt || item.IssuedAt),
  }));
}

function hasAnyCertificateValue(item) {
  return (
    !isEmpty(item?.certificateName) ||
    !isEmpty(item?.certificateIssuer) ||
    !isEmpty(item?.certificateUrl) ||
    !isEmpty(item?.issuedAt)
  );
}

function toSkillText(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function toDateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function getReviewStatus(result) {
  return String(
    result?.profileReviewStatus ||
      result?.ProfileReviewStatus ||
      result?.reviewStatus ||
      result?.ReviewStatus ||
      result?.status ||
      result?.Status ||
      ""
  )
    .trim()
    .toUpperCase();
}

function getResultMessage(result) {
  return (
    result?.message ||
    result?.Message ||
    result?.profileReviewNote ||
    result?.ProfileReviewNote ||
    result?.reviewNote ||
    result?.ReviewNote ||
    ""
  );
}

function getMissingInformation(result) {
  const value =
    result?.missingInformation ||
    result?.MissingInformation ||
    result?.missingInfo ||
    result?.MissingInfo ||
    result?.errors ||
    result?.Errors ||
    "";

  if (Array.isArray(value)) return value.join(", ");

  if (typeof value === "object" && value !== null) {
    return Object.values(value).flat().join(", ");
  }

  return String(value || "");
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

function isEmpty(value) {
  return String(value || "").trim() === "";
}

function isValidUrl(value) {
  if (isEmpty(value)) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  if (data?.message) return data.message;

  if (data?.title) return data.title;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || fallback || "Something went wrong. Please try again.";
}