import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertProfileService from "../../../services/expertProfile.service";
import uploadService from "../../../services/upload.service";

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

export default function UpdateExpertProfilePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(() => ({
    ...emptyForm,
    certificates: [],
  }));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formErrors = useMemo(() => validateForm(formData), [formData]);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await expertProfileService.getMyExpertProfile();
      const profile = unwrapData(result);

      setFormData(buildFormFromProfile(profile));
    } catch (err) {
      console.error("LOAD PROFILE ERROR:", getRawPayload(err));

      const status = err?.response?.status || err?.status;

      if (status === 404) {
        navigate("/expert/setup-profile", { replace: true });
        return;
      }

      setError("We could not load your profile right now. Please try again.");
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

  const updateField = (name, value) => {
    setError("");
    setSuccess("");

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateCertificate = (index, name, value) => {
    setError("");
    setSuccess("");

    setFormData((prev) => {
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
      setSuccess("");

      const result = await uploadService.uploadImage(file, "avatar");
      const imageUrl = extractUploadUrl(result);

      if (!imageUrl) {
        throw new Error("Upload succeeded but image URL was not found.");
      }

      updateField("avatarUrl", imageUrl);
    } catch (err) {
      console.error("AVATAR UPLOAD ERROR:", getRawPayload(err));
      setError("We could not upload your avatar. Please try again.");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitted(true);
    setError("");
    setSuccess("");

    const errors = validateForm(formData);

    if (Object.keys(errors).length > 0) {
      setError("Please check the highlighted fields before saving.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...formData,
        yearsOfExperience: Number(formData.yearsOfExperience || 0),
        certificates: normalizeCertificatesForPayload(formData.certificates),
      };

      if (typeof expertProfileService.updateExpertProfile === "function") {
        await expertProfileService.updateExpertProfile(payload);
      } else {
        await expertProfileService.updateMyExpertProfile(payload);
      }

      setSuccess("Your profile has been updated successfully.");

      setTimeout(() => {
        navigate("/expert/profile");
      }, 800);
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", getRawPayload(err));
      setError(getFriendlySubmitError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading your profile...
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Update Expert Profile
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Keep your expert profile up to date
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Update your bio, skills, public links, and optional
                certificates so clients can better understand your expertise.
              </p>
            </div>

            <Link
              to="/expert/profile"
              className="w-fit rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
            >
              Back to Profile
            </Link>
          </div>

          {error && (
            <Alert type="danger" title="Cannot save profile" message={error} />
          )}

          {success && (
            <Alert type="success" title="Profile updated" message={success} />
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-white/10 bg-[#151a22] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
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
                    placeholder="Describe your AI experience, projects, and strengths."
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
                Experience and Availability
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
                Portfolio and GitHub are required. LinkedIn is optional.
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
                          <p className="font-bold text-white">
                            Certificate {index + 1}
                          </p>

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
              <Link
                to="/expert/profile"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ExpertLayout>
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
      onChange={(value) => {
        if (/^\d*$/.test(value)) props.onChange(value);
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

function validateForm(data) {
  const errors = {};

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

function getFriendlySubmitError(error) {
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

  return message || "We could not save your profile. Please try again.";
}

function unwrapData(result) {
  if (!result) return result;
  if (result.data?.data) return result.data.data;
  if (result.data) return result.data;
  return result;
}

function getRawPayload(error) {
  return error?.response?.data || error?.data || error;
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