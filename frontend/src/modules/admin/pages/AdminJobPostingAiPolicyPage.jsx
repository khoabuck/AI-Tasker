import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminJobPostingAiPolicyService from "../../../services/adminJobPostingAiPolicy.service";

const EMPTY_FORM = {
  initialFreeJobPostCredits: 0,
  initialFreeAiGenerationCredits: 0,
  maxDraftJobsPerClient: 0,
  maxSkillsPerJob: 0,
  maxSuggestedSkills: 0,
  minimumSkillRelevanceScore: 0,
  maxRecommendationResults: 0,
  minimumRecommendationMatchScore: 0,
  reason: "",
};

const CREDIT_FIELDS = [
  {
    name: "initialFreeJobPostCredits",
    label: "Free Job Post Credits",
    helper: "Credits given to a new client for posting jobs.",
    icon: "work",
  },
  {
    name: "initialFreeAiGenerationCredits",
    label: "Free AI Generation Credits",
    helper: "Credits given to a new client for using AI job generation.",
    icon: "smart_toy",
  },
];

const LIMIT_FIELDS = [
  {
    name: "maxDraftJobsPerClient",
    label: "Max Draft Jobs",
    helper: "Maximum draft jobs a client can keep at the same time.",
    icon: "inventory_2",
  },
  {
    name: "maxSkillsPerJob",
    label: "Max Skills Per Job",
    helper: "Maximum number of skills allowed on one job post.",
    icon: "psychology",
  },
  {
    name: "maxSuggestedSkills",
    label: "Max Suggested Skills",
    helper: "Maximum number of skills AI can suggest to the client.",
    icon: "tips_and_updates",
  },
  {
    name: "maxRecommendationResults",
    label: "Max Recommendations",
    helper: "Maximum number of AI recommendation results returned.",
    icon: "recommend",
  },
];

const SCORE_FIELDS = [
  {
    name: "minimumSkillRelevanceScore",
    label: "Skill Relevance Score",
    helper: "Minimum score required for AI suggested skills.",
    icon: "rule",
  },
  {
    name: "minimumRecommendationMatchScore",
    label: "Recommendation Match Score",
    helper: "Minimum score required for AI recommendations.",
    icon: "verified",
  },
];

export default function AdminJobPostingAiPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const hasChanged = useMemo(() => {
    if (!policy) return true;

    const fields = Object.keys(EMPTY_FORM).filter((field) => field !== "reason");

    const changedField = fields.some((field) => {
      return Number(form[field] || 0) !== Number(policy[field] || 0);
    });

    return changedField || String(form.reason || "").trim() !== "";
  }, [form, policy]);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setFieldErrors({});

      const data = await adminJobPostingAiPolicyService.getPolicy();

      setPolicy(data);
      setForm(toFormState(data));
    } catch (err) {
      console.error("LOAD JOB AI POLICY ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load job posting AI policy."));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setError("");
    setSuccess("");
    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReset = () => {
    setForm(toFormState(policy));
    setError("");
    setSuccess("");
    setFieldErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validation = validateForm(form);

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError("Please fix the highlighted fields before saving.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      setFieldErrors({});

      const updated = await adminJobPostingAiPolicyService.updatePolicy(
        buildPayload(form)
      );

      setPolicy(updated);
      setForm(toFormState(updated));
      setSuccess("Job posting AI policy has been updated successfully.");
    } catch (err) {
      console.error("UPDATE JOB AI POLICY ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot update job posting AI policy."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Policy Management
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Job posting AI policy
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Control free credits, draft limits, skill suggestions, and AI
              recommendation quality for the client job posting flow.
            </p>
          </div>

          <button
            type="button"
            onClick={loadPolicy}
            disabled={loading || saving}
            className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <Alert
            type="danger"
            title="Please check your input"
            message={error}
            onClose={() => setError("")}
          />
        )}

        {success && (
          <Alert
            type="success"
            title="Policy updated"
            message={success}
            onClose={() => setSuccess("")}
          />
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-12 text-center text-gray-400 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
            <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
              hourglass_empty
            </span>
            Loading job posting AI policy...
          </div>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TopMetricCard
                icon="work"
                label="Job Credits"
                value={formatNumber(form.initialFreeJobPostCredits)}
                helper="Free credits for new clients"
                tone="cyan"
              />

              <TopMetricCard
                icon="smart_toy"
                label="AI Credits"
                value={formatNumber(form.initialFreeAiGenerationCredits)}
                helper="Free AI generations"
                tone="purple"
              />

              <TopMetricCard
                icon="inventory_2"
                label="Draft Limit"
                value={formatNumber(form.maxDraftJobsPerClient)}
                helper="Draft jobs per client"
                tone="yellow"
              />

              <TopMetricCard
                icon="recommend"
                label="Recommendations"
                value={formatNumber(form.maxRecommendationResults)}
                helper="AI results per request"
                tone="green"
              />
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
              >
                <div className="mb-6 border-b border-white/10 pb-5">
                  <h2 className="text-xl font-bold text-white">
                    AI policy configuration
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    All numeric fields must be whole numbers greater than or
                    equal to 0. An update reason is required for audit tracking.
                  </p>
                </div>

                <PolicySection
                  icon="redeem"
                  title="Initial Credits"
                  description="Credits automatically granted to new clients."
                  fields={CREDIT_FIELDS}
                  form={form}
                  fieldErrors={fieldErrors}
                  onChange={handleChange}
                />

                <PolicySection
                  icon="tune"
                  title="Job Posting Limits"
                  description="Limits for draft jobs, job skills, suggested skills, and recommendation results."
                  fields={LIMIT_FIELDS}
                  form={form}
                  fieldErrors={fieldErrors}
                  onChange={handleChange}
                />

                <PolicySection
                  icon="analytics"
                  title="AI Quality Thresholds"
                  description="Minimum scores required before AI suggestions or recommendations are accepted."
                  fields={SCORE_FIELDS}
                  form={form}
                  fieldErrors={fieldErrors}
                  onChange={handleChange}
                />

                <TextArea
                  label="Update Reason"
                  required
                  value={form.reason}
                  error={fieldErrors.reason}
                  onChange={(value) => handleChange("reason", value)}
                  placeholder="Example: Increase AI recommendation quality threshold for better matching."
                />

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reset Changes
                  </button>

                  <button
                    type="submit"
                    disabled={saving || !hasChanged}
                    className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Policy"}
                  </button>
                </div>
              </form>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                  <h2 className="mb-5 text-xl font-bold text-white">
                    Current Summary
                  </h2>

                  <div className="space-y-4">
                    <SummaryCard
                      icon="work"
                      label="Free Job Credits"
                      value={form.initialFreeJobPostCredits}
                      description="Initial job post credits"
                      tone="cyan"
                    />

                    <SummaryCard
                      icon="smart_toy"
                      label="Free AI Credits"
                      value={form.initialFreeAiGenerationCredits}
                      description="Initial AI generation credits"
                      tone="purple"
                    />

                    <SummaryCard
                      icon="psychology"
                      label="Max Skills"
                      value={form.maxSkillsPerJob}
                      description="Skills allowed per job"
                      tone="yellow"
                    />

                    <SummaryCard
                      icon="verified"
                      label="Match Score"
                      value={form.minimumRecommendationMatchScore}
                      description="Minimum recommendation score"
                      tone="green"
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                  <h2 className="mb-5 text-xl font-bold text-white">
                    Policy Metadata
                  </h2>

                  <div className="space-y-4">
                    <InfoBox label="Policy ID" value={getPolicyId(policy)} />
                    <InfoBox
                      label="Created At"
                      value={formatDateTime(policy?.createdAt)}
                    />
                    <InfoBox
                      label="Updated At"
                      value={formatDateTime(policy?.updatedAt)}
                    />
                    <InfoBox
                      label="Updated By"
                      value={
                        policy?.updatedByAdminEmail ||
                        policy?.updatedByAdminFullName ||
                        policy?.raw?.UpdatedByAdminEmail ||
                        policy?.raw?.UpdatedByAdminFullName ||
                        "N/A"
                      }
                    />
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function PolicySection({
  icon,
  title,
  description,
  fields,
  form,
  fieldErrors,
  onChange,
}) {
  return (
    <section className="mb-8">
      <SectionHeader icon={icon} title={title} description={description} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {fields.map((field) => (
          <NumberInput
            key={field.name}
            label={field.label}
            value={form[field.name]}
            onChange={(value) => onChange(field.name, value)}
            helper={field.helper}
            required
            error={fieldErrors[field.name]}
          />
        ))}
      </div>
    </section>
  );
}

function SectionHeader({ icon, title, description }) {
  return (
    <div className="mb-5 flex gap-3 border-b border-white/10 pb-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <div>
        <h3 className="font-bold text-white">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  helper,
  required = false,
  error = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-12 w-full rounded-xl border bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-gray-600 ${
          error
            ? "border-red-400/70 focus:border-red-400"
            : "border-white/10 focus:border-cyan-400/50"
        }`}
      />

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>
      ) : (
        helper && <p className="mt-2 text-xs leading-5 text-gray-500">{helper}</p>
      )}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={placeholder}
        className={`w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 ${
          error
            ? "border-red-400/70 focus:border-red-400"
            : "border-white/10 focus:border-cyan-400/50"
        }`}
      />

      {error && <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>}
    </div>
  );
}

function TopMetricCard({ icon, label, value, helper, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
  };

  return (
    <div className="flex min-h-[165px] flex-col rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black tracking-tight text-white">
        {value}
      </p>

      <p className="mt-auto pt-3 text-sm text-gray-400">{helper}</p>
    </div>
  );
}

function SummaryCard({ icon, label, value, description, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
            toneClass[tone] || toneClass.cyan
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>

      <p className="text-3xl font-black text-white">{formatNumber(value)}</p>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function Alert({ type, title, message, onClose }) {
  const className =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-200"
      : "border-red-500/30 bg-red-500/10 text-red-200";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm opacity-90">{message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold opacity-70 hover:opacity-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function toFormState(policy) {
  if (!policy) return EMPTY_FORM;

  return {
    initialFreeJobPostCredits: policy.initialFreeJobPostCredits ?? 0,
    initialFreeAiGenerationCredits: policy.initialFreeAiGenerationCredits ?? 0,
    maxDraftJobsPerClient: policy.maxDraftJobsPerClient ?? 0,
    maxSkillsPerJob: policy.maxSkillsPerJob ?? 0,
    maxSuggestedSkills: policy.maxSuggestedSkills ?? 0,
    minimumSkillRelevanceScore: policy.minimumSkillRelevanceScore ?? 0,
    maxRecommendationResults: policy.maxRecommendationResults ?? 0,
    minimumRecommendationMatchScore:
      policy.minimumRecommendationMatchScore ?? 0,
    reason: "",
  };
}

function buildPayload(form) {
  return {
    initialFreeJobPostCredits: Number(form.initialFreeJobPostCredits),
    initialFreeAiGenerationCredits: Number(form.initialFreeAiGenerationCredits),
    maxDraftJobsPerClient: Number(form.maxDraftJobsPerClient),
    maxSkillsPerJob: Number(form.maxSkillsPerJob),
    maxSuggestedSkills: Number(form.maxSuggestedSkills),
    minimumSkillRelevanceScore: Number(form.minimumSkillRelevanceScore),
    maxRecommendationResults: Number(form.maxRecommendationResults),
    minimumRecommendationMatchScore: Number(
      form.minimumRecommendationMatchScore
    ),
    reason: String(form.reason || "").trim(),
  };
}

function validateForm(form) {
  const errors = {};
  const fields = Object.keys(EMPTY_FORM).filter((field) => field !== "reason");

  fields.forEach((field) => {
    const rawValue = String(form[field] ?? "").trim();

    if (!rawValue) {
      errors[field] = `${formatLabel(field)} is required.`;
      return;
    }

    if (!/^\d+$/.test(rawValue)) {
      errors[field] = `${formatLabel(field)} must be a whole number.`;
      return;
    }

    if (Number(rawValue) < 0) {
      errors[field] = `${formatLabel(field)} must be greater than or equal to 0.`;
    }
  });

  const reason = String(form.reason || "").trim();

  if (!reason) {
    errors.reason = "Update Reason is required.";
  } else if (reason.length < 10) {
    errors.reason = "Update Reason must be at least 10 characters.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function getPolicyId(policy) {
  return (
    policy?.policyId ||
    policy?.jobPostingAiPolicyId ||
    policy?.raw?.jobPostingAiPolicyId ||
    policy?.raw?.JobPostingAiPolicyId ||
    "N/A"
  );
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US").format(
    Number.isNaN(number) ? 0 : number
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

function formatLabel(value) {
  if (!value) return "N/A";

  return String(value)
    .replace(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFriendlyError(err, fallback = "Something went wrong.") {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request because the current token does not have ADMIN permission.";
  }

  if (status === 404) {
    return "Job posting AI policy API was not found. Please check backend route.";
  }

  const data = err?.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.title) return data.title;
  if (data?.detail) return data.detail;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || fallback;
}