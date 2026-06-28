import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminPolicyService from "../../../services/adminPolicy.service";

const EMPTY_FORM = {
  passThreshold: 0,
  maxReviewSubmissions: 0,
  reviewLockDurationHours: 0,
  profileCompletenessMaxScore: 0,
  aiSkillMaxScore: 0,
  experienceMaxScore: 0,
  portfolioMaxScore: 0,
  gitHubMaxScore: 0,
  linkedInMaxScore: 0,
  certificateMaxScore: 0,
  riskMaxPenalty: 0,
  certificateUnverifiedMaxProfileScore: 0,
  bioMinimumLength: 0,
  skillsMinimumLength: 0,
  maxCertificates: 0,
  reason: "",
};

const SCORE_FIELDS = [
  {
    name: "profileCompletenessMaxScore",
    label: "Profile Completeness Max Score",
    helper: "Maximum score for profile completeness.",
  },
  {
    name: "aiSkillMaxScore",
    label: "AI Skill Max Score",
    helper: "Maximum score from AI skill evaluation.",
  },
  {
    name: "experienceMaxScore",
    label: "Experience Max Score",
    helper: "Maximum score for expert experience.",
  },
  {
    name: "portfolioMaxScore",
    label: "Portfolio Max Score",
    helper: "Maximum score for portfolio quality.",
  },
  {
    name: "gitHubMaxScore",
    label: "GitHub Max Score",
    helper: "Maximum score for GitHub profile.",
  },
  {
    name: "linkedInMaxScore",
    label: "LinkedIn Max Score",
    helper: "Maximum score for LinkedIn profile.",
  },
  {
    name: "certificateMaxScore",
    label: "Certificate Max Score",
    helper: "Maximum score for certificates.",
  },
];

const RULE_FIELDS = [
  {
    name: "passThreshold",
    label: "Pass Threshold",
    helper: "Minimum score required to pass expert profile review.",
  },
  {
    name: "maxReviewSubmissions",
    label: "Max Review Submissions",
    helper: "Maximum number of review submissions allowed.",
  },
  {
    name: "reviewLockDurationHours",
    label: "Review Lock Duration Hours",
    helper: "Lock duration after exceeding review submission limits.",
  },
  {
    name: "riskMaxPenalty",
    label: "Risk Max Penalty",
    helper: "Maximum penalty deducted for risky profile signals.",
  },
  {
    name: "certificateUnverifiedMaxProfileScore",
    label: "Certificate Unverified Max Profile Score",
    helper: "Maximum profile score if certificates are not verified.",
  },
  {
    name: "bioMinimumLength",
    label: "Bio Minimum Length",
    helper: "Minimum bio length required for profile completeness.",
  },
  {
    name: "skillsMinimumLength",
    label: "Skills Minimum Length",
    helper: "Minimum number of skills required.",
  },
  {
    name: "maxCertificates",
    label: "Max Certificates",
    helper: "Maximum number of certificates allowed.",
  },
];

export default function AdminExpertScoringPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalMaxScore = useMemo(() => {
    return SCORE_FIELDS.reduce((sum, field) => {
      return sum + Number(form[field.name] || 0);
    }, 0);
  }, [form]);

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

      const data = await adminPolicyService.getExpertProfileScoringPolicy();

      setPolicy(data);
      setForm(toFormState(data));
    } catch (err) {
      console.error(
        "LOAD EXPERT SCORING POLICY ERROR:",
        err?.response?.data || err
      );
      setError(getFriendlyError(err, "Cannot load expert scoring policy."));
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

      const updated = await adminPolicyService.updateExpertProfileScoringPolicy(
        buildPayload(form)
      );

      setPolicy(updated);
      setForm(toFormState(updated));
      setSuccess("Expert scoring policy has been updated successfully.");
    } catch (err) {
      console.error(
        "UPDATE EXPERT SCORING POLICY ERROR:",
        err?.response?.data || err
      );
      setError(getFriendlyError(err, "Cannot update expert scoring policy."));
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
              Expert scoring policy
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Configure profile scoring rules used to review expert profiles.
              Each update requires an admin reason.
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
            Loading expert scoring policy...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">
                  Update scoring rules
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Keep all numeric values greater than or equal to 0. The reason
                  field is required when saving.
                </p>
              </div>

              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="font-bold text-white">Review Rules</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Threshold, retry limits, lock duration, and validation
                      requirements.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {RULE_FIELDS.map((field) => (
                    <NumberInput
                      key={field.name}
                      label={field.label}
                      value={form[field.name]}
                      onChange={(value) => handleChange(field.name, value)}
                      helper={field.helper}
                    />
                  ))}
                </div>
              </section>

              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="font-bold text-white">Score Weights</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Maximum score allocated to each profile evaluation area.
                    </p>
                  </div>

                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-right">
                    <p className="text-[11px] uppercase tracking-wider text-cyan-300">
                      Total Max Score
                    </p>
                    <p className="text-lg font-black text-white">
                      {formatNumber(totalMaxScore)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {SCORE_FIELDS.map((field) => (
                    <NumberInput
                      key={field.name}
                      label={field.label}
                      value={form[field.name]}
                      onChange={(value) => handleChange(field.name, value)}
                      helper={field.helper}
                    />
                  ))}
                </div>
              </section>

              <TextArea
                label="Update Reason"
                value={form.reason}
                onChange={(value) => handleChange("reason", value)}
                placeholder="Example: Adjust scoring rules for the new expert verification process."
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
                    icon="workspace_premium"
                    label="Pass Threshold"
                    value={policy?.passThreshold}
                    description="Minimum score required"
                    tone="cyan"
                  />

                  <SummaryCard
                    icon="score"
                    label="Total Max Score"
                    value={totalMaxScore}
                    description="Sum of score weights"
                    tone="purple"
                  />

                  <SummaryCard
                    icon="lock_clock"
                    label="Review Lock Hours"
                    value={policy?.reviewLockDurationHours}
                    description="Lock duration after review limit"
                    tone="yellow"
                  />

                  <SummaryCard
                    icon="replay"
                    label="Max Submissions"
                    value={policy?.maxReviewSubmissions}
                    description="Allowed review attempts"
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

function NumberInput({ label, value, onChange, helper }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </label>

      <input
        type="number"
        min="0"
        step="1"
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
    passThreshold: policy.passThreshold ?? 0,
    maxReviewSubmissions: policy.maxReviewSubmissions ?? 0,
    reviewLockDurationHours: policy.reviewLockDurationHours ?? 0,
    profileCompletenessMaxScore: policy.profileCompletenessMaxScore ?? 0,
    aiSkillMaxScore: policy.aiSkillMaxScore ?? 0,
    experienceMaxScore: policy.experienceMaxScore ?? 0,
    portfolioMaxScore: policy.portfolioMaxScore ?? 0,
    gitHubMaxScore: policy.gitHubMaxScore ?? 0,
    linkedInMaxScore: policy.linkedInMaxScore ?? 0,
    certificateMaxScore: policy.certificateMaxScore ?? 0,
    riskMaxPenalty: policy.riskMaxPenalty ?? 0,
    certificateUnverifiedMaxProfileScore:
      policy.certificateUnverifiedMaxProfileScore ?? 0,
    bioMinimumLength: policy.bioMinimumLength ?? 0,
    skillsMinimumLength: policy.skillsMinimumLength ?? 0,
    maxCertificates: policy.maxCertificates ?? 0,
    reason: "",
  };
}

function buildPayload(form) {
  return {
    passThreshold: Number(form.passThreshold),
    maxReviewSubmissions: Number(form.maxReviewSubmissions),
    reviewLockDurationHours: Number(form.reviewLockDurationHours),
    profileCompletenessMaxScore: Number(form.profileCompletenessMaxScore),
    aiSkillMaxScore: Number(form.aiSkillMaxScore),
    experienceMaxScore: Number(form.experienceMaxScore),
    portfolioMaxScore: Number(form.portfolioMaxScore),
    gitHubMaxScore: Number(form.gitHubMaxScore),
    linkedInMaxScore: Number(form.linkedInMaxScore),
    certificateMaxScore: Number(form.certificateMaxScore),
    riskMaxPenalty: Number(form.riskMaxPenalty),
    certificateUnverifiedMaxProfileScore: Number(
      form.certificateUnverifiedMaxProfileScore
    ),
    bioMinimumLength: Number(form.bioMinimumLength),
    skillsMinimumLength: Number(form.skillsMinimumLength),
    maxCertificates: Number(form.maxCertificates),
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
    return "Expert scoring policy API was not found. Please check backend route.";
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