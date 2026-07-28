import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminWorkflowPolicyService from "../../../services/adminWorkflowPolicy.service";

import { formatDateTime } from "../../../utils/dateTime.utils";
const DEFAULT_FORM = {
  proposalDraftLimit: "",
  proposalMilestoneLimit: "",
  freeProposalSubmitCount: "",
  resubmitNoteMaxLength: "",
  proposalResubmitLimit: "",
  proposalResubmitWindowHours: "",
  proposalCreditLowWarningThreshold: "",
  contractSignWindowHours: "",
  contractSignMissLimit: "",
  expertMaxActiveProjects: "",
  deliverableReviewWindowHours: "",
  deliverableAutoApproveGraceHours: "",
  deliverableArtifactLimit: "",
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
    title: "Proposals",
    description:
      "Controls expert proposal drafts, milestones, free submissions, resubmits, and credit warnings.",
    fields: [
      {
        name: "proposalDraftLimit",
        label: "Proposal Draft Limit",
        helper: "Maximum number of saved proposal drafts.",
        min: 0,
        max: 100,
      },
      {
        name: "proposalMilestoneLimit",
        label: "Proposal Milestone Limit",
        helper: "Maximum milestone items allowed in a proposal.",
        min: 1,
        max: 50,
      },
      {
        name: "freeProposalSubmitCount",
        label: "Free Proposal Submit Count",
        helper: "Free proposal submissions before credits are required.",
        min: 0,
        max: 100,
      },
      {
        name: "resubmitNoteMaxLength",
        label: "Resubmit Note Max Length",
        helper: "Maximum characters allowed for resubmission notes.",
        min: 100,
        max: 5000,
      },
      {
        name: "proposalResubmitLimit",
        label: "Proposal Resubmit Limit",
        helper: "Maximum resubmits in the configured window. Use 0 for unlimited.",
        min: 0,
        max: 100,
      },
      {
        name: "proposalResubmitWindowHours",
        label: "Resubmit Window Hours",
        helper: "Hours used to count proposal resubmits. Use 0 for lifetime counting.",
        suffix: "hours",
        min: 0,
        max: 8760,
      },
      {
        name: "proposalCreditLowWarningThreshold",
        label: "Credit Low Warning Threshold",
        helper: "Show a low-credit warning when remaining proposal credits reach this value.",
        min: 0,
        max: 1000,
      },
    ],
  },
  {
    key: "contract",
    icon: "contract",
    title: "Contracts & projects",
    description:
      "Controls contract signing time and how many active projects an expert can handle.",
    fields: [
      {
        name: "contractSignWindowHours",
        label: "Contract Sign Window Hours",
        helper: "Hours before the contract signing window expires.",
        suffix: "hours",
        min: 1,
        max: 720,
      },
      {
        name: "contractSignMissLimit",
        label: "Contract Sign Miss Limit",
        helper: "Missed signing attempts allowed before restriction rules apply.",
        min: 1,
        max: 20,
      },
      {
        name: "expertMaxActiveProjects",
        label: "Expert Max Active Projects",
        helper: "Maximum active projects an expert can handle at once.",
        min: 1,
        max: 50,
      },
    ],
  },
  {
    key: "deliverable",
    icon: "task_alt",
    title: "Deliverables",
    description:
      "Controls client review time and automatic approval timing for submitted work.",
    fields: [
      {
        name: "deliverableReviewWindowHours",
        label: "Deliverable Review Window Hours",
        helper: "Time allowed for client to review submitted work.",
        suffix: "hours",
        min: 1,
        max: 720,
      },
      {
        name: "deliverableAutoApproveGraceHours",
        label: "Auto Approve Grace Hours",
        helper: "Additional grace hours before auto approval applies.",
        suffix: "hours",
        min: 1,
        max: 168,
      },
      {
        name: "deliverableArtifactLimit",
        label: "Deliverable Artifact Limit",
        helper: "Maximum product links or files accepted for one deliverable.",
        min: 1,
        max: 100,
      },
    ],
  },
  {
    key: "wallet",
    icon: "account_balance_wallet",
    title: "Payments",
    description:
      "Controls deposit limits, withdrawal limits, withdrawal fee, QR expiration, and payout sync warning.",
    fields: [
      {
        name: "minimumWithdrawalAmount",
        label: "Minimum Withdrawal Amount",
        helper: "Minimum amount an expert can withdraw.",
        suffix: "VNĐ",
        min: 0,
      },
      {
        name: "withdrawalFeeRate",
        label: "Withdrawal Fee Rate",
        helper: "Currently disabled by marketplace rule and kept at 0%.",
        step: "0.01",
        readOnly: true,
      },
      {
        name: "minimumDepositAmount",
        label: "Minimum Deposit Amount",
        helper: "Minimum client wallet deposit amount.",
        suffix: "VNĐ",
        min: 0,
      },
      {
        name: "maximumDepositAmount",
        label: "Maximum Deposit Amount",
        helper: "Maximum client wallet deposit amount.",
        suffix: "VNĐ",
        min: 0,
      },
      {
        name: "depositOrderExpireMinutes",
        label: "Deposit Expire Minutes",
        helper: "QR/deposit order expiration time.",
        suffix: "minutes",
        min: 1,
        max: 1440,
      },
      {
        name: "withdrawalApprovalWindowHours",
        label: "Withdrawal Approval Window Hours",
        helper: "Time window for admin withdrawal approval.",
        suffix: "hours",
        min: 1,
        max: 720,
      },
      {
        name: "withdrawalPayoutSyncWarningHours",
        label: "Withdrawal Sync Warning Hours",
        helper: "Show warning when payout sync takes too long.",
        suffix: "hours",
        min: 1,
        max: 720,
      },
    ],
  },
  {
    key: "dispute",
    icon: "gavel",
    title: "Disputes",
    description: "Controls warning threshold after repeated lost disputes.",
    fields: [
      {
        name: "disputeLostWarningThreshold",
        label: "Dispute Lost Warning Threshold",
        helper: "Number of lost disputes before warning or admin review.",
        min: 1,
        max: 20,
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
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 3400);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

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
      if (field.readOnly) return;

      const rawValue = editForm[field.name];
      const value = Number(rawValue);

      if (rawValue === "" || rawValue === null || rawValue === undefined) {
        nextErrors[field.name] = "This field is required.";
      } else if (Number.isNaN(value)) {
        nextErrors[field.name] = "Value must be a valid number.";
      } else if (field.min !== undefined && value < field.min) {
        nextErrors[field.name] = `Value must be at least ${field.min}.`;
      } else if (field.max !== undefined && value > field.max) {
        nextErrors[field.name] = `Value cannot exceed ${field.max}.`;
      }
    });

    if (editSection.key === "wallet") {
      const minDeposit = Number(editForm.minimumDepositAmount);
      const maxDeposit = Number(editForm.maximumDepositAmount);

      if (
        editForm.minimumDepositAmount !== "" &&
        editForm.maximumDepositAmount !== "" &&
        !Number.isNaN(minDeposit) &&
        !Number.isNaN(maxDeposit) &&
        maxDeposit <= minDeposit
      ) {
        nextErrors.maximumDepositAmount =
          "Maximum deposit must be greater than minimum deposit.";
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

  const requestSaveSection = () => {
    const validationErrors = validateSection();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setError("Please check the highlighted fields before saving.");
      return;
    }

    setError("");
    setShowSaveConfirm(true);
  };

  const handleSaveSection = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      setShowSaveConfirm(false);

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
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#00F0FF]">
                Workflow
              </p>

              <h1 className="text-3xl font-bold text-white md:text-3xl">
                Workflow rules
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
                Review and update marketplace workflow limits by section.
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

          {message && <SuccessToast message={message} onClose={() => setMessage("")} />}

          {error && (
            <Alert
              type="danger"
              title="Action failed"
              message={error}
              onClose={() => setError("")}
            />
          )}

          {loading ? (
            <PageSkeleton cards={4} />
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
              onSave={requestSaveSection}
            />
          )}

          {showSaveConfirm && editSection && (
            <PolicySaveConfirmModal
              section={editSection}
              form={editForm}
              loading={saving}
              onCancel={() => !saving && setShowSaveConfirm(false)}
              onConfirm={handleSaveSection}
            />
          )}
        </div>
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


function PolicySaveConfirmModal({
  section,
  form,
  loading,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-cyan-400/20 bg-[#151a22] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <span className="material-symbols-outlined">policy</span>
        </div>

        <h2 className="text-lg font-black text-white">
          Save workflow changes?
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-400">
          These changes will update{" "}
          <span className="font-bold text-white">{section?.title}</span> for the
          platform. Review every changed value and the audit reason before saving.
        </p>

        <div className="mt-5 max-h-64 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {section?.fields?.map((field) => (
            <div
              key={field.name}
              className="grid grid-cols-[1fr_auto] gap-3 text-sm"
            >
              <span className="text-gray-500">{field.label}</span>
              <span className="font-bold text-white">
                {formatPolicyValue(form?.[field.name], field)}
              </span>
            </div>
          ))}

          <div className="border-t border-white/10 pt-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Update Reason
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">
              {form?.reason || "N/A"}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
          >
            Back
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2.5 text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Confirm Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PolicySummary({ policy }) {
  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 via-[#151a22]/95 to-[#151a22]/95 p-6 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
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
                Current configuration
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Rules currently applied across the marketplace.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MiniStat
            label="Last Updated"
            value={formatDateTime(policy?.updatedAt, "N/A")}
          />
          <MiniStat
            label="Status"
            value={policy?.isActive === false ? "Inactive" : "Active"}
          />
          <MiniStat
            label="Updated by"
            value={
              policy?.updatedByAdminName ||
              policy?.updatedByAdminEmail ||
              "Administrator"
            }
          />
        </div>
      </div>

      {policy?.updateReason && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Last update note
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
    <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
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
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                Edit Workflow rules
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
        {field.label} {!field.readOnly && <span className="text-red-400">*</span>}
      </span>

      <div className="flex items-center gap-2">
        <input
          type="number"
          step={field.step || "1"}
          min={field.min}
          max={field.max}
          disabled={field.readOnly}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm font-bold text-white outline-none transition ${
            field.readOnly
              ? "cursor-not-allowed border-white/10 bg-black/20 text-gray-400"
              : error
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
    proposalResubmitLimit: policy.proposalResubmitLimit ?? "",
    proposalResubmitWindowHours: policy.proposalResubmitWindowHours ?? "",
    proposalCreditLowWarningThreshold:
      policy.proposalCreditLowWarningThreshold ?? "",
    contractSignWindowHours: policy.contractSignWindowHours ?? "",
    contractSignMissLimit: policy.contractSignMissLimit ?? "",
    expertMaxActiveProjects: policy.expertMaxActiveProjects ?? "",
    deliverableReviewWindowHours: policy.deliverableReviewWindowHours ?? "",
    deliverableAutoApproveGraceHours:
      policy.deliverableAutoApproveGraceHours ?? "",
    deliverableArtifactLimit: policy.deliverableArtifactLimit ?? "",
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
    return "You do not have permission to update workflow policies.";
  }
  if (status === 404) {
    return "Workflow policy settings are temporarily unavailable. Please try again later.";
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
};