import { useEffect, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminPolicyService from "../../../services/adminPolicy.service";

export default function AdminPlatformFeePolicyPage() {
  const [formData, setFormData] = useState({
    feePercent: 10,
    minimumFee: 0,
    maximumFee: "",
    fixedFee: 0,
    isActive: true,
    effectiveFrom: "",
    effectiveTo: "",
  });

  const [rawPolicy, setRawPolicy] = useState(null);
  const [previewAmount, setPreviewAmount] = useState(1000);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const policy = await adminPolicyService.getPlatformFeePolicy();

      setFormData({
        feePercent: policy.feePercent ?? 10,
        minimumFee: policy.minimumFee ?? 0,
        maximumFee: policy.maximumFee ?? "",
        fixedFee: policy.fixedFee ?? 0,
        isActive: Boolean(policy.isActive),
        effectiveFrom: toDateTimeLocalValue(policy.effectiveFrom),
        effectiveTo: toDateTimeLocalValue(policy.effectiveTo),
      });

      setRawPolicy(policy);
    } catch (err) {
      console.error("LOAD PLATFORM FEE POLICY ERROR:", err?.response?.data || err);
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

  const calculatePreview = () => {
    const amount = Number(previewAmount || 0);
    const feePercent = Number(formData.feePercent || 0);
    const minimumFee = Number(formData.minimumFee || 0);
    const maximumFee =
      formData.maximumFee === "" || formData.maximumFee === null
        ? null
        : Number(formData.maximumFee);
    const fixedFee = Number(formData.fixedFee || 0);

    let platformFee = amount * (feePercent / 100) + fixedFee;

    if (platformFee < minimumFee) {
      platformFee = minimumFee;
    }

    if (maximumFee !== null && !Number.isNaN(maximumFee)) {
      platformFee = Math.min(platformFee, maximumFee);
    }

    const expertAmount = Math.max(amount - platformFee, 0);

    return {
      amount,
      platformFee,
      expertAmount,
    };
  };

  const preview = calculatePreview();

  const validateForm = () => {
    if (Number(formData.feePercent) < 0) {
      return "Fee percent cannot be negative.";
    }

    if (Number(formData.feePercent) > 100) {
      return "Fee percent cannot be greater than 100.";
    }

    if (Number(formData.minimumFee) < 0) {
      return "Minimum fee cannot be negative.";
    }

    if (formData.maximumFee !== "" && Number(formData.maximumFee) < 0) {
      return "Maximum fee cannot be negative.";
    }

    if (Number(formData.fixedFee) < 0) {
      return "Fixed fee cannot be negative.";
    }

    if (
      formData.maximumFee !== "" &&
      Number(formData.maximumFee) < Number(formData.minimumFee)
    ) {
      return "Maximum fee cannot be lower than minimum fee.";
    }

    if (
      formData.effectiveFrom &&
      formData.effectiveTo &&
      new Date(formData.effectiveFrom).getTime() >
        new Date(formData.effectiveTo).getTime()
    ) {
      return "Effective from cannot be later than effective to.";
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

      const updated = await adminPolicyService.updatePlatformFeePolicy(formData);

      setRawPolicy(updated);
      setMessage("Platform fee policy updated successfully.");
    } catch (err) {
      console.error("UPDATE PLATFORM FEE POLICY ERROR:", err?.response?.data || err);
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
                Platform fee policy
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Configure how the platform fee is calculated from contract or
                transaction amounts.
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
              Loading platform fee policy...
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              <form onSubmit={handleSubmit} className={`${cardStyle} p-6`}>
                <SectionTitle icon="payments" title="Fee Rules" />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <NumberField
                    label="Fee Percent"
                    value={formData.feePercent}
                    min="0"
                    max="100"
                    suffix="%"
                    onChange={(value) => handleChange("feePercent", value)}
                  />

                  <NumberField
                    label="Fixed Fee"
                    value={formData.fixedFee}
                    min="0"
                    onChange={(value) => handleChange("fixedFee", value)}
                  />

                  <NumberField
                    label="Minimum Fee"
                    value={formData.minimumFee}
                    min="0"
                    onChange={(value) => handleChange("minimumFee", value)}
                  />

                  <NumberField
                    label="Maximum Fee"
                    value={formData.maximumFee}
                    min="0"
                    placeholder="Empty means no maximum"
                    onChange={(value) => handleChange("maximumFee", value)}
                  />

                  <DateTimeField
                    label="Effective From"
                    value={formData.effectiveFrom}
                    onChange={(value) => handleChange("effectiveFrom", value)}
                  />

                  <DateTimeField
                    label="Effective To"
                    value={formData.effectiveTo}
                    onChange={(value) => handleChange("effectiveTo", value)}
                  />

                  <BooleanField
                    label="Policy Active"
                    value={formData.isActive}
                    onChange={(value) => handleChange("isActive", value)}
                  />
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
                  <SectionTitle icon="calculate" title="Fee Preview" />

                  <div className="mb-5">
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                      Contract Amount
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={previewAmount}
                      onChange={(event) => setPreviewAmount(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                    />
                  </div>

                  <div className="space-y-4">
                    <InfoItem
                      label="Original Amount"
                      value={formatMoney(preview.amount)}
                    />
                    <InfoItem
                      label="Platform Fee"
                      value={formatMoney(preview.platformFee)}
                    />
                    <InfoItem
                      label="Expert Amount"
                      value={formatMoney(preview.expertAmount)}
                    />
                  </div>
                </section>

                <section className={`${cardStyle} p-6`}>
                  <SectionTitle icon="fact_check" title="Policy Summary" />

                  <div className="space-y-4">
                    <InfoItem
                      label="Fee Percent"
                      value={`${formData.feePercent || 0}%`}
                    />
                    <InfoItem
                      label="Minimum Fee"
                      value={formatMoney(formData.minimumFee)}
                    />
                    <InfoItem
                      label="Maximum Fee"
                      value={
                        formData.maximumFee === ""
                          ? "No maximum"
                          : formatMoney(formData.maximumFee)
                      }
                    />
                    <InfoItem
                      label="Fixed Fee"
                      value={formatMoney(formData.fixedFee)}
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

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  placeholder,
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </label>

      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
        />

        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function DateTimeField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </label>

      <input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
      />
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

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isNaN(number) ? 0 : number);
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

function toDateTimeLocalValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);

  return localDate.toISOString().slice(0, 16);
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
    return "Platform fee policy API was not found. Please check backend route.";
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