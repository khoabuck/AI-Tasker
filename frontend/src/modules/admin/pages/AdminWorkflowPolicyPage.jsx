import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminWorkflowPolicyService from "../../../services/adminWorkflowPolicy.service";

const DEFAULT_FORM = {
  proposalDraftLimit: "",
  proposalMilestoneLimit: "",
  freeProposalSubmitCount: "",
  resubmitNoteMaxLength: "",
  contractSignWindowHours: "",
  expertMaxActiveProjects: "",
  deliverableReviewWindowHours: "",
  deliverableAutoApproveGraceHours: "",
  minimumWithdrawalAmount: "",
  withdrawalFeeRate: "",
  minimumDepositAmount: "",
  maximumDepositAmount: "",
  depositOrderExpireMinutes: "",
  withdrawalApprovalWindowHours: "",
  withdrawalPayoutSyncWarningHours: "",
  disputeLostWarningThreshold: "",
  reason: "",
};

const POLICY_SECTIONS = [
  {
    key: "proposal",
    icon: "edit_document",
    title: "Proposal Rules",
    description:
      "Controls expert proposal drafts, proposal milestones, free submissions, and resubmission note length.",
    fields: [
      {
        name: "proposalDraftLimit",
        label: "Proposal Draft Limit",
        helper: "Maximum number of saved proposal drafts.",
      },
      {
        name: "proposalMilestoneLimit",
        label: "Proposal Milestone Limit",
        helper: "Maximum milestone items allowed in a proposal.",
      },
      {
        name: "freeProposalSubmitCount",
        label: "Free Proposal Submit Count",
        helper: "Free proposal submissions before credits are required.",
      },
      {
        name: "resubmitNoteMaxLength",
        label: "Resubmit Note Max Length",
        helper: "Maximum characters allowed for resubmission notes.",
      },
    ],
  },
  {
    key: "contract",
    icon: "contract",
    title: "Contract & Project Rules",
    description:
      "Controls contract signing time and how many active projects an expert can handle.",
    fields: [
      {
        name: "contractSignWindowHours",
        label: "Contract Sign Window Hours",
        helper: "Hours before the contract signing window expires.",
        suffix: "hours",
      },
      {
        name: "expertMaxActiveProjects",
        label: "Expert Max Active Projects",
        helper: "Maximum active projects an expert can handle at once.",
      },
    ],
  },
  {
    key: "deliverable",
    icon: "task_alt",
    title: "Deliverable Rules",
    description:
      "Controls client review time and automatic approval timing for submitted work.",
    fields: [
      {
        name: "deliverableReviewWindowHours",
        label: "Deliverable Review Window Hours",
        helper: "Time allowed for client to review submitted work.",
        suffix: "hours",
      },
      {
        name: "deliverableAutoApproveGraceHours",
        label: "Auto Approve Grace Hours",
        helper: "Additional grace hours before auto approval applies.",
        suffix: "hours",
      },
    ],
  },
  {
    key: "wallet",
    icon: "account_balance_wallet",
    title: "Wallet & Payment Rules",
    description:
      "Controls deposit limits, withdrawal limits, withdrawal fee, QR expiration, and payout sync warning.",
    fields: [
      {
        name: "minimumWithdrawalAmount",
        label: "Minimum Withdrawal Amount",
        helper: "Minimum amount an expert can withdraw.",
        suffix: "VNĐ",
      },
      {
        name: "withdrawalFeeRate",
        label: "Withdrawal Fee Rate",
        helper: "Use decimal rate. Example: 0.1 = 10%.",
        step: "0.01",
      },
      {
        name: "minimumDepositAmount",
        label: "Minimum Deposit Amount",
        helper: "Minimum client wallet deposit amount.",
        suffix: "VNĐ",
      },
      {
        name: "maximumDepositAmount",
        label: "Maximum Deposit Amount",
        helper: "Maximum client wallet deposit amount.",
        suffix: "VNĐ",
      },
      {
        name: "depositOrderExpireMinutes",
        label: "Deposit Expire Minutes",
        helper: "QR/deposit order expiration time.",
        suffix: "minutes",
      },
      {
        name: "withdrawalApprovalWindowHours",
        label: "Withdrawal Approval Window Hours",
        helper: "Time window for admin withdrawal approval.",
        suffix: "hours",
      },
      {
        name: "withdrawalPayoutSyncWarningHours",
        label: "Withdrawal Sync Warning Hours",
        helper: "Show warning when payout sync takes too long.",
        suffix: "hours",
      },
    ],
  },
  {
    key: "dispute",
    icon: "gavel",
    title: "Dispute Rules",
    description: "Controls warning threshold after repeated lost disputes.",
    fields: [
      {
        name: "disputeLostWarningThreshold",
        label: "Dispute Lost Warning Threshold",
        helper: "Number of lost disputes before warning or admin review.",
      },
    ],
  },
];

export default function AdminWorkflowPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [editSection, setEditSection] = useState(null);
  const [editForm, setEditForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPolicy();
  }, []);

  const formFromPolicy = useMemo(() => buildForm(policy), [policy]);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await adminWorkflowPolicyService.getPolicy();
      setPolicy(data);
    } catch (err) {
      console.error("LOAD WORKFLOW POLICY ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load workflow policy."));
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (section) => {
    setEditSection(section);
    setEditForm({
      ...formFromPolicy,
      reason: "",
    });
    setErrors({});
    setError("");
    setMessage("");
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditSection(null);
    setEditForm(DEFAULT_FORM);
    setErrors({});
  };

  const updateField = (name, value) => {
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setError("");
    setMessage("");
  };

  const validateSection = () => {
    const nextErrors = {};

    if (!editSection) return nextErrors;

    editSection.fields.forEach((field) => {
      const rawValue = editForm[field.name];
      const value = Number(rawValue);

      if (rawValue === "" || rawValue === null || rawValue === undefined) {
        nextErrors[field.name] = "This field is required.";
      } else if (Number.isNaN(value)) {
        nextErrors[field.name] = "Value must be a valid number.";
      } else if (value < 0) {
        nextErrors[field.name] = "Value must be 0 or greater.";
      }
    });

    if (editSection.key === "wallet") {
      const minDeposit = Number(editForm.minimumDepositAmount);
      const maxDeposit = Number(editForm.maximumDepositAmount);
      const withdrawalFeeRate = Number(editForm.withdrawalFeeRate);

      if (
        editForm.minimumDepositAmount !== "" &&
        editForm.maximumDepositAmount !== "" &&
        !Number.isNaN(minDeposit) &&
        !Number.isNaN(maxDeposit) &&
        maxDeposit < minDeposit
      ) {
        nextErrors.maximumDepositAmount =
          "Maximum deposit must be greater than or equal to minimum deposit.";
      }

      if (
        editForm.withdrawalFeeRate === "" ||
        Number.isNaN(withdrawalFeeRate) ||
        withdrawalFeeRate < 0 ||
        withdrawalFeeRate > 1
      ) {
        nextErrors.withdrawalFeeRate =
          "Withdrawal fee rate must be between 0 and 1.";
      }
    }

    const reason = editForm.reason.trim();

    if (!reason) {
      nextErrors.reason = "Please enter the reason for this update.";
    } else if (reason.length < 10) {
      nextErrors.reason = "Reason must be at least 10 characters.";
    } else if (reason.length > 500) {
      nextErrors.reason = "Reason cannot exceed 500 characters.";
    }

    return nextErrors;
  };

  const handleSaveSection = async () => {
    const validationErrors = validateSection();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setError("Please check the highlighted fields before saving.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updated = await adminWorkflowPolicyService.updatePolicy(editForm);

      setPolicy(updated);
      setMessage(`${editSection.title} updated successfully.`);
      closeEditModal();
    } catch (err) {
      console.error("UPDATE WORKFLOW POLICY ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot update workflow policy."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                System Workflow
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Workflow Policy
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
                View the current marketplace rules. To change a specific group,
                click Edit on that section and provide an update reason.
              </p>
            </div>

            <button
              type="button"
              onClick={loadPolicy}
              disabled={loading || saving}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {message && (
            <Alert
              type="success"
              title="Success"
              message={message}
              onClose={() => setMessage("")}
            />
          )}

          {error && (
            <Alert
              type="danger"
              title="Action failed"
              message={error}
              onClose={() => setError("")}
            />
          )}

          {loading ? (
            <LoadingState />
          ) : (
            <>
              <PolicySummary policy={policy} />

              <div className="mt-6 grid grid-cols-1 gap-6">
                {POLICY_SECTIONS.map((section) => (
                  <PolicySectionCard
                    key={section.key}
                    section={section}
                    policy={policy}
                    onEdit={() => openEditModal(section)}
                  />
                ))}
              </div>
            </>
          )}

          {editSection && (
            <EditSectionModal
              section={editSection}
              form={editForm}
              errors={errors}
              saving={saving}
              onClose={closeEditModal}
              onChange={updateField}
              onSave={handleSaveSection}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function PolicySummary({ policy }) {
  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 via-[#151a22]/95 to-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
              <span className="material-symbols-outlined">
                settings_suggest
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Current Workflow Setup
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                These values are currently applied by the marketplace workflow.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MiniStat
            label="Last Updated"
            value={formatDateTime(policy?.updatedAt)}
          />
          <MiniStat
            label="Policy Status"
            value={policy?.isActive === false ? "Inactive" : "Active"}
          />
          <MiniStat
            label="Updated By"
            value={policy?.updatedByAdminId || "N/A"}
          />
        </div>
      </div>

      {policy?.updateReason && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Last Update Reason
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-300">
            {policy.updateReason}
          </p>
        </div>
      )}
    </section>
  );
}

function PolicySectionCard({ section, policy, onEdit }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <span className="material-symbols-outlined">{section.icon}</span>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-white">
              {section.title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-400">
              {section.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {section.fields.map((field) => (
          <ReadOnlyPolicyItem
            key={field.name}
            field={field}
            value={policy?.[field.name]}
          />
        ))}
      </div>
    </section>
  );
}

function ReadOnlyPolicyItem({ field, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {field.label}
      </p>

      <p className="mt-3 text-2xl font-black text-white">
        {formatPolicyValue(value, field)}
      </p>

      <p className="mt-2 text-xs leading-5 text-gray-500">{field.helper}</p>
    </div>
  );
}

function EditSectionModal({
  section,
  form,
  errors,
  saving,
  onClose,
  onChange,
  onSave,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm">
      <style>
        {`
          .workflow-policy-modal-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .workflow-policy-modal-scroll::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#151a22] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
              <span className="material-symbols-outlined text-[22px]">
                {section.icon}
              </span>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                Edit Workflow Policy
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                {section.title}
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-gray-400">
                Update only this policy group. Other groups keep their current
                values.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="workflow-policy-modal-scroll max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="mb-4 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-xs leading-5 text-yellow-100/80">
            Please review values carefully. Changes here affect the platform
            workflow for users.
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {section.fields.map((field) => (
              <PolicyInput
                key={field.name}
                field={field}
                value={form[field.name]}
                error={errors[field.name]}
                onChange={onChange}
              />
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3">
              <p className="text-sm font-extrabold text-white">
                Update Reason <span className="text-red-400">*</span>
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Explain why this group is being changed.
              </p>
            </div>

            <TextArea
              name="reason"
              value={form.reason}
              error={errors.reason}
              onChange={onChange}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-6 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : `Save ${section.title}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PolicyInput({ field, value, error, onChange }) {
  return (
    <label className="block rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {field.label} <span className="text-red-400">*</span>
      </span>

      <div className="flex items-center gap-2">
        <input
          type="number"
          step={field.step || "1"}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm font-bold text-white outline-none transition ${
            error
              ? "border-red-400/70 bg-red-500/10"
              : "border-white/10 bg-[#0f141d] focus:border-cyan-400/50"
          }`}
        />

        {field.suffix && (
          <span className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-xs font-bold text-gray-300">
            {field.suffix}
          </span>
        )}
      </div>

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>
      ) : (
        <p className="mt-2 text-[11px] leading-5 text-gray-500">
          {field.helper}
        </p>
      )}
    </label>
  );
}

function TextArea({ name, value, error, onChange }) {
  return (
    <div>
      <textarea
        rows={4}
        maxLength={500}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder="Example: Adjust this policy because the current limit is too strict for users."
        className={`w-full resize-none rounded-xl border px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 ${
          error
            ? "border-red-400/70 bg-red-500/10"
            : "border-white/10 bg-white/[0.04] focus:border-cyan-400/50"
        }`}
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        {error ? (
          <p className="text-sm font-semibold text-red-300">{error}</p>
        ) : (
          <p className="text-xs text-gray-500">
            Minimum 10 characters. Maximum 500 characters.
          </p>
        )}

        <p className="shrink-0 text-xs text-gray-500">
          {String(value || "").length}/500
        </p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold text-white">{value || "N/A"}</p>
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

function LoadingState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-12 text-center text-gray-400">
      <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
        hourglass_empty
      </span>
      Loading workflow policy...
    </div>
  );
}

function buildForm(policy) {
  if (!policy) return DEFAULT_FORM;

  return {
    proposalDraftLimit: policy.proposalDraftLimit ?? "",
    proposalMilestoneLimit: policy.proposalMilestoneLimit ?? "",
    freeProposalSubmitCount: policy.freeProposalSubmitCount ?? "",
    resubmitNoteMaxLength: policy.resubmitNoteMaxLength ?? "",
    contractSignWindowHours: policy.contractSignWindowHours ?? "",
    expertMaxActiveProjects: policy.expertMaxActiveProjects ?? "",
    deliverableReviewWindowHours: policy.deliverableReviewWindowHours ?? "",
    deliverableAutoApproveGraceHours:
      policy.deliverableAutoApproveGraceHours ?? "",
    minimumWithdrawalAmount: policy.minimumWithdrawalAmount ?? "",
    withdrawalFeeRate: policy.withdrawalFeeRate ?? "",
    minimumDepositAmount: policy.minimumDepositAmount ?? "",
    maximumDepositAmount: policy.maximumDepositAmount ?? "",
    depositOrderExpireMinutes: policy.depositOrderExpireMinutes ?? "",
    withdrawalApprovalWindowHours: policy.withdrawalApprovalWindowHours ?? "",
    withdrawalPayoutSyncWarningHours:
      policy.withdrawalPayoutSyncWarningHours ?? "",
    disputeLostWarningThreshold: policy.disputeLostWarningThreshold ?? "",
    reason: "",
  };
}

function formatPolicyValue(value, field) {
  if (value === undefined || value === null || value === "") return "N/A";

  if (field.name === "withdrawalFeeRate") {
    return `${Number(value) * 100}%`;
  }

  if (field.suffix === "VNĐ") {
    return `${formatNumber(value)} VNĐ`;
  }

  if (field.suffix) {
    return `${formatNumber(value)} ${field.suffix}`;
  }

  return formatNumber(value);
}

function formatNumber(value) {
  const number = Number(value);

  if (Number.isNaN(number)) return String(value || "N/A");

  return new Intl.NumberFormat("vi-VN").format(number);
}

function getFriendlyError(err, fallback = "Something went wrong.") {
  const status = err?.response?.status;

  if (status === 401) return "Your session has expired. Please login again.";
  if (status === 403) {
    return "Backend blocked this request because the current token does not have ADMIN permission.";
  }
  if (status === 404) {
    return "Workflow policy API was not found. Please check backend route.";
  }

  const data = err?.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.title) return data.title;
  if (data?.detail) return data.detail;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();
    if (allErrors.length > 0) return allErrors.join(" ");
  }

  return err?.message || fallback;
}

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
}