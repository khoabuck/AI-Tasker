import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminPolicyService from "../../../services/adminPolicy.service";

export default function AdminExpertScoringPolicyPage() {
  const [formData, setFormData] = useState({
    minimumProfileScore: 70,
    portfolioWeight: 25,
    githubWeight: 25,
    linkedinWeight: 5,
    skillsWeight: 15,
    experienceWeight: 15,
    certificatesWeight: 10,
    educationWeight: 5,
    isActive: true,
  });

  const [rawPolicy, setRawPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totalWeight = useMemo(() => {
    return (
      Number(formData.portfolioWeight || 0) +
      Number(formData.githubWeight || 0) +
      Number(formData.linkedinWeight || 0) +
      Number(formData.skillsWeight || 0) +
      Number(formData.experienceWeight || 0) +
      Number(formData.certificatesWeight || 0) +
      Number(formData.educationWeight || 0)
    );
  }, [formData]);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const policy = await adminPolicyService.getExpertProfileScoringPolicy();

      setFormData({
        minimumProfileScore: policy.minimumProfileScore ?? 70,
        portfolioWeight: policy.portfolioWeight ?? 25,
        githubWeight: policy.githubWeight ?? 25,
        linkedinWeight: policy.linkedinWeight ?? 5,
        skillsWeight: policy.skillsWeight ?? 15,
        experienceWeight: policy.experienceWeight ?? 15,
        certificatesWeight: policy.certificatesWeight ?? 10,
        educationWeight: policy.educationWeight ?? 5,
        isActive: Boolean(policy.isActive),
      });

      setRawPolicy(policy);
    } catch (err) {
      console.error(
        "LOAD EXPERT SCORING POLICY ERROR:",
        err?.response?.data || err
      );
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (Number(formData.minimumProfileScore) < 0) {
      return "Minimum profile score cannot be negative.";
    }

    if (Number(formData.minimumProfileScore) > 100) {
      return "Minimum profile score cannot be greater than 100.";
    }

    if (totalWeight <= 0) {
      return "Total weight must be greater than 0.";
    }

    const weightFields = [
      "portfolioWeight",
      "githubWeight",
      "linkedinWeight",
      "skillsWeight",
      "experienceWeight",
      "certificatesWeight",
      "educationWeight",
    ];

    const hasNegativeWeight = weightFields.some(
      (field) => Number(formData[field]) < 0
    );

    if (hasNegativeWeight) {
      return "Weights cannot be negative.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updated = await adminPolicyService.updateExpertProfileScoringPolicy(
        formData
      );

      setRawPolicy(updated);
      setMessage("Expert profile scoring policy updated successfully.");
    } catch (err) {
      console.error(
        "UPDATE EXPERT SCORING POLICY ERROR:",
        err?.response?.data || err
      );
      setError(getFriendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Admin Policy
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Expert scoring policy
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Configure how expert profile verification score is calculated.
                Portfolio and GitHub are primary proof signals. LinkedIn is
                optional and should not block profile approval.
              </p>
            </div>

            <button
              type="button"
              onClick={loadPolicy}
              disabled={loading || saving}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {message && (
            <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading scoring policy...
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              <form onSubmit={handleSubmit} className={`${cardStyle} p-6`}>
                <SectionTitle icon="rule_settings" title="Scoring Rules" />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <NumberField
                    label="Minimum Score To Pass"
                    value={formData.minimumProfileScore}
                    min="0"
                    max="100"
                    onChange={(value) =>
                      handleChange("minimumProfileScore", value)
                    }
                  />

                  <BooleanField
                    label="Policy Active"
                    value={formData.isActive}
                    onChange={(value) => handleChange("isActive", value)}
                  />

                  <NumberField
                    label="Portfolio Weight"
                    value={formData.portfolioWeight}
                    min="0"
                    onChange={(value) =>
                      handleChange("portfolioWeight", value)
                    }
                  />

                  <NumberField
                    label="GitHub Weight"
                    value={formData.githubWeight}
                    min="0"
                    onChange={(value) => handleChange("githubWeight", value)}
                  />

                  <NumberField
                    label="LinkedIn Weight"
                    value={formData.linkedinWeight}
                    min="0"
                    onChange={(value) => handleChange("linkedinWeight", value)}
                    hint="LinkedIn is optional. Missing or invalid LinkedIn should only score 0."
                  />

                  <NumberField
                    label="Skills Weight"
                    value={formData.skillsWeight}
                    min="0"
                    onChange={(value) => handleChange("skillsWeight", value)}
                  />

                  <NumberField
                    label="Experience Weight"
                    value={formData.experienceWeight}
                    min="0"
                    onChange={(value) =>
                      handleChange("experienceWeight", value)
                    }
                  />

                  <NumberField
                    label="Certificates Weight"
                    value={formData.certificatesWeight}
                    min="0"
                    onChange={(value) =>
                      handleChange("certificatesWeight", value)
                    }
                  />

                  <NumberField
                    label="Education Weight"
                    value={formData.educationWeight}
                    min="0"
                    onChange={(value) => handleChange("educationWeight", value)}
                  />
                </div>

                <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                  <p className="text-sm font-bold text-cyan-300">
                    Total Weight: {totalWeight}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-gray-400">
                    This frontend accepts flexible total weight because backend
                    may normalize score internally. Recommended total is 100.
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={loadPolicy}
                    disabled={saving}
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-white/20 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reset
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#7C3AED] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Policy"}
                  </button>
                </div>
              </form>

              <aside className="space-y-6">
                <section className={`${cardStyle} p-6`}>
                  <SectionTitle icon="fact_check" title="Policy Summary" />

                  <div className="space-y-4">
                    <InfoItem
                      label="Minimum Pass Score"
                      value={`${formData.minimumProfileScore}/100`}
                    />
                    <InfoItem
                      label="Total Weight"
                      value={String(totalWeight)}
                    />
                    <InfoItem
                      label="Policy Status"
                      value={formData.isActive ? "Active" : "Inactive"}
                    />
                    <InfoItem
                      label="Updated At"
                      value={formatDateTime(rawPolicy?.updatedAt)}
                    />
                  </div>
                </section>

                <section className={`${cardStyle} p-6`}>
                  <SectionTitle icon="info" title="Business Rule" />

                  <div className="space-y-3 text-sm leading-6 text-gray-400">
                    <p>
                      Portfolio URL and GitHub URL are the main evidence sources
                      for expert verification.
                    </p>

                    <p>
                      LinkedIn URL is optional. If LinkedIn is missing, blocked
                      or invalid, LinkedIn score should be 0 but the profile
                      should not be rejected only because of LinkedIn.
                    </p>

                    <p>
                      Final approval should depend on the final profile score
                      reaching the minimum score.
                    </p>
                  </div>
                </section>

                <section className={`${cardStyle} p-6`}>
                  <details>
                    <summary className="cursor-pointer text-sm font-bold text-gray-300">
                      Raw policy data
                    </summary>

                    <pre className="mt-4 max-h-[360px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-gray-300">
                      {JSON.stringify(rawPolicy?.raw || rawPolicy, null, 2)}
                    </pre>
                  </details>
                </section>
              </aside>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <h2 className="text-lg font-bold text-white">{title}</h2>
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, hint }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </label>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
      />

      {hint && <p className="mt-2 text-xs leading-5 text-gray-500">{hint}</p>}
    </div>
  );
}

function BooleanField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </label>

      <select
        value={value ? "true" : "false"}
        onChange={(event) => onChange(event.target.value === "true")}
        className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
      >
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-gray-200">
        {value || "N/A"}
      </p>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFriendlyError(err) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request because the current token does not have ADMIN permission.";
  }

  if (status === 404) {
    return "Expert scoring policy API was not found. Please check backend route.";
  }

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

  return err?.message || "Something went wrong. Please try again.";
}