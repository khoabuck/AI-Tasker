import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminProposalCreditService from "../../../services/adminProposalCredit.service";

const INITIAL_FILTERS = {
  search: "",
  creditStatus: "ALL",
  submitPermission: "ALL",
};

const EMPTY_CONFIRMATION = {
  type: "",
  title: "",
  message: "",
  confirmLabel: "",
  tone: "cyan",
};

export default function AdminProposalCreditsPage() {
  const [experts, setExperts] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [selectedExpert, setSelectedExpert] = useState(null);
  const [showManageModal, setShowManageModal] = useState(false);

  const [adjustmentMode, setAdjustmentMode] = useState("ADD");
  const [creditAmount, setCreditAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const [confirmation, setConfirmation] = useState(EMPTY_CONFIRMATION);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [adjustErrors, setAdjustErrors] = useState({});

  useEffect(() => {
    loadExperts();
  }, []);

  const stats = useMemo(() => {
    return {
      totalExperts: experts.length,
      expertsWithCredits: experts.filter(
        (item) => Number(item.proposalSubmitCredits || 0) > 0
      ).length,
      canSubmitCount: experts.filter(
        (item) => Boolean(item.canSubmitProposal)
      ).length,
      totalCredits: experts.reduce(
        (sum, item) => sum + Number(item.proposalSubmitCredits || 0),
        0
      ),
    };
  }, [experts]);

  const filteredExperts = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();

    return experts.filter((expert) => {
      const credits = Number(expert.proposalSubmitCredits || 0);
      const matchesSearch =
        !keyword ||
        [expert.fullName, expert.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesCreditStatus =
        filters.creditStatus === "ALL" ||
        (filters.creditStatus === "HAS_CREDITS" && credits > 0) ||
        (filters.creditStatus === "NO_CREDITS" && credits <= 0);

      const matchesSubmitPermission =
        filters.submitPermission === "ALL" ||
        (filters.submitPermission === "CAN_SUBMIT" &&
          expert.canSubmitProposal) ||
        (filters.submitPermission === "CANNOT_SUBMIT" &&
          !expert.canSubmitProposal);

      return (
        matchesSearch &&
        matchesCreditStatus &&
        matchesSubmitPermission
      );
    });
  }, [experts, filters]);

  const loadExperts = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await adminProposalCreditService.getExpertCredits({
        search: "",
        profileReviewStatus: "ALL",
        availableForWork: "ALL",
      });

      setExperts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        getFriendlyError(
          err,
          "Proposal credit information is temporarily unavailable."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
  };

  const openManageModal = async (expert) => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");
      setModalError("");
      setAdjustErrors({});

      const data = await adminProposalCreditService.getExpertCreditById(
        expert.expertProfileId
      );

      setSelectedExpert(data || expert);
      setAdjustmentMode("ADD");
      setCreditAmount("");
      setAdjustReason("");
      setShowManageModal(true);
    } catch (err) {
      setError(
        getFriendlyError(err, "The selected expert could not be loaded.")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const closeManageModal = () => {
    if (actionLoading) return;

    setShowManageModal(false);
    setSelectedExpert(null);
    setAdjustmentMode("ADD");
    setCreditAmount("");
    setAdjustReason("");
    setModalError("");
    setAdjustErrors({});
    setConfirmation(EMPTY_CONFIRMATION);
  };

  const requestCreditAdjustment = (event) => {
    event.preventDefault();

    if (!selectedExpert) return;

    const errors = {};
    const amountText = String(creditAmount ?? "").trim();

    if (!amountText) {
      errors.creditAmount = "Credit amount is required.";
    } else if (!/^\d+$/.test(amountText)) {
      errors.creditAmount = "Credit amount must be a whole number.";
    } else if (Number(amountText) <= 0) {
      errors.creditAmount = "Credit amount must be greater than 0.";
    }

    if (!adjustReason.trim()) {
      errors.reason = "Reason is required.";
    } else if (adjustReason.trim().length < 5) {
      errors.reason = "Reason must be at least 5 characters.";
    }

    if (Object.keys(errors).length > 0) {
      setAdjustErrors(errors);
      setModalError("Please check the highlighted fields.");
      return;
    }

    const amount = Number(amountText);
    const signedDelta = adjustmentMode === "REMOVE" ? -amount : amount;

    setModalError("");
    setConfirmation({
      type: "ADJUST_CREDITS",
      title:
        adjustmentMode === "REMOVE"
          ? "Remove proposal credits?"
          : "Add proposal credits?",
      message:
        adjustmentMode === "REMOVE"
          ? `Remove ${amount} credit${amount === 1 ? "" : "s"} from ${
              selectedExpert.fullName || "this expert"
            }?`
          : `Add ${amount} credit${amount === 1 ? "" : "s"} to ${
              selectedExpert.fullName || "this expert"
            }?`,
      confirmLabel:
        adjustmentMode === "REMOVE" ? "Remove Credits" : "Add Credits",
      tone: adjustmentMode === "REMOVE" ? "red" : "cyan",
      payload: {
        signedDelta,
      },
    });
  };
  const executeConfirmation = async () => {
    if (!selectedExpert || !confirmation.type) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");
      setModalError("");

      if (confirmation.type === "ADJUST_CREDITS") {
        const updated = await adminProposalCreditService.adjustCredits(
          selectedExpert.expertProfileId,
          confirmation.payload.signedDelta,
          adjustReason.trim()
        );

        setSelectedExpert(updated);
        setCreditAmount("");
        setAdjustReason("");
        setAdjustErrors({});
        setMessage("Proposal credits updated successfully.");
      }

      setConfirmation(EMPTY_CONFIRMATION);
      await loadExperts();
    } catch (err) {
      setModalError(
        getFriendlyError(err, "The requested update could not be completed.")
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#151a22] via-[#111823] to-[#0b1018] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.3)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
            Admin / Proposal Credits
          </p>

          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">
            Expert Proposal Credits
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            Review proposal submission eligibility and adjust paid proposal
            credits for Expert accounts.
          </p>
        </section>

        {error && (
          <Alert
            type="danger"
            message={error}
            onClose={() => setError("")}
          />
        )}

        {message && (
          <Alert
            type="success"
            message={message}
            onClose={() => setMessage("")}
          />
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Experts"
            value={stats.totalExperts}
            icon="groups"
            tone="cyan"
          />

          <StatCard
            label="Experts With Credits"
            value={stats.expertsWithCredits}
            icon="confirmation_number"
            tone="purple"
          />

          <StatCard
            label="Can Submit Proposal"
            value={stats.canSubmitCount}
            icon="task_alt"
            tone="green"
          />

          <StatCard
            label="Total Proposal Credits"
            value={stats.totalCredits}
            icon="workspace_premium"
            tone="yellow"
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.22)]">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_200px_auto]">
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-gray-500">
                search
              </span>

              <input
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search expert name or email..."
                className="h-11 w-full rounded-xl border border-white/10 bg-[#0d1117] pl-10 pr-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-cyan-400/50"
              />
            </div>

            <FilterSelect
              name="creditStatus"
              value={filters.creditStatus}
              onChange={handleFilterChange}
              options={[
                ["ALL", "All credit balances"],
                ["HAS_CREDITS", "Has credits"],
                ["NO_CREDITS", "No credits"],
              ]}
            />

            <FilterSelect
              name="submitPermission"
              value={filters.submitPermission}
              onChange={handleFilterChange}
              options={[
                ["ALL", "All submission access"],
                ["CAN_SUBMIT", "Can submit"],
                ["CANNOT_SUBMIT", "Cannot submit"],
              ]}
            />

            <button
              type="button"
              onClick={handleReset}
              className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-gray-300 transition hover:border-cyan-400/30 hover:text-cyan-300"
            >
              Reset
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_14px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
            <div>
              <h2 className="font-black text-white">Expert Proposal Credits</h2>
              <p className="mt-1 text-xs text-gray-500">
                {filteredExperts.length} expert(s)
              </p>
            </div>

            <button
              type="button"
              onClick={loadExperts}
              disabled={loading || actionLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                refresh
              </span>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-gray-400">
              Loading proposal credits...
            </div>
          ) : filteredExperts.length === 0 ? (
            <div className="p-10 text-center">
              <span className="material-symbols-outlined mb-2 block text-4xl text-gray-600">
                search_off
              </span>
              <p className="font-bold text-white">No matching experts</p>
              <p className="mt-1 text-sm text-gray-500">
                Try changing the search or filter options.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-white/10 bg-white/[0.025]">
                  <tr>
                    <TableHead>Expert</TableHead>
                    <TableHead>Proposal Credits</TableHead>
                    <TableHead>Free Remaining</TableHead>
                    <TableHead>Submission Access</TableHead>
                    <TableHead align="right">Action</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {filteredExperts.map((expert) => (
                    <ExpertCreditRow
                      key={expert.expertProfileId}
                      expert={expert}
                      disabled={actionLoading}
                      onManage={() => openManageModal(expert)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showManageModal && selectedExpert && (
          <ManageCreditsModal
            expert={selectedExpert}
            adjustmentMode={adjustmentMode}
            creditAmount={creditAmount}
            adjustReason={adjustReason}
            adjustErrors={adjustErrors}
            modalError={modalError}
            loading={actionLoading}
            onClose={closeManageModal}
            onAdjustmentModeChange={setAdjustmentMode}
            onCreditAmountChange={(value) => {
              setCreditAmount(value);
              setModalError("");
              setAdjustErrors((prev) => ({
                ...prev,
                creditAmount: "",
              }));
            }}
            onAdjustReasonChange={(value) => {
              setAdjustReason(value);
              setModalError("");
              setAdjustErrors((prev) => ({
                ...prev,
                reason: "",
              }));
            }}
            onSubmitAdjustment={requestCreditAdjustment}
          />
        )}

        {confirmation.type && (
          <ConfirmationModal
            title={confirmation.title}
            message={confirmation.message}
            confirmLabel={confirmation.confirmLabel}
            tone={confirmation.tone}
            loading={actionLoading}
            onCancel={() =>
              !actionLoading && setConfirmation(EMPTY_CONFIRMATION)
            }
            onConfirm={executeConfirmation}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function ExpertCreditRow({ expert, disabled, onManage }) {
  const credits = Number(expert.proposalSubmitCredits || 0);
  const freeRemaining = Number(expert.freeProposalSubmitRemaining || 0);

  return (
    <tr className="transition hover:bg-white/[0.025]">
      <td className="px-4 py-3.5">
        <p className="font-bold text-white">
          {expert.fullName || "Unnamed Expert"}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {expert.email || "No email available"}
        </p>
      </td>

      <td className="px-4 py-3.5">
        <span className="text-lg font-black text-white">{credits}</span>
      </td>
      <td className="px-4 py-3.5">
        <div>
          <span className="text-lg font-black text-white">
            {freeRemaining}
          </span>
          <p className="mt-1 text-xs text-gray-500">
            System managed
          </p>
        </div>
      </td>

      <td className="px-4 py-3.5">
        <SimpleStatus
          active={Boolean(expert.canSubmitProposal)}
          activeLabel="Can submit"
          inactiveLabel="Cannot submit"
        />
      </td>

      <td className="px-4 py-3.5 text-right">
        <button
          type="button"
          onClick={onManage}
          disabled={disabled}
          className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-xs font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:opacity-50"
        >
          Manage Credits
        </button>
      </td>
    </tr>
  );
}

function ManageCreditsModal({
  expert,
  adjustmentMode,
  creditAmount,
  adjustReason,
  adjustErrors,
  modalError,
  loading,
  onClose,
  onAdjustmentModeChange,
  onCreditAmountChange,
  onAdjustReasonChange,
  onSubmitAdjustment,
}) {
  const freeRemaining = Number(expert.freeProposalSubmitRemaining || 0);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-4 py-5 backdrop-blur-sm">
      <style>
        {`
          .proposal-credit-modal-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .proposal-credit-modal-scroll::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
          }
        `}
      </style>

      <div className="proposal-credit-modal-scroll max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111720] shadow-[0_30px_100px_rgba(0,0,0,0.72)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
              Manage Proposal Credits
            </p>
            <h2 className="mt-1.5 truncate text-lg font-black text-white">
              {expert.fullName || "Expert"}
            </h2>
            <p className="mt-1 truncate text-xs text-gray-500">
              {expert.email || "No email available"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[21px]">close</span>
          </button>
        </div>

        <div className="p-5">
          {modalError && (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {modalError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <CompactMetric
              label="Credits"
              value={expert.proposalSubmitCredits || 0}
            />
            <CompactMetric
              label="Free Remaining"
              value={freeRemaining}
            />
            <CompactMetric
              label="Can Submit"
              value={expert.canSubmitProposal ? "Yes" : "No"}
            />
          </div>
            <form
              onSubmit={onSubmitAdjustment}
              className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4"
            >
              <div>
                <h3 className="text-sm font-black text-white">
                  Adjust Proposal Credits
                </h3>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Add credits for support or remove credits when a correction
                  is required.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <ModeButton
                  active={adjustmentMode === "ADD"}
                  label="Add Credits"
                  icon="add"
                  tone="green"
                  onClick={() => onAdjustmentModeChange("ADD")}
                />

                <ModeButton
                  active={adjustmentMode === "REMOVE"}
                  label="Remove Credits"
                  icon="remove"
                  tone="red"
                  onClick={() => onAdjustmentModeChange("REMOVE")}
                />
              </div>

              <div className="mt-4">
                <FieldLabel required>Credit Amount</FieldLabel>
                <input
                  type="text"
                  inputMode="numeric"
                  value={creditAmount}
                  onChange={(event) =>
                    onCreditAmountChange(event.target.value)
                  }
                  placeholder="Enter number of credits"
                  className={`h-11 w-full rounded-xl border bg-[#0b1017] px-4 text-sm text-white outline-none placeholder:text-gray-600 ${
                    adjustErrors.creditAmount
                      ? "border-red-400/70"
                      : "border-white/10 focus:border-cyan-400/50"
                  }`}
                />
                {adjustErrors.creditAmount && (
                  <FieldError>{adjustErrors.creditAmount}</FieldError>
                )}
              </div>

              <div className="mt-4">
                <FieldLabel required>Reason</FieldLabel>
                <textarea
                  rows={3}
                  value={adjustReason}
                  onChange={(event) =>
                    onAdjustReasonChange(event.target.value)
                  }
                  placeholder="Explain why this credit balance is being changed"
                  className={`w-full resize-none rounded-xl border bg-[#0b1017] px-4 py-3 text-sm leading-5 text-white outline-none placeholder:text-gray-600 ${
                    adjustErrors.reason
                      ? "border-red-400/70"
                      : "border-white/10 focus:border-cyan-400/50"
                  }`}
                />
                {adjustErrors.reason && (
                  <FieldError>{adjustErrors.reason}</FieldError>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-black transition hover:bg-cyan-300 disabled:opacity-50"
              >
                Review Credit Change
              </button>
            </form>
        </div>
      </div>
    </div>
  );
}

function ConfirmationModal({
  title,
  message,
  confirmLabel,
  tone,
  loading,
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
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#151a22] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.72)]">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300">
          <span className="material-symbols-outlined">fact_check</span>
        </div>

        <h2 className="text-lg font-black text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">{message}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
          >
            Review Again
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl border px-4 py-2.5 text-sm font-black transition disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? "Updating..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
            toneClass[tone] || toneClass.cyan
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
      </div>
    </article>
  );
}

function CompactMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1017] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-600">
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

function ModeButton({ active, label, icon, tone, onClick }) {
  const activeClass =
    tone === "red"
      ? "border-red-400/50 bg-red-400/10 text-red-300"
      : "border-green-400/50 bg-green-400/10 text-green-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-black transition ${
        active
          ? activeClass
          : "border-white/10 bg-white/[0.025] text-gray-500 hover:text-white"
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </button>
  );
}

function FilterSelect({ name, value, onChange, options }) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="h-11 rounded-xl border border-white/10 bg-[#0d1117] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-400/50"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function SimpleStatus({
  active,
  activeLabel,
  inactiveLabel,
}) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-1 text-xs font-bold text-green-300">
      <span className="material-symbols-outlined text-[14px]">check</span>
      {activeLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-xs font-bold text-red-300">
      <span className="material-symbols-outlined text-[14px]">close</span>
      {inactiveLabel}
    </span>
  );
}

function TableHead({ children, align = "left" }) {
  return (
    <th
      className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">
      {children}
      {required && <span className="ml-1 text-red-400">*</span>}
    </label>
  );
}

function FieldError({ children }) {
  return <p className="mt-2 text-xs font-semibold text-red-300">{children}</p>;
}

function Alert({ type, message, onClose }) {
  const style =
    type === "success"
      ? "border-green-400/30 bg-green-400/10 text-green-200"
      : "border-red-400/30 bg-red-400/10 text-red-200";

  return (
    <div className={`rounded-xl border px-4 py-3 ${style}`}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className="text-xs font-black opacity-70 hover:opacity-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function getFriendlyError(err, fallback) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to manage proposal credits.";
  }

  if (status === 404) {
    return "Proposal credit management is temporarily unavailable.";
  }

  if (typeof data === "string" && data.trim()) return data;

  return (
    data?.message ||
    data?.title ||
    data?.detail ||
    err?.message ||
    fallback
  );
}