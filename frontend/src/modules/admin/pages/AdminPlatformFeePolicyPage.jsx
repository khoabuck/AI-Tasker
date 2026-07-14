import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminPolicyService from "../../../services/adminPolicy.service";

import { formatDateTime } from "../../../utils/dateTime.utils";
const EMPTY_FORM = {
  individualClientFeeRate: 0,
  businessClientFeeRate: 0,
  expertFeeRate: 0,
  reason: "",
};

export default function AdminPlatformFeePolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const hasChanged = useMemo(() => {
    if (!policy) return true;

    return (
      Number(form.individualClientFeeRate) !==
        Number(policy.individualClientFeeRate || 0) ||
      Number(form.businessClientFeeRate) !==
        Number(policy.businessClientFeeRate || 0) ||
      Number(form.expertFeeRate) !== Number(policy.expertFeeRate || 0) ||
      String(form.reason || "").trim() !== ""
    );
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

      const data = await adminPolicyService.getPlatformFeePolicy();

      setPolicy(data);

      setForm({
        individualClientFeeRate: data?.individualClientFeeRate ?? 0,
        businessClientFeeRate: data?.businessClientFeeRate ?? 0,
        expertFeeRate: data?.expertFeeRate ?? 0,
        reason: "",
      });
    } catch (err) {
      console.error("LOAD PLATFORM FEE POLICY ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load platform fee policy."));
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
    if (!policy) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      individualClientFeeRate: policy.individualClientFeeRate ?? 0,
      businessClientFeeRate: policy.businessClientFeeRate ?? 0,
      expertFeeRate: policy.expertFeeRate ?? 0,
      reason: "",
    });

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

      const updated = await adminPolicyService.updatePlatformFeePolicy({
        individualClientFeeRate: Number(form.individualClientFeeRate),
        businessClientFeeRate: Number(form.businessClientFeeRate),
        expertFeeRate: Number(form.expertFeeRate),
        reason: form.reason,
      });

      setPolicy(updated);

      setForm({
        individualClientFeeRate: updated?.individualClientFeeRate ?? 0,
        businessClientFeeRate: updated?.businessClientFeeRate ?? 0,
        expertFeeRate: updated?.expertFeeRate ?? 0,
        reason: "",
      });

      setSuccess("Platform fees has been updated successfully.");
    } catch (err) {
      console.error("UPDATE PLATFORM FEE POLICY ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot update platform fee policy."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#00F0FF]">
              Fees
            </p>

            <h1 className="text-3xl font-bold text-white md:text-3xl">
              Platform fees
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Manage fee rates for clients and experts.
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

        {success && <SuccessToast message={success} onClose={() => setSuccess("")} />}

        {loading ? (
          <PageSkeleton cards={4} />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_14px_42px_rgba(0,0,0,0.24)]"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">
                  Fee configuration
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Enter fee rates clearly. Use 0.1 for 10% when the system uses decimal rates.
                </p>
              </div>

              <div className="space-y-5">
                <NumberInput
                  label="Individual client fee"
                  value={form.individualClientFeeRate}
                  required
                  error={fieldErrors.individualClientFeeRate}
                  onChange={(value) =>
                    handleChange("individualClientFeeRate", value)
                  }
                  helper="Fee rate applied to individual client payments."
                />

                <NumberInput
                  label="Business client fee"
                  value={form.businessClientFeeRate}
                  required
                  error={fieldErrors.businessClientFeeRate}
                  onChange={(value) =>
                    handleChange("businessClientFeeRate", value)
                  }
                  helper="Fee rate applied to business client payments."
                />

                <NumberInput
                  label="Expert fee"
                  value={form.expertFeeRate}
                  required
                  error={fieldErrors.expertFeeRate}
                  onChange={(value) => handleChange("expertFeeRate", value)}
                  helper="Fee rate deducted from expert payout."
                />

                <TextArea
                  label="Update Reason"
                  value={form.reason}
                  required
                  error={fieldErrors.reason}
                  onChange={(value) => handleChange("reason", value)}
                  placeholder="Example: Adjust fee policy based on platform operating cost."
                />
              </div>

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
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
                <h2 className="mb-5 text-xl font-bold text-white">
                  Current fees
                </h2>

                <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Last Updated
                  </p>
                  <p className="mt-2 text-sm font-bold text-white">
                    {formatDateTime(policy?.updatedAt || policy?.createdAt, "N/A")}
                  </p>
                </div>

                <div className="space-y-4">
                  <PolicyValue
                    icon="person"
                    label="Individual Client Fee"
                    value={policy?.individualClientFeeRate}
                    tone="cyan"
                  />

                  <PolicyValue
                    icon="business"
                    label="Business Client Fee"
                    value={policy?.businessClientFeeRate}
                    tone="purple"
                  />

                  <PolicyValue
                    icon="engineering"
                    label="Expert Fee"
                    value={policy?.expertFeeRate}
                    tone="yellow"
                  />
                </div>
              </section>
            </aside>
          </div>
        )}
        {showSaveConfirm && (
          <ConfirmActionModal
            title="Save fee changes?"
            message={`This update changes fees applied to future platform transactions. Individual client fee: ${form.individualClientFeeRate} · Business client fee: ${form.businessClientFeeRate} · Expert fee: ${form.expertFeeRate}. Reason: ${form.reason.trim()}.`}
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
      <div className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-6">
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
      <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-[#111a16] p-4 shadow-[0_18px_56px_rgba(0,0,0,0.45)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-green-400/30 bg-green-400/10 text-green-300">
          <span className="material-symbols-outlined">check_circle</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Updated</p>
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
            Back
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
        inputMode="decimal"
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

      {error && (
        <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>
      )}
    </div>
  );
}

function PolicyValue({ icon, label, value, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
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

        <p className="text-sm font-bold text-white">{label}</p>
      </div>

      <p className="text-3xl font-black text-white">{formatRate(value)}</p>
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

function validateForm(form) {
  const errors = {};

  ["individualClientFeeRate", "businessClientFeeRate", "expertFeeRate"].forEach(
    (field) => {
      const value = String(form[field] ?? "").trim();

      if (!value) {
        errors[field] = `${formatLabel(field)} is required.`;
        return;
      }

      if (!/^\d+(\.\d+)?$/.test(value)) {
        errors[field] = `${formatLabel(field)} must be a valid number.`;
        return;
      }

      if (Number(value) < 0) {
        errors[field] = `${formatLabel(field)} must be greater than or equal to 0.`;
      }
    }
  );

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

function formatRate(value) {
  const number = Number(value || 0);

  if (Number.isNaN(number)) return "0";

  if (number > 0 && number <= 1) {
    return `${(number * 100).toFixed(2)}%`;
  }

  return `${number}`;
};


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
    return "Platform fees API was not found. Please check backend route.";
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