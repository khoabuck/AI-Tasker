import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminPolicyService from "../../../services/adminPolicy.service";

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

      setSuccess("Platform fee policy has been updated successfully.");
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
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Policy Management
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Platform fee policy
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Configure fee rates for individual clients, business clients, and
              experts. Each update requires an admin reason.
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
            Loading platform fee policy...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">
                  Update fee rates
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Enter rates using the same unit expected by backend. For
                  decimal rate systems, use 0.1 for 10%.
                </p>
              </div>

              <div className="space-y-5">
                <NumberInput
                  label="Individual Client Fee Rate"
                  value={form.individualClientFeeRate}
                  required
                  error={fieldErrors.individualClientFeeRate}
                  onChange={(value) =>
                    handleChange("individualClientFeeRate", value)
                  }
                  helper="Fee rate applied to individual client payments."
                />

                <NumberInput
                  label="Business Client Fee Rate"
                  value={form.businessClientFeeRate}
                  required
                  error={fieldErrors.businessClientFeeRate}
                  onChange={(value) =>
                    handleChange("businessClientFeeRate", value)
                  }
                  helper="Fee rate applied to business client payments."
                />

                <NumberInput
                  label="Expert Fee Rate"
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
                  {saving ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </form>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                <h2 className="mb-5 text-xl font-bold text-white">
                  Current policy
                </h2>

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

      <p className="mt-1 text-xs text-gray-500">Raw value: {value ?? 0}</p>
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
    return "Platform fee policy API was not found. Please check backend route.";
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