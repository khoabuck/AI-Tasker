import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminPolicyService from "../../../services/adminPolicy.service";

import { formatDateTime } from "../../../utils/dateTime.utils";
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
    label: "Profile Completeness",
    helper: "Score for having a complete and well-filled profile.",
  },
  {
    name: "aiSkillMaxScore",
    label: "AI Skill Evaluation",
    helper: "Score from AI skill matching and profile analysis.",
  },
  {
    name: "experienceMaxScore",
    label: "Experience",
    helper: "Score for years of experience and relevant background.",
  },
  {
    name: "portfolioMaxScore",
    label: "Portfolio",
    helper: "Score for portfolio quality and proof of work.",
  },
  {
    name: "gitHubMaxScore",
    label: "GitHub Profile",
    helper: "Score for GitHub activity, projects, and technical proof.",
  },
  {
    name: "linkedInMaxScore",
    label: "LinkedIn Profile",
    helper: "Score for professional profile and work history.",
  },
  {
    name: "certificateMaxScore",
    label: "Certificates",
    helper: "Score for uploaded certificates and credentials.",
  },
  {
    name: "riskMaxPenalty",
    label: "Trust Score",
    helper: "Score for profile trustworthiness, authenticity, and credibility.",
  },
];

const RULE_FIELDS = [
  {
    name: "passThreshold",
    label: "Pass Threshold",
    helper: "Minimum total score required for an expert profile to pass review.",
  },
  {
    name: "maxReviewSubmissions",
    label: "Max Review Attempts",
    helper: "Maximum number of times an expert can resubmit for review.",
  },
  {
    name: "reviewLockDurationHours",
    label: "Review Lock Duration",
    helper: "How long the expert is locked after exceeding review attempts.",
    suffix: "hours",
  },
  {
    name: "certificateUnverifiedMaxProfileScore",
    label: "Unverified Certificate Limit",
    helper: "Maximum profile score allowed when certificates are not verified.",
  },
  {
    name: "bioMinimumLength",
    label: "Minimum Bio Length",
    helper: "Minimum number of characters required in the expert bio.",
    suffix: "chars",
  },
  {
    name: "skillsMinimumLength",
    label: "Minimum Skills",
    helper: "Minimum number of skills required in the expert profile.",
    suffix: "skills",
  },
  {
    name: "maxCertificates",
    label: "Max Certificates",
    helper: "Maximum number of certificates the expert can submit.",
  },
];

export default function AdminExpertScoringPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

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
    if (!success) return;

    const timeoutId = window.setTimeout(() => {
      setSuccess("");
    }, 3400);

    return () => window.clearTimeout(timeoutId);
  }, [success]);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setFieldErrors({});

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

  const handleSubmit = (event) => {
    event.preventDefault();

    const validation = validateForm(form);

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError("Please fix the highlighted fields before saving.");
      return;
    }

    setError("");
    setFieldErrors({});
    setShowSaveConfirm(true);
  };

  const executeSave = async () => {

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
              Configure how expert profiles are reviewed, scored, and approved.
              This policy affects expert onboarding and resubmission rules.
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

        {success && <SuccessToast message={success} onClose={() => setSuccess("")} />}

        {loading ? (
          <PageSkeleton cards={4} />
        ) : (
          <>
            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TopMetricCard
                icon="workspace_premium"
                label="Pass Threshold"
                value={formatNumber(form.passThreshold)}
                helper="Required score to pass"
                tone="cyan"
              />

              <TopMetricCard
                icon="score"
                label="Total Max Score"
                value={formatNumber(totalMaxScore)}
                helper="Sum of all score weights"
                tone="purple"
              />

              <TopMetricCard
                icon="replay"
                label="Review Attempts"
                value={formatNumber(form.maxReviewSubmissions)}
                helper="Maximum resubmissions"
                tone="green"
              />

              <TopMetricCard
                icon="lock_clock"
                label="Lock Duration"
                value={`${formatNumber(form.reviewLockDurationHours)}h`}
                helper="After reaching limit"
                tone="yellow"
              />
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
              >
                <div className="mb-6 border-b border-white/10 pb-5">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Scoring configuration
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      Update score weights and review rules. All numeric fields
                      must be valid numbers greater than or equal to 0.
                    </p>
                  </div>


                </div>

                <section className="mb-8">
                  <SectionHeader
                    icon="tune"
                    title="Review Rules"
                    description="Controls how many times an expert can submit and what minimum requirements are checked."
                  />

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {RULE_FIELDS.map((field) => (
                      <NumberInput
                        key={field.name}
                        label={field.label}
                        value={form[field.name]}
                        onChange={(value) => handleChange(field.name, value)}
                        helper={field.helper}
                        suffix={field.suffix}
                        required
                        error={fieldErrors[field.name]}
                      />
                    ))}
                  </div>
                </section>

                <section className="mb-8">
                  <SectionHeader
                    icon="analytics"
                    title="Score Weights"
                    description="Each item contributes to the expert's final review score. Trust Score is counted as a positive credibility score."
                    rightContent={
                      <div className="flex min-w-[160px] flex-col items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-4">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                          Total Score
                        </p>

                        <p className="mt-2 text-3xl font-black tracking-tight text-white">
                          {formatNumber(totalMaxScore)}
                        </p>
                      </div>
                    }
                  />

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {SCORE_FIELDS.map((field) => (
                      <NumberInput
                        key={field.name}
                        label={field.label}
                        value={form[field.name]}
                        onChange={(value) => handleChange(field.name, value)}
                        helper={field.helper}
                        required
                        error={fieldErrors[field.name]}
                      />
                    ))}
                  </div>
                </section>

                <TextArea
                  label="Update Reason"
                  required
                  value={form.reason}
                  error={fieldErrors.reason}
                  onChange={(value) => handleChange("reason", value)}
                  placeholder="Example: Adjust scoring weights to improve expert verification quality."
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
                    Score Breakdown
                  </h2>

                  <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Last Updated
                    </p>
                    <p className="mt-2 text-sm font-bold text-white">
                      {formatDateTime(policy?.updatedAt || policy?.createdAt, "N/A")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {SCORE_FIELDS.map((field) => (
                      <ScoreBreakdownItem
                        key={field.name}
                        label={field.label}
                        value={Number(form[field.name] || 0)}
                        total={totalMaxScore}
                      />
                    ))}
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
        {showSaveConfirm && (
          <ConfirmActionModal
            title="Save policy changes?"
            message={`This update changes expert profile review rules. Pass threshold: ${form.passThreshold} · Total maximum score: ${totalMaxScore} · Review attempts: ${form.maxReviewSubmissions} · Lock duration: ${form.reviewLockDurationHours} hours. Reason: ${form.reason.trim()}.`}
            confirmLabel="Confirm Save"
            loading={saving}
            onCancel={() => !saving && setShowSaveConfirm(false)}
            onConfirm={() => {
              setShowSaveConfirm(false);
              executeSave();
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}


function PageSkeleton({ cards = 4 }) {
  return (
    <div className="animate-pulse">
      <div className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6">
        <div className="h-4 w-36 rounded bg-cyan-400/10" />
        <div className="mt-4 h-9 w-2/3 rounded bg-white/10" />
        <div className="mt-3 h-4 w-1/2 rounded bg-white/[0.06]" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="h-32 rounded-2xl border border-white/10 bg-[#151a22]"
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="h-[520px] rounded-2xl border border-white/10 bg-[#151a22]" />
        <div className="h-[360px] rounded-2xl border border-white/10 bg-[#151a22]" />
      </div>
    </div>
  );
}



function SuccessToast({ message, onClose }) {
  return (
    <div className="fixed right-4 top-4 z-[1400] w-[min(92vw,390px)]">
      <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-[#111a16] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-green-400/30 bg-green-400/10 text-green-300">
          <span className="material-symbols-outlined">check_circle</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Action completed</p>
          <p className="mt-1 text-sm leading-5 text-green-100/75">{message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 transition hover:text-white"
          aria-label="Close notification"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
}



function ConfirmActionModal({
  title,
  message,
  confirmLabel,
  loading,
  tone = "cyan",
  onCancel,
  onConfirm,
}) {
  const confirmClass =
    tone === "red"
      ? "border-red-400/50 bg-red-400/10 text-red-300 hover:bg-red-400 hover:text-black"
      : tone === "green"
        ? "border-green-400/50 bg-green-400/10 text-green-300 hover:bg-green-400 hover:text-black"
        : "border-cyan-400/50 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-black";

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151a22] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300">
          <span className="material-symbols-outlined">
            {tone === "red" ? "warning" : "policy"}
          </span>
        </div>

        <h2 className="text-xl font-black text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
          >
            Review Again
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`rounded-xl border px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


function SectionHeader({ icon, title, description, rightContent }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <span className="material-symbols-outlined">{icon}</span>
        </div>

        <div>
          <h3 className="font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
        </div>
      </div>

      {rightContent}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  helper,
  suffix,
  required = false,
  error = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <div
        className={`flex h-12 overflow-hidden rounded-xl border bg-white/[0.04] ${error
          ? "border-red-400/70 focus-within:border-red-400"
          : "border-white/10 focus-within:border-cyan-400/50"
          }`}
      >
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-gray-600"
        />

        {suffix && (
          <span className="flex items-center border-l border-white/10 px-3 text-xs font-bold uppercase text-gray-500">
            {suffix}
          </span>
        )}
      </div>

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
        className={`w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 ${error
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
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${toneClass[tone] || toneClass.cyan
          }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="min-h-[38px] text-sm font-bold uppercase tracking-wide text-gray-300 leading-5">
        {label}
      </p>

      <p className="mt-3 text-4xl font-black tracking-tight text-white">
        {value}
      </p>

      <p className="mt-3 text-xs text-gray-500">
        {helper}
      </p>
    </div>
  );
}

function ScoreBreakdownItem({ label, value, total }) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-sm font-black text-cyan-300">{formatNumber(value)}</p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-cyan-400"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">{percent}% of total max score</p>
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
  const errors = {};
  const numberFields = Object.keys(EMPTY_FORM).filter(
    (field) => field !== "reason"
  );

  numberFields.forEach((field) => {
    const rawValue = String(form[field] ?? "").trim();

    if (!rawValue) {
      errors[field] = `${formatLabel(field)} is required.`;
      return;
    }

    if (!/^\d+(\.\d+)?$/.test(rawValue)) {
      errors[field] = `${formatLabel(field)} must be a valid number.`;
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

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN").format(
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
};


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