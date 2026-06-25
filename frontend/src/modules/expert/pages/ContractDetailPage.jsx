import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import contractService from "../../../services/contract.service";

export default function ContractDetailPage() {
  const { contractId, proposalId } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [milestoneDrafts, setMilestoneDrafts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const realContractId = contract?.contractId || contractId;
  const status = normalizeStatus(contract?.status);

  const canRespond = useMemo(() => {
    return canAcceptContract(status) || canRejectContract(status);
  }, [status]);

  useEffect(() => {
    loadContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, proposalId]);

  const loadContract = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      let contractData = null;

      if (contractId) {
        contractData = await contractService.getContractById(contractId);
      } else if (proposalId) {
        contractData = await contractService.getContractByProposalId(proposalId);
      } else {
        throw new Error("Missing contract id or proposal id.");
      }

      setContract(contractData);

      const id = contractData?.contractId || contractId;

      if (id) {
        await loadMilestoneDrafts(id, contractData);
      } else {
        setMilestoneDrafts(contractData?.milestoneDrafts || []);
      }
    } catch (err) {
      console.error("LOAD CONTRACT ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load contract detail."));
      setContract(null);
      setMilestoneDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMilestoneDrafts = async (id, contractData = contract) => {
    try {
      const data = await contractService.getContractMilestoneDrafts(id);
      setMilestoneDrafts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("LOAD MILESTONE DRAFTS WARNING:", err?.response?.data || err);
      setMilestoneDrafts(contractData?.milestoneDrafts || []);
    }
  };

  const handleAcceptContract = async () => {
    const ok = window.confirm("Are you sure you want to accept this contract?");

    if (!ok) return;

    try {
      setActionLoading("accept");
      setError("");
      setMessage("");

      const updatedContract = await contractService.confirmContract(
        realContractId
      );

      setContract(updatedContract);

      if (updatedContract?.contractId) {
        await loadMilestoneDrafts(updatedContract.contractId, updatedContract);
      }

      setMessage("Contract accepted successfully.");
    } catch (err) {
      console.error("ACCEPT CONTRACT ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot accept contract."));
    } finally {
      setActionLoading("");
    }
  };

  const handleRejectContract = async () => {
    if (!rejectReason.trim()) {
      setError("Please enter a reason before rejecting this contract.");
      return;
    }

    const ok = window.confirm("Are you sure you want to reject this contract?");

    if (!ok) return;

    try {
      setActionLoading("reject");
      setError("");
      setMessage("");

      const updatedContract = await contractService.cancelContract(
        realContractId,
        {
          reason: rejectReason,
        }
      );

      setContract(updatedContract);
      setShowRejectBox(false);
      setRejectReason("");

      if (updatedContract?.contractId) {
        await loadMilestoneDrafts(updatedContract.contractId, updatedContract);
      }

      setMessage("Contract rejected successfully.");
    } catch (err) {
      console.error("REJECT CONTRACT ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot reject contract."));
    } finally {
      setActionLoading("");
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
      <div className="px-5 py-8 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => {
              if (contract.proposalId) {
                navigate(`/expert/proposals/${contract.proposalId}`);
                return;
              }

              navigate("/expert/proposals");
            }}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to proposal
          </button>

          <section className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                  Contract Detail
                </p>

                <h1 className="text-2xl font-bold text-white md:text-3xl">
                  {formatDisplayValue(contract.title || contract.jobTitle)}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Review the contract terms and milestone drafts before making
                  your decision.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusBadge status={status} />

                  {contract.contractId && (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-gray-300">
                      Contract #{contract.contractId}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {contract.proposalId && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/expert/proposals/${contract.proposalId}`)
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white"
                  >
                    Proposal
                  </button>
                )}

                {contract.projectId && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/expert/projects/${contract.projectId}`)
                    }
                    className="rounded-xl border border-green-400/50 bg-green-400/10 px-4 py-2.5 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
                  >
                    Project
                  </button>
                )}
              </div>
            </div>
          </section>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Contract error" message={error} />
          )}

          {isContractRejected(status) && contract.cancelReason && (
            <Alert
              type="warning"
              title="Contract rejected"
              message={contract.cancelReason}
            />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <main className="space-y-6">
              <Card title="Project Scope">
                <TextValue
                  value={
                    contract.projectScope ||
                    contract.scopeOfWork ||
                    contract.description ||
                    "No project scope provided."
                  }
                />
              </Card>

              <Card title="Contract Terms">
                <TextValue
                  value={
                    contract.terms ||
                    contract.contractTerms ||
                    contract.paymentTerms ||
                    "No contract terms provided."
                  }
                />
              </Card>

              {contract.deliverables && (
                <Card title="Deliverables">
                  <TextValue value={contract.deliverables} />
                </Card>
              )}

              {contract.acceptanceCriteria && (
                <Card title="Acceptance Criteria">
                  <TextValue value={contract.acceptanceCriteria} />
                </Card>
              )}

              {contract.chatSummary && (
                <Card title="Client Message">
                  <TextValue value={contract.chatSummary} />
                </Card>
              )}

              <Card title={`Milestone Drafts (${milestoneDrafts.length})`}>
                {milestoneDrafts.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No milestone drafts returned from backend.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {milestoneDrafts.map((milestone, index) => (
                      <MilestoneDraftCard
                        key={
                          milestone.milestoneDraftId ||
                          milestone.contractMilestoneDraftId ||
                          milestone.id ||
                          index
                        }
                        milestone={milestone}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </Card>

              {canRespond && (
                <Card title="Your Decision">
                  <p className="mb-5 text-sm leading-6 text-gray-400">
                    Accept this contract if the terms and milestone drafts are
                    correct. Reject it if the client needs to revise the
                    contract.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {canAcceptContract(status) && (
                      <button
                        type="button"
                        disabled={actionLoading === "accept"}
                        onClick={handleAcceptContract}
                        className="rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === "accept"
                          ? "Accepting..."
                          : "Accept Contract"}
                      </button>
                    )}

                    {canRejectContract(status) && (
                      <button
                        type="button"
                        disabled={actionLoading === "reject"}
                        onClick={() => setShowRejectBox((prev) => !prev)}
                        className="rounded-xl border border-red-400/50 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reject Contract
                      </button>
                    )}
                  </div>

                  {showRejectBox && (
                    <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-red-200">
                        Reject Reason
                      </label>

                      <textarea
                        value={rejectReason}
                        onChange={(event) => {
                          setRejectReason(event.target.value);
                          setError("");
                        }}
                        rows={4}
                        placeholder="Explain why you reject this contract."
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-red-300"
                      />

                      <div className="mt-4 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRejectBox(false);
                            setRejectReason("");
                          }}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 transition hover:text-white"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          disabled={actionLoading === "reject"}
                          onClick={handleRejectContract}
                          className="rounded-xl border border-red-400/50 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === "reject"
                            ? "Rejecting..."
                            : "Confirm Reject"}
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </main>

            <aside className="space-y-6">
              <Card title="Summary">
                <Info label="Client" value={contract.clientName || "Client"} />
                <Info label="Expert" value={contract.expertName || "Expert"} />

                <Info
                  label="Final Price"
                  value={formatMoney(contract.finalPrice || contract.totalAmount)}
                />

                <Info
                  label="Expert Amount"
                  value={formatMoney(contract.expertAmount)}
                />

                <Info
                  label="Platform Fee"
                  value={formatMoney(contract.platformFee)}
                />

                <Info
                  label="Timeline"
                  value={`${
                    contract.finalTimelineDays ||
                    contract.timelineDays ||
                    contract.durationDays ||
                    0
                  } days`}
                />

                <Info label="Status" value={getContractStatusLabel(status)} />

                {contract.proposalId && (
                  <Info label="Proposal ID" value={`#${contract.proposalId}`} />
                )}

                {contract.projectId && (
                  <Info label="Project ID" value={`#${contract.projectId}`} />
                )}
              </Card>

              <Card title="Dates">
                <Info label="Created At" value={formatDate(contract.createdAt)} />

                {contract.updatedAt && (
                  <Info label="Updated At" value={formatDate(contract.updatedAt)} />
                )}

                {contract.startDate && (
                  <Info label="Start Date" value={formatDate(contract.startDate)} />
                )}

                {contract.endDate && (
                  <Info label="End Date" value={formatDate(contract.endDate)} />
                )}

                {contract.confirmedAt && (
                  <Info
                    label="Confirmed At"
                    value={formatDate(contract.confirmedAt)}
                  />
                )}

                {contract.cancelledAt && (
                  <Info
                    label="Cancelled At"
                    value={formatDate(contract.cancelledAt)}
                  />
                )}
              </Card>

              <section className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5 text-cyan-100">
                <p className="font-bold">Contract flow</p>
                <p className="mt-2 text-sm leading-6">
                  Expert only reviews, accepts, or rejects the contract. Contract
                  creation and draft editing belong to the client flow.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-5">
      <h2 className="mb-4 text-lg font-extrabold text-white">{title}</h2>
      {children}
    </section>
  );
}

function MilestoneDraftCard({ milestone, index }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
            Milestone {milestone.orderIndex || index + 1}
          </p>

          <h3 className="mt-1 text-base font-bold text-white">
            {formatDisplayValue(milestone.title || "Untitled Milestone")}
          </h3>
        </div>

        {milestone.status && (
          <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase text-gray-300">
            {milestone.status}
          </span>
        )}
      </div>

      <TextValue value={milestone.description || "No description."} />

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Info
          label="Expected Deliverable"
          value={milestone.expectedDeliverable || "N/A"}
        />

        <Info
          label="Acceptance Criteria"
          value={milestone.acceptanceCriteria || "N/A"}
        />

        <Info label="Amount" value={formatMoney(milestone.amount)} />

        <Info
          label="Deadline Offset"
          value={
            milestone.deadlineOffsetDays
              ? `${milestone.deadlineOffsetDays} days`
              : "N/A"
          }
        />

        <Info
          label="Revision Limit"
          value={
            milestone.revisionLimit !== undefined &&
            milestone.revisionLimit !== null
              ? `${milestone.revisionLimit}`
              : "N/A"
          }
        />
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-white">
        {formatDisplayValue(value)}
      </p>
    </div>
  );
}

function TextValue({ value }) {
  return (
    <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
      {formatDisplayValue(value)}
    </p>
  );
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  const style = isContractAccepted(normalized)
    ? "border-green-400/30 bg-green-400/10 text-green-300"
    : isContractRejected(normalized)
    ? "border-red-400/30 bg-red-400/10 text-red-300"
    : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {getContractStatusLabel(normalized)}
    </span>
  );
}

function Alert({ type, title, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : type === "warning"
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 text-sm ${style}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1">{formatDisplayValue(message)}</p>
    </div>
  );
}

function normalizeStatus(status) {
  return String(status || "DRAFT").trim().toUpperCase();
}

function isContractAccepted(status) {
  return ["ACCEPTED", "CONFIRMED", "ACTIVE", "SIGNED"].includes(
    normalizeStatus(status)
  );
}

function isContractRejected(status) {
  return ["REJECTED", "CANCELLED", "CANCELED"].includes(normalizeStatus(status));
}

function canAcceptContract(status) {
  return ["DRAFT", "PENDING", "WAITING_EXPERT", "CLIENT_CONFIRMED"].includes(
    normalizeStatus(status)
  );
}

function canRejectContract(status) {
  return ["DRAFT", "PENDING", "WAITING_EXPERT", "CLIENT_CONFIRMED"].includes(
    normalizeStatus(status)
  );
}

function getContractStatusLabel(status) {
  const value = normalizeStatus(status);

  const map = {
    DRAFT: "Draft",
    PENDING: "Pending",
    WAITING_EXPERT: "Waiting Expert",
    CLIENT_CONFIRMED: "Waiting Expert",
    ACCEPTED: "Accepted",
    CONFIRMED: "Confirmed",
    ACTIVE: "Active",
    SIGNED: "Signed",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
    CANCELED: "Cancelled",
  };

  return map[value] || value;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatDate(value) {
  if (!value) return "N/A";

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatDisplayValue(value) {
  if (value === undefined || value === null || value === "") return "N/A";

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatDisplayValue).join(", ") : "N/A";
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.Name ||
      value.title ||
      value.Title ||
      value.label ||
      value.Label ||
      value.status ||
      value.Status ||
      value.message ||
      value.Message ||
      "N/A"
    );
  }

  return String(value);
}

function getFriendlyError(error, fallback = "Something went wrong.") {
  const payload =
    error?.originalError?.response?.data ||
    error?.response?.data ||
    error?.data ||
    error;

  const message =
    typeof payload === "string"
      ? payload
      : payload?.message ||
        payload?.title ||
        payload?.detail ||
        payload?.error ||
        error?.message ||
        "";

  if (message.toLowerCase().includes("not found")) {
    return "Contract could not be found.";
  }

  if (message.toLowerCase().includes("confirm")) {
    return "This contract cannot be accepted right now.";
  }

  if (message.toLowerCase().includes("cancel")) {
    return "This contract cannot be rejected right now.";
  }

  return message || fallback;
}