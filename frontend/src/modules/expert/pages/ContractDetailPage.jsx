import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import contractService from "../../../services/contract.service";

const initialCancelForm = {
  reason: "",
};

export default function ContractDetailPage() {
  const { contractId, proposalId } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [milestoneDrafts, setMilestoneDrafts] = useState([]);

  const [cancelForm, setCancelForm] = useState(initialCancelForm);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    loadContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, proposalId]);

  const status = String(contract?.status || "").toUpperCase();

  const totalMilestoneAmount = useMemo(() => {
    return milestoneDrafts.reduce(
      (sum, item) => sum + Number(item.amount || item.budget || 0),
      0
    );
  }, [milestoneDrafts]);

  const canConfirm = canConfirmContract(status);
  const canCancel = canCancelContract(status);

  const loadContract = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      let contractData = null;

      if (contractId) {
        contractData = await contractService.getContract(contractId);
      } else if (proposalId) {
        contractData = await contractService.getContractByProposal(proposalId);
      } else {
        throw new Error("Missing contract information.");
      }

      setContract(contractData);

      const resolvedContractId = contractData?.contractId || contractId;

      if (resolvedContractId) {
        const draftsResult = await Promise.allSettled([
          contractService.getContractMilestoneDrafts(resolvedContractId),
        ]);

        if (draftsResult[0].status === "fulfilled") {
          setMilestoneDrafts(
            Array.isArray(draftsResult[0].value) ? draftsResult[0].value : []
          );
        } else {
          setMilestoneDrafts([]);
        }
      }
    } catch (err) {
      console.error("LOAD CONTRACT DETAIL ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot load contract detail."));
      setContract(null);
      setMilestoneDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmContract = async () => {
    const ok = window.confirm(
      "Are you sure you want to confirm this contract? After confirmation, the project can move forward."
    );

    if (!ok) return;

    try {
      setConfirming(true);
      setError("");
      setMessage("");

      const updated = await contractService.confirmContract(contract.contractId);

      if (updated?.contractId) {
        setContract(updated);
      } else {
        await loadContract();
      }

      setMessage("Contract confirmed successfully.");
    } catch (err) {
      console.error("CONFIRM CONTRACT ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot confirm contract."));
    } finally {
      setConfirming(false);
    }
  };

  const openCancelModal = () => {
    setCancelForm(initialCancelForm);
    setCancelError("");
    setError("");
    setMessage("");
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    if (cancelling) return;

    setCancelForm(initialCancelForm);
    setCancelError("");
    setShowCancelModal(false);
  };

  const updateCancelField = (name, value) => {
    setCancelError("");

    setCancelForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancelContract = async (event) => {
    event.preventDefault();

    setCancelError("");
    setError("");
    setMessage("");

    if (!String(cancelForm.reason || "").trim()) {
      setCancelError("Cancel reason is required.");
      return;
    }

    try {
      setCancelling(true);

      const updated = await contractService.cancelContract(
        contract.contractId,
        cancelForm
      );

      if (updated?.contractId) {
        setContract(updated);
      } else {
        await loadContract();
      }

      setShowCancelModal(false);
      setCancelForm(initialCancelForm);
      setMessage("Contract cancelled successfully.");
    } catch (err) {
      console.error("CANCEL CONTRACT ERROR:", err?.response?.data || err);

      setCancelError(getFriendlyError(err, "Cannot cancel contract."));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading contract detail...
        </div>
      </ExpertLayout>
    );
  }

  if (!contract) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert
              type="danger"
              title="Contract not found"
              message={error || "Cannot load contract detail."}
            />

            <button
              type="button"
              onClick={() => navigate("/expert/proposals")}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Back to Proposals
            </button>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back
          </button>

          <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="relative p-6 md:p-8">
              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-purple-400/10 blur-3xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                    Contract Detail
                  </p>

                  <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
                    {contract.title || "Project Contract"}
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400">
                    Review the contract terms, milestones, budget, and timeline
                    before confirming your agreement.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <StatusBadge status={status} />

                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                      {contract.clientName || "Client"}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                      {milestoneDrafts.length} milestone(s)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {contract.projectId && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/expert/projects/${contract.projectId}`)
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-white/20 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        work
                      </span>
                      View Project
                    </button>
                  )}

                  {contract.proposalId && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/expert/proposals/${contract.proposalId}`)
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-white/20 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        description
                      </span>
                      View Proposal
                    </button>
                  )}

                  {canConfirm && (
                    <button
                      type="button"
                      onClick={handleConfirmContract}
                      disabled={confirming || cancelling}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        check_circle
                      </span>
                      {confirming ? "Confirming..." : "Confirm Contract"}
                    </button>
                  )}

                  {canCancel && (
                    <button
                      type="button"
                      onClick={openCancelModal}
                      disabled={confirming || cancelling}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        cancel
                      </span>
                      Cancel Contract
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Contract error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="Contract Scope">
                <TextContent
                  value={contract.description}
                  empty="No contract scope provided."
                />
              </Card>

              <Card title="Contract Terms">
                <TextContent
                  value={contract.terms}
                  empty="No contract terms provided."
                />
              </Card>

              {contract.cancellationReason && (
                <Card title="Cancellation Reason">
                  <TextContent
                    value={contract.cancellationReason}
                    empty="No cancellation reason provided."
                  />
                </Card>
              )}

              <Card title="Milestone Drafts">
                {milestoneDrafts.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-500">
                    No milestone drafts available.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {milestoneDrafts.map((milestone, index) => (
                      <MilestoneDraftItem
                        key={milestone.milestoneDraftId || index}
                        milestone={milestone}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </main>

            <aside className="space-y-6">
              <Card title="Contract Summary">
                <Info
                  label="Total Budget"
                  value={formatMoney(contract.totalBudget || contract.budget)}
                />

                <Info
                  label="Milestone Total"
                  value={formatMoney(totalMilestoneAmount)}
                />

                <Info
                  label="Timeline"
                  value={
                    contract.durationDays
                      ? `${contract.durationDays} days`
                      : "Not specified"
                  }
                />

                <Info label="Status" value={getContractStatusLabel(status)} />

                <Info
                  label="Created At"
                  value={formatDate(contract.createdAt)}
                />

                <Info
                  label="Confirmed At"
                  value={formatDate(contract.confirmedAt)}
                />
              </Card>

              <Card title="Next Step">
                <NextStep status={status} />
              </Card>
            </aside>
          </div>
        </div>
      </div>

      {showCancelModal && (
        <CancelContractModal
          formData={cancelForm}
          loading={cancelling}
          error={cancelError}
          onChange={updateCancelField}
          onClose={closeCancelModal}
          onSubmit={handleCancelContract}
        />
      )}
    </ExpertLayout>
  );
}

function CancelContractModal({
  formData,
  loading,
  error,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-5">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#11161f] shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">
                Cancel Contract
              </p>

              <h2 className="text-xl font-extrabold text-white">
                Cancel this contract
              </h2>

              <p className="mt-1 text-xs leading-5 text-gray-400">
                Provide a reason before cancelling this contract.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-gray-400 transition hover:text-white disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <Textarea
            label="Reason"
            value={formData.reason}
            onChange={(value) => onChange("reason", value)}
            placeholder="Explain why you want to cancel this contract..."
            rows={5}
          />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Keep Contract
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl border border-red-400/50 bg-red-400/10 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MilestoneDraftItem({ milestone, index }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
            Milestone {milestone.orderIndex || index + 1}
          </div>

          <h3 className="text-lg font-extrabold text-white">
            {milestone.title || `Milestone ${index + 1}`}
          </h3>
        </div>

        <p className="shrink-0 text-lg font-black text-green-300">
          {formatMoney(milestone.amount || milestone.budget)}
        </p>
      </div>

      <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
        {milestone.description || "No milestone description."}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Info
          label="Duration"
          value={
            milestone.durationDays
              ? `${milestone.durationDays} days`
              : "Not specified"
          }
        />

        <Info label="Due Date" value={formatDate(milestone.dueDate)} />
      </div>
    </article>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
      <h2 className="mb-4 text-xl font-extrabold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function TextContent({ value, empty }) {
  return (
    <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
      {value || empty}
    </p>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "DRAFT").toUpperCase();

  const style =
    value === "CONFIRMED" ||
    value === "ACTIVE" ||
    value === "SIGNED" ||
    value === "ACCEPTED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : value === "CANCELLED" || value === "REJECTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : value === "COMPLETED"
      ? "border-purple-400/30 bg-purple-400/10 text-purple-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {getContractStatusLabel(value)}
    </span>
  );
}

function NextStep({ status }) {
  const value = String(status || "").toUpperCase();

  let text =
    "Review the contract terms and milestone plan. Confirm the contract when everything looks correct.";

  if (
    value === "CONFIRMED" ||
    value === "ACTIVE" ||
    value === "SIGNED" ||
    value === "ACCEPTED"
  ) {
    text =
      "The contract has been confirmed. You can continue tracking the project and milestone progress.";
  }

  if (value === "COMPLETED") {
    text = "This contract has been completed.";
  }

  if (value === "CANCELLED" || value === "REJECTED") {
    text =
      "This contract is no longer active. Review the cancellation reason if available.";
  }

  return <p className="text-sm leading-7 text-gray-400">{text}</p>;
}

function Textarea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>

      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm leading-6 text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF]"
      />
    </label>
  );
}

function Alert({ type, title, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 text-sm ${style}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function canConfirmContract(status) {
  const value = String(status || "").toUpperCase();

  return [
    "DRAFT",
    "PENDING",
    "PENDING_CONFIRMATION",
    "WAITING_CONFIRMATION",
    "SENT",
    "CREATED",
  ].includes(value);
}

function canCancelContract(status) {
  const value = String(status || "").toUpperCase();

  return ![
    "CANCELLED",
    "REJECTED",
    "COMPLETED",
    "CONFIRMED",
    "ACTIVE",
    "SIGNED",
    "ACCEPTED",
  ].includes(value);
}

function getContractStatusLabel(status) {
  const value = String(status || "").toUpperCase();

  if (value === "PENDING_CONFIRMATION") return "Pending Confirmation";
  if (value === "WAITING_CONFIRMATION") return "Waiting Confirmation";
  if (value === "DRAFT") return "Draft";
  if (value === "PENDING") return "Pending";
  if (value === "SENT") return "Sent";
  if (value === "CREATED") return "Created";
  if (value === "CONFIRMED") return "Confirmed";
  if (value === "ACTIVE") return "Active";
  if (value === "SIGNED") return "Signed";
  if (value === "ACCEPTED") return "Accepted";
  if (value === "COMPLETED") return "Completed";
  if (value === "CANCELLED") return "Cancelled";
  if (value === "REJECTED") return "Rejected";

  return value || "Draft";
}

function formatMoney(value) {
  const number = Number(value || 0);

  if (!number) return "$0";

  return `$${number.toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}