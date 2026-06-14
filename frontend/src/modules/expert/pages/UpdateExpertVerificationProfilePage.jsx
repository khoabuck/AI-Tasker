import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertProfileService from "../../../services/expertProfile.service";

const emptyForm = {
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

export default function UpdateExpertVerificationProfilePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const formErrors = useMemo(() => validateForm(formData), [formData]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const profile = await expertProfileService.getMyExpertProfile();

      setFormData({
        skills: profile?.skills || "",
        yearsOfExperience: profile?.yearsOfExperience ?? "",
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
    } catch (err) {
      console.error("LOAD PROFILE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
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

      const result =
        await expertProfileService.updateVerificationExpertProfile(formData);

      console.log("UPDATE VERIFICATION RESULT:", result);

      const applied = Boolean(result?.applied || result?.Applied);
      const reviewStatus = getReviewStatus(result);
      const message = getResultMessage(result);
      const missingInformation = getMissingInformation(result);

      updateLocalUserStatus("ACTIVE");

      if (applied) {
        setModal({
          type: "success",
          title: "Verification update approved",
          message:
            message ||
            "AI approved your verification update. The new data has been applied.",
          detail: "",
          showBackProfile: true,
          showEditAgain: false,
        });

        setTimeout(() => {
          navigate("/expert/profile", { replace: true });
        }, 1200);

        return;
      }

      setModal({
        type: "warning",
        title: `Verification update ${reviewStatus || "needs correction"}`,
        message:
          message ||
          "AI did not approve this update. Your current profile was kept.",
        detail:
          missingInformation ||
          "Please improve your skills, experience proof, public links, or certificates and try again.",
        showBackProfile: true,
        showEditAgain: true,
      });
    } catch (err) {
      console.error("UPDATE VERIFICATION ERROR:", err?.response?.data || err);

      setModal({
        type: "danger",
        title: "Verification update failed",
        message: getFriendlyError(err),
        detail: "Your current profile was not changed.",
        showBackProfile: true,
        showEditAgain: true,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading verification profile...
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-purple-300">
              Update Verification Profile
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Update AI-reviewed information
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              This update will be reviewed by AI. If AI approves it, the new
              data will be applied. If AI needs correction or rejects it, your
              current profile will be kept.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-white/10 bg-[#151a22] p-6"
          >
            <section>
              <h2 className="mb-4 text-lg font-bold text-white">
                Skills & Experience
              </h2>

              <div className="space-y-4">
                <TextInput
                  label="Skills"
                  required
                  value={formData.skills}
                  onChange={(value) => updateField("skills", value)}
                  onBlur={() => markTouched("skills")}
                  error={getFieldError("skills")}
                  placeholder="React, JavaScript, C#, SQL"
                />

                <NumberInput
                  label="Years of Experience"
                  required
                  value={formData.yearsOfExperience}
                  onChange={(value) => updateField("yearsOfExperience", value)}
                  onBlur={() => markTouched("yearsOfExperience")}
                  error={getFieldError("yearsOfExperience")}
                  placeholder="Example: 2"
                />
              </div>
            </section>

            <section className="border-t border-white/10 pt-6">
              <h2 className="mb-4 text-lg font-bold text-white">
                Public Proof Links
              </h2>

              <p className="mb-4 text-sm text-gray-500">
                Add at least 2 public links for AI verification.
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
                  className="rounded-xl border border-purple-400/50 bg-purple-400/10 px-4 py-2 text-sm font-bold text-purple-200 transition hover:bg-purple-400 hover:text-black"
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
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-purple-300"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex justify-end gap-3 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={() => navigate("/expert/profile")}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl border border-purple-400/60 bg-purple-400/10 px-5 py-3 text-sm font-bold text-purple-200 transition hover:bg-purple-400 hover:text-black disabled:opacity-50"
              >
                {saving ? "Submitting to AI..." : "Submit AI Verification"}
              </button>
            </div>
          </form>
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

function validateForm(data) {
  const errors = {};

  if (isEmpty(data.skills)) {
    errors.skills = "Skills are required.";
  } else if (String(data.skills).trim().length < 10) {
    errors.skills = "Skills must be more specific.";
  }

  if (isEmpty(data.yearsOfExperience)) {
    errors.yearsOfExperience = "Years of experience is required.";
  }

  const years = Number(data.yearsOfExperience || 0);

  if (!isEmpty(data.yearsOfExperience) && years < 0) {
    errors.yearsOfExperience = "Years of experience must be 0 or higher.";
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
      !isEmpty(item.certificateUrl) ||
      !isEmpty(item.issuedAt)
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
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-300"
      />

      <FieldError message={error} />
    </div>
  );
}

function NumberInput(props) {
  return (
    <TextInput
      {...props}
      onChange={(value) => {
        if (/^\d*$/.test(value)) props.onChange(value);
      }}
    />
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-2 text-xs font-semibold text-red-300">{message}</p>;
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

function getResultMessage(result) {
  return (
    result?.message ||
    result?.Message ||
    result?.profileReviewNote ||
    result?.ProfileReviewNote ||
    ""
  );
}

function getMissingInformation(result) {
  const value =
    result?.missingInformation ||
    result?.MissingInformation ||
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
  return /^https?:\/\//i.test(String(value || ""));
}

function getFriendlyError(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.message ||
    "Something went wrong. Please try again."
  );
}