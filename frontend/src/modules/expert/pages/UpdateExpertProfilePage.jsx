import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertProfileService from "../../../services/expertProfile.service";
import uploadService from "../../../services/upload.service";

const emptyBasicForm = {
  fullName: "",
  avatarUrl: "",
  professionalTitle: "",
  bio: "",
  expectedProjectBudgetMin: "",
  expectedProjectBudgetMax: "",
  preferredProjectDurationDays: "",
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

  const [basicSubmitted, setBasicSubmitted] = useState(false);
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

      const profile = await expertProfileService.getMyExpertProfile();

      setBasicForm({
        fullName: profile?.fullName || profile?.FullName || "",
        avatarUrl: profile?.avatarUrl || profile?.AvatarUrl || "",
        professionalTitle:
          profile?.professionalTitle || profile?.ProfessionalTitle || "",
        bio: profile?.bio || profile?.Bio || "",
        expectedProjectBudgetMin:
          profile?.expectedProjectBudgetMin ??
          profile?.ExpectedProjectBudgetMin ??
          "",
        expectedProjectBudgetMax:
          profile?.expectedProjectBudgetMax ??
          profile?.ExpectedProjectBudgetMax ??
          "",
        preferredProjectDurationDays:
          profile?.preferredProjectDurationDays ??
          profile?.PreferredProjectDurationDays ??
          "",
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

    setBasicForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateVerificationField = (name, value) => {
    setError("");
    setMessage("");

    setVerificationForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateCertificate = (index, name, value) => {
    setError("");
    setMessage("");

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
      setError("");
      setMessage("");

      const imageUrl = await uploadService.uploadImage(file, "avatar");

      updateBasicField("avatarUrl", imageUrl);
    } catch (err) {
      console.error("UPLOAD AVATAR ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot upload avatar."));
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleSaveBasic = async (event) => {
    event.preventDefault();

    setBasicSubmitted(true);
    setError("");
    setMessage("");

    const errors = validateBasicForm(basicForm);

    if (Object.keys(errors).length > 0) {
      setActiveTab("basic");
      setError("Please check the highlighted basic profile fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSavingBasic(true);

      await expertProfileService.updateBasicExpertProfile(basicForm);

      setMessage(
        "Basic profile updated successfully. This update was applied directly."
      );

      updateLocalUserStatus("ACTIVE");

      setTimeout(() => {
        navigate("/expert/profile", { replace: true });
      }, 800);
    } catch (err) {
      console.error("UPDATE BASIC PROFILE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot update basic profile."));
    } finally {
      setSavingBasic(false);
    }
  };

  const handleSaveVerification = async (event) => {
    event.preventDefault();

    setVerificationSubmitted(true);
    setError("");
    setMessage("");

    const errors = validateVerificationForm(verificationForm);

    if (Object.keys(errors).length > 0) {
      setActiveTab("verification");
      setError("Please check the highlighted verification fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSavingVerification(true);

      const result =
        await expertProfileService.updateVerificationExpertProfile(
          verificationForm
        );

      console.log("UPDATE VERIFICATION RESULT:", result);

      updateLocalUserStatus("ACTIVE");

      const applied = Boolean(result?.applied || result?.Applied);
      const resultMessage = getResultMessage(result);
      const missingInformation = getMissingInformation(result);

      if (applied) {
        setMessage(
          resultMessage ||
            "Verification update approved. Your verification information has been applied."
        );

        setTimeout(() => {
          navigate("/expert/profile", { replace: true });
        }, 1000);

        return;
      }

      setMessage(
        resultMessage ||
          `Verification update was reviewed but not applied. Your current verified profile is kept.${
            missingInformation
              ? `\nMissing information: ${missingInformation}`
              : ""
          }`
      );
    } catch (err) {
      console.error(
        "UPDATE VERIFICATION ERROR:",
        err?.response?.data || err
      );

      setError(
        getFriendlyError(
          err,
          "Cannot update verification profile. Your current verified profile was not changed."
        )
      );
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
                  Name, avatar, title, bio, budget and availability.
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

          {error && <Alert type="danger" title="Update error" message={error} />}

          {activeTab === "basic" && (
            <BasicProfileForm
              formData={basicForm}
              errors={basicSubmitted ? basicErrors : {}}
              saving={savingBasic}
              uploadingAvatar={uploadingAvatar}
              onChange={updateBasicField}
              onSubmit={handleSaveBasic}
              onAvatarUpload={handleAvatarUpload}
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
            />
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function BasicProfileForm({
  formData,
  errors,
  saving,
  uploadingAvatar,
  onChange,
  onSubmit,
  onAvatarUpload,
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
              {uploadingAvatar ? "Uploading..." : "Upload Avatar"}
              <input
                type="file"
                accept="image/*"
                disabled={saving || uploadingAvatar}
                onChange={onAvatarUpload}
                className="hidden"
              />
            </label>

            <input
              type="url"
              value={formData.avatarUrl}
              disabled={saving || uploadingAvatar}
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

        <NumberInput
          label="Expected Budget Min"
          value={formData.expectedProjectBudgetMin}
          error={errors.expectedProjectBudgetMin}
          onChange={(value) => onChange("expectedProjectBudgetMin", value)}
          placeholder="100"
          required
        />

        <NumberInput
          label="Expected Budget Max"
          value={formData.expectedProjectBudgetMax}
          error={errors.expectedProjectBudgetMax}
          onChange={(value) => onChange("expectedProjectBudgetMax", value)}
          placeholder="1000"
          required
        />

        <NumberInput
          label="Preferred Project Duration Days"
          value={formData.preferredProjectDurationDays}
          error={errors.preferredProjectDurationDays}
          onChange={(value) =>
            onChange("preferredProjectDurationDays", value)
          }
          placeholder="14"
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

      <div className="mt-8 flex justify-end gap-3">
        <button
          type="submit"
          disabled={saving || uploadingAvatar}
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

      <FieldError message={errors.proof} />

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Certificates</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add public certificate proof if available.
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
                  onChange={(value) =>
                    onCertificateChange(index, "certificateName", value)
                  }
                  placeholder="AWS Cloud Practitioner"
                />

                <TextInput
                  label="Certificate Issuer"
                  value={certificate.certificateIssuer}
                  onChange={(value) =>
                    onCertificateChange(index, "certificateIssuer", value)
                  }
                  placeholder="Amazon"
                />

                <TextInput
                  label="Certificate URL"
                  value={certificate.certificateUrl}
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
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl border border-purple-400/60 bg-purple-400/10 px-6 py-3 text-sm font-bold text-purple-200 transition hover:bg-purple-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Submitting..." : "Submit Verification Update"}
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

function validateBasicForm(formData) {
  const errors = {};

  if (!String(formData.fullName || "").trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!String(formData.professionalTitle || "").trim()) {
    errors.professionalTitle = "Professional title is required.";
  }

  if (String(formData.professionalTitle || "").trim().length < 5) {
    errors.professionalTitle =
      "Professional title must be at least 5 characters.";
  }

  if (!String(formData.bio || "").trim()) {
    errors.bio = "Bio is required.";
  }

  if (String(formData.bio || "").trim().length < 20) {
    errors.bio = "Bio must be at least 20 characters.";
  }

  const minBudget = Number(formData.expectedProjectBudgetMin);
  const maxBudget = Number(formData.expectedProjectBudgetMax);
  const duration = Number(formData.preferredProjectDurationDays);

  if (formData.expectedProjectBudgetMin === "" || Number.isNaN(minBudget)) {
    errors.expectedProjectBudgetMin = "Minimum budget is required.";
  }

  if (minBudget < 0) {
    errors.expectedProjectBudgetMin = "Minimum budget cannot be negative.";
  }

  if (formData.expectedProjectBudgetMax === "" || Number.isNaN(maxBudget)) {
    errors.expectedProjectBudgetMax = "Maximum budget is required.";
  }

  if (maxBudget < 0) {
    errors.expectedProjectBudgetMax = "Maximum budget cannot be negative.";
  }

  if (
    !Number.isNaN(minBudget) &&
    !Number.isNaN(maxBudget) &&
    maxBudget < minBudget
  ) {
    errors.expectedProjectBudgetMax =
      "Maximum budget must be greater than or equal to minimum budget.";
  }

  if (formData.preferredProjectDurationDays === "" || Number.isNaN(duration)) {
    errors.preferredProjectDurationDays = "Preferred duration is required.";
  }

  if (duration <= 0) {
    errors.preferredProjectDurationDays =
      "Preferred duration must be greater than 0.";
  }

  if (formData.avatarUrl && !isValidUrl(formData.avatarUrl)) {
    errors.avatarUrl = "Avatar URL must be valid.";
  }

  return errors;
}

function validateVerificationForm(formData) {
  const errors = {};

  if (!String(formData.skills || "").trim()) {
    errors.skills = "Skills are required.";
  }

  const skills = String(formData.skills || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (skills.length < 2) {
    errors.skills = "Please enter at least 2 skills, separated by commas.";
  }

  const years = Number(formData.yearsOfExperience);

  if (formData.yearsOfExperience === "" || Number.isNaN(years)) {
    errors.yearsOfExperience = "Years of experience is required.";
  }

  if (years < 0) {
    errors.yearsOfExperience = "Years of experience cannot be negative.";
  }

  if (formData.portfolioUrl && !isValidUrl(formData.portfolioUrl)) {
    errors.portfolioUrl = "Portfolio URL must be valid.";
  }

  if (formData.linkedInUrl && !isValidUrl(formData.linkedInUrl)) {
    errors.linkedInUrl = "LinkedIn URL must be valid.";
  }

  if (formData.gitHubUrl && !isValidUrl(formData.gitHubUrl)) {
    errors.gitHubUrl = "GitHub URL must be valid.";
  }

  const hasPublicProof =
    String(formData.portfolioUrl || "").trim() ||
    String(formData.linkedInUrl || "").trim() ||
    String(formData.gitHubUrl || "").trim();

  const hasCertificateProof = (formData.certificates || []).some(
    (item) =>
      String(item.certificateName || "").trim() ||
      String(item.certificateIssuer || "").trim() ||
      String(item.certificateUrl || "").trim()
  );

  if (!hasPublicProof && !hasCertificateProof) {
    errors.proof =
      "Please add at least one public proof link or one certificate.";
  }

  return errors;
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

function isValidUrl(value) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
  return (
    result?.missingInformation ||
    result?.MissingInformation ||
    result?.missingInfo ||
    result?.MissingInfo ||
    ""
  );
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

function getFriendlyError(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.response?.data ||
    err?.message ||
    fallback
  );
}