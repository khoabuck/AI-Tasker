import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminPolicyService from "../../../services/adminPolicy.service";
import { formatDateTime } from "../../../utils/dateTime.utils";

const EMPTY_FORM = {
  maxFailedLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  isEnabled: true,
  reason: "",
};

export default function AdminLoginSecurityPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const hasChanged = useMemo(() => {
    if (!policy) return true;

    return (
      Number(form.maxFailedLoginAttempts) !==
        Number(policy.maxFailedLoginAttempts || 0) ||
      Number(form.lockoutDurationMinutes) !==
        Number(policy.lockoutDurationMinutes || 0) ||
      Boolean(form.isEnabled) !== Boolean(policy.isEnabled) ||
      String(form.reason || "").trim() !== ""
    );
  }, [form, policy]);

  useEffect(() => {
    loadPolicy();
  }, []);

  useEffect(() => {
    if (!success) return;

    const timeoutId = window.setTimeout(() => {
      setSuccess("");
    }, 3400);

    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setFieldErrors({});

      const data = await adminPolicyService.getLoginSecurityPolicy();

      setPolicy(data);

      setForm({
        maxFailedLoginAttempts: data?.maxFailedLoginAttempts ?? 5,
        lockoutDurationMinutes: data?.lockoutDurationMinutes ?? 15,
        isEnabled: data?.isEnabled ?? true,
        reason: "",
      });
    } catch (err) {
      console.error(
        "LOAD LOGIN SECURITY POLICY ERROR:",
        err?.response?.data || err
      );

      setError(
        getFriendlyError(err, "Cannot load login security policy.")
      );
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
      setFieldErrors({});
      setError("");
      setSuccess("");
      return;
    }

    setForm({
      maxFailedLoginAttempts: policy.maxFailedLoginAttempts ?? 5,
      lockoutDurationMinutes: policy.lockoutDurationMinutes ?? 15,
      isEnabled: policy.isEnabled ?? true,
      reason: "",
    });

    setFieldErrors({});
    setError("");
    setSuccess("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validation = validateForm(form);

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError("Please fix the highlighted fields before saving.");
      return;
    }

    setFieldErrors({});
    setError("");
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

      const updated =
        await adminPolicyService.updateLoginSecurityPolicy({
          maxFailedLoginAttempts: Number(form.maxFailedLoginAttempts),
          lockoutDurationMinutes: Number(form.lockoutDurationMinutes),
          isEnabled: Boolean(form.isEnabled),
          reason: form.reason.trim(),
        });

      setPolicy(updated);

      setForm({
        maxFailedLoginAttempts: updated?.maxFailedLoginAttempts ?? 5,
        lockoutDurationMinutes: updated?.lockoutDurationMinutes ?? 15,
        isEnabled: updated?.isEnabled ?? true,
        reason: "",
      });

      setSuccess(
        "Login security has been updated successfully."
      );
    } catch (err) {
      console.error(
        "UPDATE LOGIN SECURITY POLICY ERROR:",
        err?.response?.data || err
      );

      setError(
        getFriendlyError(err, "Cannot update login security policy.")
      );
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
              Security
            </p>

            <h1 className="text-3xl font-bold text-white md:text-3xl">
              Login security
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Manage failed-login protection and temporary lockout rules.
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
          <SuccessToast
            message={success}
            onClose={() => setSuccess("")}
          />
        )}

        {loading ? (
          <PageSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_14px_42px_rgba(0,0,0,0.24)]"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">
                  Lockout settings
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Set how many failed login attempts are allowed and how long
                  the temporary lock remains active.
                </p>
              </div>

              <div className="space-y-5">
                <ToggleField
                  label="Automatic lockout"
                  description="When enabled, the system temporarily locks an account after repeated failed login attempts."
                  checked={form.isEnabled}
                  onChange={(checked) =>
                    handleChange("isEnabled", checked)
                  }
                />

                <NumberInput
                  label="Failed attempt limit"
                  value={form.maxFailedLoginAttempts}
                  min={1}
                  max={20}
                  required
                  disabled={!form.isEnabled}
                  error={fieldErrors.maxFailedLoginAttempts}
                  helper="Allowed range: 1–20 failed attempts."
                  onChange={(value) =>
                    handleChange("maxFailedLoginAttempts", value)
                  }
                />

                <NumberInput
                  label="Lockout Duration"
                  value={form.lockoutDurationMinutes}
                  min={1}
                  max={1440}
                  suffix="minutes"
                  required
                  disabled={!form.isEnabled}
                  error={fieldErrors.lockoutDurationMinutes}
                  helper="Allowed range: 1–1440 minutes."
                  onChange={(value) =>
                    handleChange("lockoutDurationMinutes", value)
                  }
                />

                <TextArea
                  label="Update Reason"
                  value={form.reason}
                  required
                  error={fieldErrors.reason}
                  onChange={(value) => handleChange("reason", value)}
                  placeholder="Example: Reduce account takeover risk after repeated failed login attempts."
                />
              </div>

              {!form.isEnabled && (
                <div className="mt-5 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100/80">
                  Automatic login lockout will be disabled. Failed login
                  attempts will no longer trigger temporary account
                  restrictions through this policy.
                </div>
              )}

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
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                      Current settings
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-white">
                      Protection status
                    </h2>
                  </div>

                  <StatusBadge enabled={policy?.isEnabled} />
                </div>

                <div className="space-y-4">
                  <PolicyValue
                    icon="password"
                    label="Failed Attempt Limit"
                    value={`${policy?.maxFailedLoginAttempts ?? 0} attempts`}
                    tone="cyan"
                  />

                  <PolicyValue
                    icon="lock_clock"
                    label="Lockout Duration"
                    value={`${policy?.lockoutDurationMinutes ?? 0} minutes`}
                    tone="yellow"
                  />

                  <PolicyValue
                    icon="verified_user"
                    label="Protection Status"
                    value={policy?.isEnabled ? "Enabled" : "Disabled"}
                    tone={policy?.isEnabled ? "green" : "red"}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
                <h2 className="text-lg font-bold text-white">
                  Last update
                </h2>

                <div className="mt-5 space-y-4">
                  <DetailRow
                    label="Updated At"
                    value={formatDateTime(
                      policy?.updatedAt || policy?.createdAt,
                      "N/A"
                    )}
                  />

                  <DetailRow
                    label="Updated By"
                    value={
                      policy?.updatedByAdminFullName ||
                      policy?.updatedByAdminEmail ||
                      "System"
                    }
                  />

                  {policy?.updatedByAdminEmail && (
                    <DetailRow
                      label="Admin Email"
                      value={policy.updatedByAdminEmail}
                    />
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-cyan-300">
                    info
                  </span>

                  <div>
                    <h3 className="font-bold text-white">
                      How it works
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                      Failed login attempts are counted by the backend. When
                      the configured limit is reached, the account is
                      temporarily locked for the configured duration.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}

        {showSaveConfirm && (
          <ConfirmActionModal
            title="Save security changes?"
            message={
              form.isEnabled
                ? `Automatic lockout will be enabled after ${form.maxFailedLoginAttempts} failed login attempts for ${form.lockoutDurationMinutes} minutes. Reason: ${form.reason.trim()}.`
                : `Automatic login lockout will be disabled for the platform. Reason: ${form.reason.trim()}.`
            }
            confirmLabel="Confirm Save"
            tone={form.isEnabled ? "cyan" : "red"}
            loading={saving}
            onCancel={() => {
              if (!saving) {
                setShowSaveConfirm(false);
              }
            }}
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

function ToggleField({ label, description, checked, onChange }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="font-bold text-white">{label}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
            {description}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative mt-1 h-7 w-12 shrink-0 rounded-full border transition ${
            checked
              ? "border-green-400/50 bg-green-400/30"
              : "border-white/10 bg-white/10"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
              checked ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  suffix,
  helper,
  required,
  disabled,
  error,
  onChange,
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <div
        className={`flex items-center rounded-xl border ${
          error
            ? "border-red-400/70 bg-red-500/10"
            : "border-white/10 bg-white/[0.04] focus-within:border-cyan-400/50"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <input
          type="number"
          min={min}
          max={max}
          step="1"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent px-4 py-3 text-sm font-bold text-white outline-none disabled:cursor-not-allowed"
        />

        {suffix && (
          <span className="border-l border-white/10 px-4 text-sm text-gray-500">
            {suffix}
          </span>
        )}
      </div>

      {error ? (
        <p className="mt-2 text-sm font-semibold text-red-300">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs leading-5 text-gray-500">
          {helper}
        </p>
      )}
    </div>
  );
}

function TextArea({
  label,
  value,
  required,
  error,
  onChange,
  placeholder,
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <textarea
        rows={5}
        maxLength={500}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full resize-none rounded-xl border px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 ${
          error
            ? "border-red-400/70 bg-red-500/10 focus:border-red-400"
            : "border-white/10 bg-white/[0.04] focus:border-cyan-400/50"
        }`}
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        {error ? (
          <p className="text-sm font-semibold text-red-300">
            {error}
          </p>
        ) : (
          <p className="text-xs leading-5 text-gray-500">
            Required for audit history. Minimum 10 characters.
          </p>
        )}

        <p className="shrink-0 text-xs text-gray-500">
          {String(value || "").length}/500
        </p>
      </div>
    </div>
  );
}

function PolicyValue({ icon, label, value, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-black text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="max-w-[65%] break-words text-right text-sm font-bold text-white">
        {value || "N/A"}
      </span>
    </div>
  );
}

function StatusBadge({ enabled }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
        enabled
          ? "border-green-400/30 bg-green-400/10 text-green-300"
          : "border-red-400/30 bg-red-400/10 text-red-300"
      }`}
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

function ConfirmActionModal({
  title,
  message,
  confirmLabel,
  tone = "cyan",
  loading,
  onCancel,
  onConfirm,
}) {
  const toneClass =
    tone === "red"
      ? "border-red-400/50 bg-red-400/10 text-red-300 hover:bg-red-400 hover:text-black"
      : "border-cyan-400/50 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-black";

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151a22] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.72)]">
        <div
          className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
            tone === "red"
              ? "border-red-400/30 bg-red-400/10 text-red-300"
              : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
          }`}
        >
          <span className="material-symbols-outlined">
            {tone === "red" ? "warning" : "security"}
          </span>
        </div>

        <h2 className="text-xl font-black text-white">{title}</h2>

        <p className="mt-2 text-sm leading-6 text-gray-400">
          {message}
        </p>

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
            className={`rounded-xl border px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
          >
            {loading ? "Saving..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessToast({ message, onClose }) {
  return (
    <div className="fixed right-4 top-4 z-[1400] w-[min(92vw,390px)]">
      <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-[#111a16] p-4 shadow-[0_18px_56px_rgba(0,0,0,0.45)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-green-400/30 bg-green-400/10 text-green-300">
          <span className="material-symbols-outlined">
            check_circle
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">
            Updated
          </p>
          <p className="mt-1 text-sm leading-5 text-green-100/75">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 transition hover:text-white"
          aria-label="Close notification"
        >
          <span className="material-symbols-outlined text-[20px]">
            close
          </span>
        </button>
      </div>
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

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <div className="h-[620px] rounded-2xl border border-white/10 bg-[#151a22]" />

        <div className="space-y-6">
          <div className="h-80 rounded-2xl border border-white/10 bg-[#151a22]" />
          <div className="h-56 rounded-2xl border border-white/10 bg-[#151a22]" />
        </div>
      </div>
    </div>
  );
}

function validateForm(form) {
  const errors = {};

  const maxAttemptsText = String(
    form.maxFailedLoginAttempts ?? ""
  ).trim();

  const durationText = String(
    form.lockoutDurationMinutes ?? ""
  ).trim();

  if (!maxAttemptsText) {
    errors.maxFailedLoginAttempts =
      "Maximum failed login attempts is required.";
  } else if (!/^\d+$/.test(maxAttemptsText)) {
    errors.maxFailedLoginAttempts =
      "Maximum failed login attempts must be a whole number.";
  } else {
    const value = Number(maxAttemptsText);

    if (value < 1 || value > 20) {
      errors.maxFailedLoginAttempts =
        "Maximum failed login attempts must be between 1 and 20.";
    }
  }

  if (!durationText) {
    errors.lockoutDurationMinutes =
      "Lockout duration is required.";
  } else if (!/^\d+$/.test(durationText)) {
    errors.lockoutDurationMinutes =
      "Lockout duration must be a whole number.";
  } else {
    const value = Number(durationText);

    if (value < 1 || value > 1440) {
      errors.lockoutDurationMinutes =
        "Lockout duration must be between 1 and 1440 minutes.";
    }
  }

  const reason = String(form.reason || "").trim();

  if (!reason) {
    errors.reason = "Update reason is required.";
  } else if (reason.length < 10) {
    errors.reason =
      "Update reason must be at least 10 characters.";
  } else if (reason.length > 500) {
    errors.reason =
      "Update reason cannot exceed 500 characters.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function getFriendlyError(
  err,
  fallback = "Something went wrong."
) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "You do not have permission to manage login security policy.";
  }

  if (status === 404) {
    return "Login security is unavailable. Please verify that the latest backend is running.";
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