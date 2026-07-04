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
  const [acceptSuccessModal, setAcceptSuccessModal] = useState(null);

  const [showDeclineBox, setShowDeclineBox] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const realContractId = getContractId(contract) || contractId;
  const realProposalId = getProposalId(contract) || proposalId;
  const realJobId = getJobId(contract);
  const realProjectId = getProjectId(contract);

  const status = normalizeStatus(
    getField(contract, ["status", "Status"], "DRAFT")
  );

  const canRespond = useMemo(() => {
    if (!realContractId) return false;
    return canAcceptContract(status, contract) || canDeclineContract(status, contract);
  }, [status, contract, realContractId]);

  const contractTitle = getField(
    contract,
    [
      "jobTitle",
      "JobTitle",
      "projectTitle",
      "ProjectTitle",
      "title",
      "Title",
      "job.title",
      "Job.Title",
      "project.title",
      "Project.Title",
    ],
    "Contract"
  );

  const projectScope = getField(
    contract,
    [
      "projectScope",
      "ProjectScope",
      "scopeOfWork",
      "ScopeOfWork",
      "description",
      "Description",
      "job.description",
      "Job.Description",
      "project.description",
      "Project.Description",
    ],
    ""
  );

  const contractTerms = getField(
    contract,
    [
      "paymentTerms",
      "PaymentTerms",
      "contractTerms",
      "ContractTerms",
      "terms",
      "Terms",
      "note",
      "Note",
    ],
    ""
  );

  const deliverables = getField(
    contract,
    [
      "deliverables",
      "Deliverables",
      "expectedDeliverables",
      "ExpectedDeliverables",
      "expectedOutputs",
      "ExpectedOutputs",
    ],
    ""
  );

  const acceptanceCriteria = getField(
    contract,
    ["acceptanceCriteria", "AcceptanceCriteria", "criteria", "Criteria"],
    ""
  );

  const clientMessage = getField(
    contract,
    [
      "chatSummary",
      "ChatSummary",
      "clientMessage",
      "ClientMessage",
      "message",
      "Message",
    ],
    ""
  );

  const clientName = getField(
    contract,
    ["clientName", "ClientName", "client.fullName", "Client.FullName"],
    "Client"
  );

  const expertName = getField(
    contract,
    ["expertName", "ExpertName", "expert.fullName", "Expert.FullName"],
    "Expert"
  );

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

      const id = getContractId(contractData) || contractId;
      const fallbackMilestones = getMilestonesFromContract(contractData);

      if (id) {
        const apiMilestones = await loadMilestoneDrafts(id);
        setMilestoneDrafts(
          apiMilestones.length > 0 ? apiMilestones : fallbackMilestones
        );
      } else {
        setMilestoneDrafts(fallbackMilestones);
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

  const loadMilestoneDrafts = async (id) => {
    try {
      if (!id) return [];

      const data = await contractService.getContractMilestoneDrafts(id);

      return Array.isArray(data)
        ? data.map((item, index) => normalizeMilestone(item, index))
        : [];
    } catch (err) {
      console.warn("LOAD MILESTONE DRAFTS WARNING:", err?.response?.data || err);
      return [];
    }
  };

  const refreshAfterAction = async (updatedContract) => {
    if (!updatedContract) return;

    setContract(updatedContract);

    const id = getContractId(updatedContract) || realContractId;
    const fallbackMilestones = getMilestonesFromContract(updatedContract);

    if (id) {
      const apiMilestones = await loadMilestoneDrafts(id);
      setMilestoneDrafts(
        apiMilestones.length > 0 ? apiMilestones : fallbackMilestones
      );
    } else {
      setMilestoneDrafts(fallbackMilestones);
    }
  };

  const handleAcceptContract = async () => {
    if (!realContractId) {
      setError("Cannot accept this contract because contract id is missing.");
      return;
    }

    const ok = window.confirm("Are you sure you want to accept this contract?");
    if (!ok) return;

    try {
      setActionLoading("accept");
      setError("");
      setMessage("");

      const updatedContract = await contractService.confirmContract(realContractId);

      await refreshAfterAction(updatedContract);

      const projectId = getProjectId(updatedContract) || realProjectId;

      setAcceptSuccessModal({ projectId });

      setTimeout(() => {
        if (projectId) {
          navigate(`/expert/projects/${projectId}`, { replace: true });
          return;
        }

        navigate("/expert/projects", { replace: true });
      }, 1200);
    } catch (err) {
      console.error("ACCEPT CONTRACT ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot accept contract right now."));
    } finally {
      setActionLoading("");
    }
  };

  const handleDeclineContract = async () => {
    if (!realContractId) {
      setError("Cannot decline this contract because contract id is missing.");
      return;
    }

    if (!declineReason.trim()) {
      setError("Please enter a reason before declining this contract.");
      return;
    }

    const ok = window.confirm("Are you sure you want to decline this contract?");
    if (!ok) return;

    try {
      setActionLoading("decline");
      setError("");
      setMessage("");

      const updatedContract = await contractService.cancelContract(realContractId, {
        reason: declineReason.trim(),
      });

      await refreshAfterAction(updatedContract);

      setShowDeclineBox(false);
      setDeclineReason("");
      setMessage("Contract declined successfully.");
    } catch (err) {
      console.error("DECLINE CONTRACT ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot decline contract right now."));
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
              if (realProposalId) {
                navigate(`/expert/proposals/${realProposalId}`);
                return;
              }

              navigate("/expert/proposals");
            }}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to proposal
          </button>

          <section className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <StatusBadge status={status} contract={contract} />

                  {realContractId && (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-gray-300">
                      Contract #{realContractId}
                    </span>
                  )}

                  {getField(
                    contract,
                    ["sourceProposalVersionNumber", "SourceProposalVersionNumber"],
                    ""
                  ) && (
                    <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-bold text-purple-300">
                      Proposal Version{" "}
                      {getField(
                        contract,
                        ["sourceProposalVersionNumber", "SourceProposalVersionNumber"],
                        ""
                      )}
                    </span>
                  )}
                </div>

                <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                  Contract Review
                </p>

                <h1 className="max-w-3xl text-2xl font-bold text-white md:text-3xl">
                  {formatDisplayValue(contractTitle)}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Please review the contract details carefully. You can accept
                  or decline only after the client sends the contract for your
                  confirmation.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <QuickStat label="Client" value={clientName} />
                  <QuickStat
                    label="Timeline"
                    value={`${getTimelineDays(contract)} days`}
                  />
                  <QuickStat
                    label="Your Earnings"
                    value={formatMoney(getExpertReceivable(contract))}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 lg:w-[320px]">
                <p className="text-sm font-bold text-cyan-100">
                  What happens next?
                </p>

                <p className="mt-2 text-sm leading-6 text-cyan-100/80">
                  {canRespond
                    ? "The client has sent this contract for your confirmation. Review it carefully before accepting or declining."
                    : isDraftContract(status)
                      ? "This is still a draft contract. You can review the details, but you cannot accept or decline it until the client sends it to you."
                      : "This contract is no longer waiting for your response."}
                </p>

                {canRespond && (
                  <div className="mt-4 flex flex-col gap-2">
                    {canAcceptContract(status, contract) && (
                      <button
                        type="button"
                        disabled={actionLoading === "accept"}
                        onClick={handleAcceptContract}
                        className="rounded-xl border border-green-400/50 bg-green-400/10 px-4 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === "accept"
                          ? "Accepting..."
                          : "Accept Contract"}
                      </button>
                    )}

                    {canDeclineContract(status, contract) && (
                      <button
                        type="button"
                        disabled={actionLoading === "decline"}
                        onClick={() => setShowDeclineBox((prev) => !prev)}
                        className="rounded-xl border border-red-400/50 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Decline Contract
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {message && <Alert type="success" title="Success" message={message} />}
          {error && <Alert type="danger" title="Contract error" message={error} />}

          {isContractDeclined(status) && getCancelReason(contract) && (
            <Alert
              type="warning"
              title="Contract declined"
              message={getCancelReason(contract)}
            />
          )}

          {showDeclineBox && canDeclineContract(status, contract) && (
            <section className="mb-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-red-200">
                Reason for declining
              </label>

              <textarea
                value={declineReason}
                onChange={(event) => {
                  setDeclineReason(event.target.value);
                  setError("");
                }}
                rows={4}
                placeholder="Explain why you cannot accept this contract."
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-red-300"
              />

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeclineBox(false);
                    setDeclineReason("");
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 transition hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={actionLoading === "decline"}
                  onClick={handleDeclineContract}
                  className="rounded-xl border border-red-400/50 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "decline" ? "Declining..." : "Submit Reason"}
                </button>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="Scope of Work" icon="assignment">
                <TextValue value={projectScope || "No project scope provided."} />
              </Card>

              <Card title="Deliverables" icon="task_alt">
                <TextValue value={deliverables || "No deliverables provided."} />
              </Card>

              <Card title="Acceptance Criteria" icon="verified">
                <TextValue
                  value={acceptanceCriteria || "No acceptance criteria provided."}
                />
              </Card>

              <Card title="Payment Terms" icon="payments">
                <TextValue value={contractTerms || "No payment terms provided."} />
              </Card>

              {clientMessage && (
                <Card title="Client Message" icon="chat">
                  <TextValue value={clientMessage} />
                </Card>
              )}

              <Card title={`Milestones (${milestoneDrafts.length})`} icon="flag">
                {milestoneDrafts.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm font-bold text-white">
                      Milestones are not available yet.
                    </p>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      You can still review the overall scope, deliverables, and
                      payment terms. Milestones may be added by the client before
                      the project starts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {milestoneDrafts.map((milestone, index) => (
                      <MilestoneDraftCard
                        key={milestone.id || index}
                        milestone={milestone}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </main>

            <aside className="space-y-6">
              <PaymentSummary contract={contract} />

              <Card title="Contract Info" icon="info">
                <Info label="Status" value={getContractStatusLabel(status, contract)} />
                <Info label="Client" value={clientName} />
                <Info label="Expert" value={expertName} />

                <Info
                  label="Client Confirmed"
                  value={formatBoolean(isClientConfirmed(contract))}
                />

                <Info
                  label="Expert Confirmed"
                  value={formatBoolean(isExpertConfirmed(contract))}
                />

                {realProposalId && <Info label="Proposal" value={`#${realProposalId}`} />}
                {realJobId && <Info label="Job" value={`#${realJobId}`} />}
                {realProjectId && <Info label="Project" value={`#${realProjectId}`} />}
              </Card>

              <Card title="Dates" icon="event">
                <Info
                  label="Created"
                  value={formatDate(getField(contract, ["createdAt", "CreatedAt"], ""))}
                />

                {getField(contract, ["confirmedAt", "ConfirmedAt"], "") && (
                  <Info
                    label="Confirmed"
                    value={formatDate(
                      getField(contract, ["confirmedAt", "ConfirmedAt"], "")
                    )}
                  />
                )}

                {getField(contract, ["cancelledAt", "CancelledAt"], "") && (
                  <Info
                    label="Declined"
                    value={formatDate(
                      getField(contract, ["cancelledAt", "CancelledAt"], "")
                    )}
                  />
                )}
              </Card>
            </aside>
          </div>
        </div>
      </div>

      {acceptSuccessModal && (
        <AcceptSuccessModal projectId={acceptSuccessModal.projectId} />
      )}
    </ExpertLayout>
  );
}

function AcceptSuccessModal({ projectId }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-green-400/30 bg-[#151a22] p-6 text-center shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-green-400/30 bg-green-400/10">
          <span className="material-symbols-outlined text-4xl text-green-300">
            check_circle
          </span>
        </div>

        <h2 className="mt-5 text-2xl font-extrabold text-white">
          Contract accepted successfully
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          Your contract has been confirmed. We are redirecting you to your
          project workspace.
        </p>

        <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200">
          {projectId
            ? `Redirecting to Project #${projectId}...`
            : "Redirecting to your projects..."}
        </div>
      </div>
    </div>
  );
}

function PaymentSummary({ contract }) {
  const finalPrice = getFinalPrice(contract);
  const platformFee = getPlatformFee(contract);
  const totalClientPayment = getTotalClientPayment(contract);
  const expertReceivable = getExpertReceivable(contract);

  return (
    <section className="rounded-2xl border border-green-400/30 bg-green-400/10 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-400/20">
          <span className="material-symbols-outlined text-green-300">
            account_balance_wallet
          </span>
        </div>

        <div>
          <h2 className="font-extrabold text-white">Payment Summary</h2>
          <p className="text-xs text-green-100/70">
            Clear breakdown for this contract
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <PaymentRow label="Contract Amount" value={formatMoney(finalPrice)} />
        <PaymentRow label="Platform Fee" value={formatMoney(platformFee)} />
        <PaymentRow label="Client Pays" value={formatMoney(totalClientPayment)} />
      </div>

      <div className="mt-4 rounded-xl border border-green-400/30 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-wider text-green-100/70">
          You receive
        </p>

        <p className="mt-1 text-2xl font-black text-green-300">
          {formatMoney(expertReceivable)}
        </p>
      </div>
    </section>
  );
}

function PaymentRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-sm text-green-100/80">{label}</p>
      <p className="font-bold text-white">{value}</p>
    </div>
  );
}

function QuickStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-white">
        {formatDisplayValue(value)}
      </p>
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-5">
      <div className="mb-4 flex items-center gap-3">
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
            <span className="material-symbols-outlined text-lg text-cyan-300">
              {icon}
            </span>
          </div>
        )}

        <h2 className="text-lg font-extrabold text-white">{title}</h2>
      </div>

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
          label="Deadline"
          value={
            milestone.deadlineOffsetDays || milestone.durationDays
              ? `${milestone.deadlineOffsetDays || milestone.durationDays} days`
              : "N/A"
          }
        />
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 last:mb-0">
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

function StatusBadge({ status, contract }) {
  const normalized = normalizeStatus(status);

  const style = isContractAccepted(normalized)
    ? "border-green-400/30 bg-green-400/10 text-green-300"
    : isContractDeclined(normalized)
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : isDraftContract(normalized) && !isWaitingForExpert(normalized, contract)
        ? "border-white/10 bg-white/[0.04] text-gray-300"
        : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {getContractStatusLabel(normalized, contract)}
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

function getContainers(entity) {
  return [entity, entity?.raw, entity?.Raw].filter(Boolean);
}

function getField(entity, paths = [], fallback = "") {
  const containers = getContainers(entity);

  for (const container of containers) {
    for (const path of paths) {
      const value = getByPath(container, path);

      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }

  return fallback;
}

function getByPath(object, path) {
  if (!object || !path) return undefined;

  return String(path)
    .split(".")
    .reduce((result, key) => {
      if (result === undefined || result === null) return undefined;
      return result[key];
    }, object);
}

function getNumberField(entity, paths = [], fallback = 0) {
  const value = getField(entity, paths, fallback);
  const number = Number(value);

  return Number.isNaN(number) ? fallback : number;
}

function getBooleanField(entity, paths = [], fallback = false) {
  const value = getField(entity, paths, fallback);

  if (typeof value === "boolean") return value;

  const text = String(value || "").trim().toLowerCase();

  if (["true", "1", "yes"].includes(text)) return true;
  if (["false", "0", "no"].includes(text)) return false;

  return fallback;
}

function getContractId(contract) {
  return getField(contract, ["contractId", "ContractId", "id", "Id"], "");
}

function getProposalId(contract) {
  return getField(contract, ["proposalId", "ProposalId"], "");
}

function getJobId(contract) {
  return getField(contract, ["jobId", "JobId"], "");
}

function getProjectId(contract) {
  return getField(contract, ["projectId", "ProjectId"], "");
}

function getFinalPrice(contract) {
  const direct = getNumberField(
    contract,
    [
      "finalPrice",
      "FinalPrice",
      "contractAmount",
      "ContractAmount",
      "totalAmount",
      "TotalAmount",
      "amount",
      "Amount",
      "price",
      "Price",
    ],
    0
  );

  if (direct > 0) return direct;

  return getExpertReceivable(contract);
}

function getPlatformFee(contract) {
  return getNumberField(
    contract,
    ["platformFeeAmount", "PlatformFeeAmount", "platformFee", "PlatformFee"],
    0
  );
}

function getTotalClientPayment(contract) {
  return getNumberField(
    contract,
    [
      "totalClientPayment",
      "TotalClientPayment",
      "clientPaymentAmount",
      "ClientPaymentAmount",
    ],
    getFinalPrice(contract) + getPlatformFee(contract)
  );
}

function getExpertReceivable(contract) {
  return getNumberField(
    contract,
    [
      "expertReceivableAmount",
      "ExpertReceivableAmount",
      "expertAmount",
      "ExpertAmount",
      "totalAmount",
      "TotalAmount",
      "amount",
      "Amount",
    ],
    0
  );
}

function getTimelineDays(contract) {
  return getNumberField(
    contract,
    [
      "finalTimelineDays",
      "FinalTimelineDays",
      "timelineDays",
      "TimelineDays",
      "durationDays",
      "DurationDays",
      "estimatedDurationDays",
      "EstimatedDurationDays",
    ],
    0
  );
}

function getCancelReason(contract) {
  return getField(
    contract,
    [
      "cancelReason",
      "CancelReason",
      "cancellationReason",
      "CancellationReason",
      "rejectReason",
      "RejectReason",
    ],
    ""
  );
}

function getMilestonesFromContract(contract) {
  const containers = getContainers(contract);

  for (const container of containers) {
    const direct =
      container.milestoneDrafts ||
      container.MilestoneDrafts ||
      container.contractMilestoneDrafts ||
      container.ContractMilestoneDrafts ||
      container.milestones ||
      container.Milestones ||
      container.contractMilestones ||
      container.ContractMilestones;

    if (Array.isArray(direct) && direct.length > 0) {
      return direct.map((item, index) => normalizeMilestone(item, index));
    }

    const json =
      container.milestonePlanJson ||
      container.MilestonePlanJson ||
      container.milestonesJson ||
      container.MilestonesJson ||
      "";

    const parsed = parseMilestoneJson(json);

    if (parsed.length > 0) return parsed;
  }

  return [];
}

function parseMilestoneJson(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeMilestone(item, index));
  }

  if (typeof value === "object") {
    return extractMilestoneArray(value).map((item, index) =>
      normalizeMilestone(item, index)
    );
  }

  try {
    const parsed = JSON.parse(String(value));

    if (typeof parsed === "string") {
      return parseMilestoneJson(parsed);
    }

    return extractMilestoneArray(parsed).map((item, index) =>
      normalizeMilestone(item, index)
    );
  } catch {
    return [];
  }
}

function extractMilestoneArray(value) {
  if (Array.isArray(value)) return value;

  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value.milestones)) return value.milestones;
  if (Array.isArray(value.Milestones)) return value.Milestones;

  if (Array.isArray(value.milestoneDrafts)) return value.milestoneDrafts;
  if (Array.isArray(value.MilestoneDrafts)) return value.MilestoneDrafts;

  if (Array.isArray(value.contractMilestoneDrafts)) {
    return value.contractMilestoneDrafts;
  }

  if (Array.isArray(value.ContractMilestoneDrafts)) {
    return value.ContractMilestoneDrafts;
  }

  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.Items)) return value.Items;

  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.Data)) return value.Data;

  return [];
}

function normalizeMilestone(item, index = 0) {
  const duration =
    item?.durationDays ??
    item?.DurationDays ??
    item?.deadlineOffsetDays ??
    item?.DeadlineOffsetDays ??
    0;

  return {
    id:
      item?.contractMilestoneDraftId ||
      item?.ContractMilestoneDraftId ||
      item?.milestoneDraftId ||
      item?.MilestoneDraftId ||
      item?.contractMilestoneId ||
      item?.ContractMilestoneId ||
      item?.id ||
      item?.Id ||
      index,

    title:
      item?.title ||
      item?.Title ||
      item?.name ||
      item?.Name ||
      `Milestone ${index + 1}`,

    description:
      item?.description ||
      item?.Description ||
      item?.expectedDeliverable ||
      item?.ExpectedDeliverable ||
      "",

    expectedDeliverable:
      item?.expectedDeliverable ||
      item?.ExpectedDeliverable ||
      item?.deliverable ||
      item?.Deliverable ||
      "",

    acceptanceCriteria:
      item?.acceptanceCriteria ||
      item?.AcceptanceCriteria ||
      item?.criteria ||
      item?.Criteria ||
      "",

    amount: Number(item?.amount ?? item?.Amount ?? 0),
    durationDays: Number(duration),
    deadlineOffsetDays: Number(duration),
    revisionLimit: item?.revisionLimit ?? item?.RevisionLimit ?? null,
    orderIndex: Number(item?.orderIndex ?? item?.OrderIndex ?? index + 1),
    status: String(item?.status || item?.Status || "PENDING").toUpperCase(),
    raw: item,
  };
}

function normalizeStatus(status) {
  return String(status || "DRAFT").trim().toUpperCase();
}

function isDraftContract(status) {
  return ["DRAFT", "CREATED", "PREVIEW"].includes(normalizeStatus(status));
}

function isClientConfirmed(contract) {
  return getBooleanField(
    contract,
    [
      "clientConfirmed",
      "ClientConfirmed",
      "isClientConfirmed",
      "IsClientConfirmed",
    ],
    false
  );
}

function isExpertConfirmed(contract) {
  return getBooleanField(
    contract,
    [
      "expertConfirmed",
      "ExpertConfirmed",
      "isExpertConfirmed",
      "IsExpertConfirmed",
    ],
    false
  );
}

function isContractSentToExpert(status) {
  return [
    "PENDING",
    "PENDING_EXPERT",
    "PENDING_EXPERT_APPROVAL",
    "WAITING_EXPERT",
    "WAITING_EXPERT_CONFIRMATION",
    "CLIENT_CONFIRMED",
    "CLIENT_SENT",
    "SENT",
    "SENT_TO_EXPERT",
    "AWAITING_EXPERT",
    "AWAITING_EXPERT_CONFIRMATION",
  ].includes(normalizeStatus(status));
}

function isWaitingForExpert(status, contract) {
  const normalized = normalizeStatus(status);

  if (isContractSentToExpert(normalized)) return true;

  return (
    isDraftContract(normalized) &&
    isClientConfirmed(contract) &&
    !isExpertConfirmed(contract)
  );
}

function isContractAccepted(status) {
  return ["ACCEPTED", "CONFIRMED", "ACTIVE", "SIGNED"].includes(
    normalizeStatus(status)
  );
}

function isContractDeclined(status) {
  return ["REJECTED", "CANCELLED", "CANCELED", "DECLINED"].includes(
    normalizeStatus(status)
  );
}

function canAcceptContract(status, contract) {
  return isWaitingForExpert(status, contract);
}

function canDeclineContract(status, contract) {
  return isWaitingForExpert(status, contract);
}

function getContractStatusLabel(status, contract) {
  const value = normalizeStatus(status);

  if (isWaitingForExpert(value, contract)) return "Waiting Expert";

  const map = {
    DRAFT: "Draft",
    CREATED: "Draft",
    PREVIEW: "Draft",
    PENDING: "Waiting Expert",
    PENDING_EXPERT: "Waiting Expert",
    PENDING_EXPERT_APPROVAL: "Waiting Expert",
    WAITING_EXPERT: "Waiting Expert",
    WAITING_EXPERT_CONFIRMATION: "Waiting Expert",
    CLIENT_CONFIRMED: "Waiting Expert",
    CLIENT_SENT: "Waiting Expert",
    SENT: "Waiting Expert",
    SENT_TO_EXPERT: "Waiting Expert",
    AWAITING_EXPERT: "Waiting Expert",
    AWAITING_EXPERT_CONFIRMATION: "Waiting Expert",
    ACCEPTED: "Accepted",
    CONFIRMED: "Confirmed",
    ACTIVE: "Active",
    SIGNED: "Signed",
    REJECTED: "Declined",
    DECLINED: "Declined",
    CANCELLED: "Declined",
    CANCELED: "Declined",
  };

  return map[value] || value;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatBoolean(value) {
  return value === true || String(value).toLowerCase() === "true" ? "Yes" : "No";
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

  const lower = String(message || "").toLowerCase();

  if (lower.includes("not found")) {
    return "Contract could not be found.";
  }

  if (lower.includes("confirm")) {
    return "This contract cannot be accepted right now.";
  }

  if (lower.includes("cancel") || lower.includes("decline")) {
    return "This contract cannot be declined right now.";
  }

  return message || fallback;
}