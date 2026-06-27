import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminJobCreditPackageService from "../../../services/adminJobCreditPackage.service";

const EMPTY_FORM = {
  packageName: "",
  description: "",
  jobPostCredits: 0,
  aiGenerationCredits: 0,
  price: 0,
  currency: "VND",
  isActive: true,
  displayOrder: 0,
  reason: "",
};

const EMPTY_ACTION = {
  type: "",
  packageItem: null,
};

export default function AdminJobCreditPackagesPage() {
  const [packages, setPackages] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [action, setAction] = useState(EMPTY_ACTION);
  const [form, setForm] = useState(EMPTY_FORM);
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadPackages();
  }, []);

  const filteredPackages = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return packages.filter((item) => {
      const matchSearch =
        !search ||
        String(item.packageName || "").toLowerCase().includes(search) ||
        String(item.description || "").toLowerCase().includes(search) ||
        String(item.packageId || "").toLowerCase().includes(search);

      const matchActive =
        activeFilter === "ALL" ||
        (activeFilter === "ACTIVE" && item.isActive) ||
        (activeFilter === "INACTIVE" && !item.isActive);

      return matchSearch && matchActive;
    });
  }, [packages, keyword, activeFilter]);

  const stats = useMemo(() => {
    return packages.reduce(
      (result, item) => {
        result.total += 1;
        result.totalPrice += Number(item.price || 0);

        if (item.isActive) result.active += 1;
        if (!item.isActive) result.inactive += 1;

        return result;
      },
      {
        total: 0,
        active: 0,
        inactive: 0,
        totalPrice: 0,
      }
    );
  }, [packages]);

  const loadPackages = async ({ keepMessage = false } = {}) => {
    try {
      setLoading(true);
      setError("");

      if (!keepMessage) setSuccess("");

      const data = await adminJobCreditPackageService.getPackages();
      setPackages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD JOB CREDIT PACKAGES ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load job credit packages."));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setAction({
      type: "CREATE",
      packageItem: null,
    });

    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
  };

  const openEditModal = (packageItem) => {
    setAction({
      type: "EDIT",
      packageItem,
    });

    setForm({
      packageName: packageItem.packageName || "",
      description: packageItem.description || "",
      jobPostCredits: packageItem.jobPostCredits ?? 0,
      aiGenerationCredits: packageItem.aiGenerationCredits ?? 0,
      price: packageItem.price ?? 0,
      currency: packageItem.currency || "VND",
      isActive: Boolean(packageItem.isActive),
      displayOrder: packageItem.displayOrder ?? 0,
      reason: "",
    });

    setError("");
    setSuccess("");
  };

  const openToggleModal = (type, packageItem) => {
    setAction({
      type,
      packageItem,
    });

    setReason(
      type === "ACTIVATE" ? "Activate package." : "Deactivate package."
    );

    setError("");
    setSuccess("");
  };

  const closeModal = () => {
    if (saving) return;

    setAction(EMPTY_ACTION);
    setForm(EMPTY_FORM);
    setReason("");
  };

  const handleFormChange = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateOrUpdate = async () => {
    const validationError = validateForm(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (action.type === "CREATE") {
        await adminJobCreditPackageService.createPackage(form);
        setSuccess("Job credit package has been created successfully.");
      }

      if (action.type === "EDIT") {
        await adminJobCreditPackageService.updatePackage(
          action.packageItem.packageId,
          form
        );
        setSuccess("Job credit package has been updated successfully.");
      }

      closeModal();
      await loadPackages({ keepMessage: true });
    } catch (err) {
      console.error("SAVE JOB CREDIT PACKAGE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot save job credit package."));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!action.packageItem?.packageId) return;

    if (!reason.trim()) {
      setError("Please enter reason.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (action.type === "ACTIVATE") {
        await adminJobCreditPackageService.activatePackage(
          action.packageItem.packageId,
          reason
        );
        setSuccess("Package has been activated successfully.");
      }

      if (action.type === "DEACTIVATE") {
        await adminJobCreditPackageService.deactivatePackage(
          action.packageItem.packageId,
          reason
        );
        setSuccess("Package has been deactivated successfully.");
      }

      closeModal();
      await loadPackages({ keepMessage: true });
    } catch (err) {
      console.error("TOGGLE PACKAGE STATUS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot update package status."));
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
              Package Management
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Job credit packages
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Manage job posting credit packages and AI generation credit
              packages available for clients.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => loadPackages()}
              disabled={loading || saving}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={loading || saving}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Package
            </button>
          </div>
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

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon="inventory_2"
            label="Total Packages"
            value={stats.total}
            description="All credit packages"
            tone="cyan"
          />

          <StatCard
            icon="check_circle"
            label="Active"
            value={stats.active}
            description="Available for purchase"
            tone="green"
          />

          <StatCard
            icon="block"
            label="Inactive"
            value={stats.inactive}
            description="Hidden packages"
            tone="red"
          />

          <StatCard
            icon="payments"
            label="Total Price"
            value={formatMoney(stats.totalPrice, "VND")}
            description="Sum of package prices"
            tone="purple"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Search
              </label>

              <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4">
                <span className="material-symbols-outlined text-[20px] text-gray-500">
                  search
                </span>

                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Search by package name, description, or package id..."
                  className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
                />
              </div>
            </div>

            <FilterSelect
              label="Status"
              value={activeFilter}
              options={["ALL", "ACTIVE", "INACTIVE"]}
              onChange={setActiveFilter}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Packages</h2>
              <p className="mt-1 text-sm text-gray-500">
                Showing {filteredPackages.length} of {packages.length} records.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading job credit packages...
            </div>
          ) : filteredPackages.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-white/10">
              {filteredPackages.map((item) => (
                <PackageRow
                  key={item.packageId || item.id}
                  packageItem={item}
                  disabled={saving}
                  onEdit={() => openEditModal(item)}
                  onActivate={() => openToggleModal("ACTIVATE", item)}
                  onDeactivate={() => openToggleModal("DEACTIVATE", item)}
                />
              ))}
            </div>
          )}
        </section>

        {(action.type === "CREATE" || action.type === "EDIT") && (
          <PackageFormModal
            title={action.type === "CREATE" ? "Create Package" : "Edit Package"}
            form={form}
            loading={saving}
            onClose={closeModal}
            onConfirm={handleCreateOrUpdate}
            onChange={handleFormChange}
          />
        )}

        {(action.type === "ACTIVATE" || action.type === "DEACTIVATE") && (
          <ReasonModal
            title={
              action.type === "ACTIVATE"
                ? "Activate Package"
                : "Deactivate Package"
            }
            subtitle={action.packageItem?.packageName}
            confirmLabel={
              action.type === "ACTIVATE" ? "Activate" : "Deactivate"
            }
            confirmTone={action.type === "ACTIVATE" ? "green" : "red"}
            reason={reason}
            loading={saving}
            onReasonChange={setReason}
            onClose={closeModal}
            onConfirm={handleToggleActive}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function PackageRow({
  packageItem,
  disabled,
  onEdit,
  onActivate,
  onDeactivate,
}) {
  return (
    <article className="p-5 transition hover:bg-white/[0.02]">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_170px_170px_260px] xl:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge active={packageItem.isActive} />
            <Badge label={`Package #${packageItem.packageId || "N/A"}`} />
            <Badge label={`Order ${packageItem.displayOrder || 0}`} />
          </div>

          <h3 className="line-clamp-1 font-bold text-white">
            {packageItem.packageName}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
            {packageItem.description || "No description."}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Credits
          </p>
          <p className="text-sm font-bold text-white">
            Job: {formatNumber(packageItem.jobPostCredits)}
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            AI: {formatNumber(packageItem.aiGenerationCredits)}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Price
          </p>
          <p className="text-lg font-extrabold text-white">
            {formatMoney(packageItem.price, packageItem.currency)}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
          <button
            type="button"
            onClick={onEdit}
            disabled={disabled}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Edit
          </button>

          {packageItem.isActive ? (
            <button
              type="button"
              onClick={onDeactivate}
              disabled={disabled}
              className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={onActivate}
              disabled={disabled}
              className="rounded-xl border border-green-400/40 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Activate
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function PackageFormModal({
  title,
  form,
  loading,
  onClose,
  onConfirm,
  onChange,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#151a22] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-gray-400">
            Fill package information and provide an admin reason.
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <TextInput
            label="Package Name"
            value={form.packageName}
            onChange={(value) => onChange("packageName", value)}
            placeholder="Starter Package"
          />

          <TextArea
            label="Description"
            value={form.description}
            onChange={(value) => onChange("description", value)}
            placeholder="Describe what this package includes."
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <NumberInput
              label="Job Post Credits"
              value={form.jobPostCredits}
              onChange={(value) => onChange("jobPostCredits", value)}
            />

            <NumberInput
              label="AI Generation Credits"
              value={form.aiGenerationCredits}
              onChange={(value) => onChange("aiGenerationCredits", value)}
            />

            <NumberInput
              label="Price"
              value={form.price}
              onChange={(value) => onChange("price", value)}
              step="0.01"
            />

            <TextInput
              label="Currency"
              value={form.currency}
              onChange={(value) => onChange("currency", value)}
              placeholder="VND"
            />

            <NumberInput
              label="Display Order"
              value={form.displayOrder}
              onChange={(value) => onChange("displayOrder", value)}
            />

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Active
              </label>

              <select
                value={form.isActive ? "true" : "false"}
                onChange={(event) =>
                  onChange("isActive", event.target.value === "true")
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-[#0d1117] px-4 text-sm font-bold text-white outline-none focus:border-cyan-400/50"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <TextArea
            label="Reason"
            value={form.reason}
            onChange={(value) => onChange("reason", value)}
            placeholder="Example: Create new client package."
          />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Package"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReasonModal({
  title,
  subtitle,
  confirmLabel,
  confirmTone,
  reason,
  loading,
  onReasonChange,
  onClose,
  onConfirm,
}) {
  const confirmClass =
    confirmTone === "red"
      ? "border-red-400/50 bg-red-400/10 text-red-300 hover:bg-red-400 hover:text-black"
      : "border-green-400/50 bg-green-400/10 text-green-300 hover:bg-green-400 hover:text-black";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#151a22] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        </div>

        <div className="px-6 py-5">
          <TextArea
            label="Reason"
            value={reason}
            onChange={onReasonChange}
            placeholder="Enter admin reason."
          />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl border px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, description, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-[#0d1117] px-4 text-sm font-bold text-white outline-none focus:border-cyan-400/50"
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {formatLabel(item)}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-cyan-400/50"
      />
    </div>
  );
}

function NumberInput({ label, value, onChange, step = "1" }) {
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
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none focus:border-cyan-400/50"
      />
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

function StatusBadge({ active }) {
  const className = active
    ? "border-green-400/30 bg-green-400/10 text-green-300"
    : "border-red-400/30 bg-red-400/10 text-red-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${className}`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Badge({ label }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-gray-400">
      {label}
    </span>
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

function EmptyState() {
  return (
    <div className="p-12 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        inventory_2
      </span>

      <h3 className="text-lg font-bold text-white">No packages found</h3>

      <p className="mt-2 text-sm text-gray-400">
        Try changing the search keyword or status filter.
      </p>
    </div>
  );
}

function validateForm(form) {
  if (!String(form.packageName || "").trim()) {
    return "Package name is required.";
  }

  if (Number(form.jobPostCredits) < 0) {
    return "Job post credits must be greater than or equal to 0.";
  }

  if (Number(form.aiGenerationCredits) < 0) {
    return "AI generation credits must be greater than or equal to 0.";
  }

  if (Number(form.price) < 0) {
    return "Price must be greater than or equal to 0.";
  }

  if (!String(form.currency || "").trim()) {
    return "Currency is required.";
  }

  if (!String(form.reason || "").trim()) {
    return "Reason is required.";
  }

  if (String(form.reason || "").trim().length < 10) {
    return "Reason must be at least 10 characters.";
  }

  return "";
}

function formatMoney(value, currency = "VND") {
  const number = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: 2,
    }).format(Number.isNaN(number) ? 0 : number);
  } catch {
    return `${formatNumber(number)} ${currency || ""}`;
  }
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
    .replaceAll("_", " ")
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
    return "Job credit packages API was not found. Please check backend route.";
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