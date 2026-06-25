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
    label: "Initial Free Job Post Credits",
    helper: "Free job posting credits given to a new client.",
  },
  {
    name: "initialFreeAiGenerationCredits",
    label: "Initial Free AI Generation Credits",
    helper: "Free AI generation credits given to a new client.",
  },
];

const LIMIT_FIELDS = [
  {
    name: "maxDraftJobsPerClient",
    label: "Max Draft Jobs Per Client",
    helper: "Maximum draft jobs a client can keep.",
  },
  {
    name: "maxSkillsPerJob",
    label: "Max Skills Per Job",
    helper: "Maximum skills that can be attached to one job.",
  },
  {
    name: "maxSuggestedSkills",
    label: "Max Suggested Skills",
    helper: "Maximum AI suggested skills returned to client.",
  },
  {
    name: "maxRecommendationResults",
    label: "Max Recommendation Results",
    helper: "Maximum recommended jobs or experts returned by AI.",
  },
];

const SCORE_FIELDS = [
  {
    name: "minimumSkillRelevanceScore",
    label: "Minimum Skill Relevance Score",
    helper: "Minimum AI relevance score required for suggested skills.",
  },
  {
    name: "minimumRecommendationMatchScore",
    label: "Minimum Recommendation Match Score",
    helper: "Minimum match score required for AI recommendations.",
  },
];

export default function AdminJobPostingAiPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReset = () => {
    setForm(toFormState(policy));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

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
              Configure free credits, draft limits, skill suggestion limits, and
              AI recommendation score thresholds for job posting flow.
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
            title="Action failed"
            message={error}
            onClose={() => setError("")}
          />
        )}

        {success && (
          <Alert
            type="success"
            title="Success"
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
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">
                  Update AI policy
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  All numeric values must be greater than or equal to 0. The
                  reason field is required when saving.
                </p>
              </div>

              <PolicySection
                title="Initial Credits"
                description="Free credits for new clients."
                fields={CREDIT_FIELDS}
                form={form}
                onChange={handleChange}
              />

              <PolicySection
                title="Job Posting Limits"
                description="Limits applied to draft jobs, skills, and recommendations."
                fields={LIMIT_FIELDS}
                form={form}
                onChange={handleChange}
              />

              <PolicySection
                title="AI Score Thresholds"
                description="Minimum score required for AI suggestions and recommendations."
                fields={SCORE_FIELDS}
                form={form}
                onChange={handleChange}
                step="0.0001"
              />

              <TextArea
                label="Update Reason"
                value={form.reason}
                onChange={(value) => handleChange("reason", value)}
                placeholder="Example: Adjust AI limits for new job posting workflow."
              />

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset
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
                  Current summary
                </h2>

                <div className="space-y-4">
                  <SummaryCard
                    icon="work"
                    label="Free Job Credits"
                    value={policy?.initialFreeJobPostCredits}
                    description="Initial job post credits"
                    tone="cyan"
                  />

                  <SummaryCard
                    icon="smart_toy"
                    label="Free AI Credits"
                    value={policy?.initialFreeAiGenerationCredits}
                    description="Initial AI generation credits"
                    tone="purple"
                  />

                  <SummaryCard
                    icon="inventory_2"
                    label="Max Draft Jobs"
                    value={policy?.maxDraftJobsPerClient}
                    description="Draft jobs per client"
                    tone="yellow"
                  />

                  <SummaryCard
                    icon="recommend"
                    label="Max Recommendations"
                    value={policy?.maxRecommendationResults}
                    description="AI result limit"
                    tone="green"
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                <h2 className="mb-5 text-xl font-bold text-white">
                  Metadata
                </h2>

                <div className="space-y-4">
                  <InfoBox label="Policy ID" value={policy?.policyId || "N/A"} />
                  <InfoBox
                    label="Created At"
                    value={formatDateTime(policy?.createdAt)}
                  />
                  <InfoBox
                    label="Updated At"
                    value={formatDateTime(policy?.updatedAt)}
                  />
                  <InfoBox label="Last Reason" value={policy?.reason || "N/A"} />
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function PolicySection({
  title,
  description,
  fields,
  form,
  onChange,
  step = "1",
}) {
  return (
    <section className="mb-8">
      <div className="mb-4 border-b border-white/10 pb-3">
        <h3 className="font-bold text-white">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {fields.map((field) => (
          <NumberInput
            key={field.name}
            label={field.label}
            value={form[field.name]}
            onChange={(value) => onChange(field.name, value)}
            helper={field.helper}
            step={step}
          />
        ))}
      </div>
    </section>
  );
}

function NumberInput({ label, value, onChange, helper, step = "1" }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </label>

      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-cyan-400/50"
      />

      {helper && <p className="mt-2 text-xs leading-5 text-gray-500">{helper}</p>}
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 focus:border-cyan-400/50"
      />
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

        <div>
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
  const fields = Object.keys(EMPTY_FORM).filter((field) => field !== "reason");

  for (const field of fields) {
    const value = Number(form[field]);

    if (Number.isNaN(value) || value < 0) {
      return `${formatLabel(field)} must be a valid number greater than or equal to 0.`;
    }
  }

  if (!String(form.reason || "").trim()) {
    return "Please enter update reason.";
  }

  if (String(form.reason || "").trim().length < 10) {
    return "Update reason must be at least 10 characters.";
  }

  return "";
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US").format(
    Number.isNaN(number) ? 0 : number
  );
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