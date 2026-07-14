import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import contractService from "../../../services/contract.service";

import { formatDateTime } from "../../../utils/dateTime.utils";
export default function ContractDetailPage() {
  const { contractId, proposalId } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [milestoneDrafts, setMilestoneDrafts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [acceptSuccessModal, setAcceptSuccessModal] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const [showDeclineBox, setShowDeclineBox] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const refreshInFlightRef = useRef(false);

  const realContractId = getContractId(contract) || contractId;
  const realProposalId = getProposalId(contract) || proposalId;
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

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    loadContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, proposalId]);

  useEffect(() => {
    const refreshSilently = async () => {
      if (document.visibilityState !== "visible") return;

      if (
        refreshInFlightRef.current ||
        Boolean(actionLoading) ||
        Boolean(confirmAction) ||
        showDeclineBox
      ) {
        return;
      }

      refreshInFlightRef.current = true;

      try {
        await loadContract({
          silent: true,
          preserveMessage: true,
        });
      } finally {
        refreshInFlightRef.current = false;
      }
    };

    const intervalId = window.setInterval(refreshSilently, 5000);

    const handleFocus = () => {
      refreshSilently();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshSilently();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    contractId,
    proposalId,
    actionLoading,
    confirmAction,
    showDeclineBox,
  ]);

  const loadContract = async ({
    silent = false,
    preserveMessage = false,
  } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
        setError("");

        if (!preserveMessage) {
          setMessage("");
        }
      }

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
        const apiMilestones = await loadMilestoneDrafts(id, {
          silent,
        });

        setMilestoneDrafts(
          apiMilestones.length > 0 ? apiMilestones : fallbackMilestones
        );
      } else {
        setMilestoneDrafts(fallbackMilestones);
      }

      if (silent) {
        setError("");
      }
    } catch (err) {
      if (!silent) {
        console.error("LOAD CONTRACT ERROR:", err?.response?.data || err);
        setError(getFriendlyError(err, "Cannot load contract detail."));
        setContract(null);
        setMilestoneDrafts([]);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadMilestoneDrafts = async (
    id,
    { silent = false } = {}
  ) => {
    try {
      if (!id) return [];

      const data = await contractService.getContractMilestoneDrafts(id);

      return Array.isArray(data)
        ? data.map((item, index) => normalizeMilestone(item, index))
        : [];
    } catch (err) {
      if (!silent) {
        console.warn(
          "LOAD MILESTONE DRAFTS WARNING:",
          err?.response?.data || err
        );
      }

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

  const requestAcceptContract = () => {
    if (!realContractId) {
      setError(
        "Contract information is unavailable. Please refresh the page and try again."
      );
      return;
    }

    setError("");
    setConfirmAction({
      type: "accept",
      title: "Accept this contract?",
      message:
        "By accepting, you confirm the scope, milestones, timeline, and payment terms shown on this page.",
      confirmLabel: "Accept Contract",
      tone: "success",
    });
  };

  const executeAcceptContract = async () => {
    try {
      setActionLoading("accept");
      setError("");
      setMessage("");
      setConfirmAction(null);

      const updatedContract = await contractService.confirmContract(
        realContractId
      );

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

  const requestDeclineContract = () => {
    if (!realContractId) {
      setError(
        "Contract information is unavailable. Please refresh the page and try again."
      );
      return;
    }

    const reason = declineReason.trim();

    if (!reason) {
      setError("Please enter a reason before declining this contract.");
      return;
    }

    if (reason.length < 10) {
      setError("Decline reason must be at least 10 characters.");
      return;
    }

    setError("");
    setConfirmAction({
      type: "decline",
      title: "Decline this contract?",
      message:
        "The client will receive your reason and this contract will no longer be available for acceptance.",
      confirmLabel: "Decline Contract",
      tone: "danger",
    });
  };

  const executeDeclineContract = async () => {
    try {
      setActionLoading("decline");
      setError("");
      setMessage("");
      setConfirmAction(null);

      const updatedContract = await contractService.cancelContract(
        realContractId,
        {
          reason: declineReason.trim(),
        }
      );

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

  const handleConfirmAction = () => {
    if (confirmAction?.type === "accept") {
      executeAcceptContract();
      return;
    }

    if (confirmAction?.type === "decline") {
      executeDeclineContract();
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <PageSkeleton rows={4} />
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

          <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <StatusBadge status={status} contract={contract} />
                </div>

                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#00F0FF]">
                  Contract
                </p>

                <h1 className="max-w-3xl text-2xl font-bold text-white md:text-3xl">
                  {formatDisplayValue(contractTitle)}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Review the scope, milestones, payment, and response options.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <QuickStat label="Client" value={clientName} />
                  <QuickStat
                    label="Timeline"
                    value={`${getTimelineDays(contract)} days`}
                  />
                  <QuickStat
                    label="Your earnings"
                    value={formatMoney(
                      getExpertReceivable(
                        contract,
                        getFinalPrice(contract, milestoneDrafts),
                        getExpertServiceFee(
                          contract,
                          getFinalPrice(contract, milestoneDrafts)
                        )
                      )
                    )}
                    tone="success"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 lg:w-[320px]">
                <p className="text-sm font-bold text-cyan-100">
                  Next step
                </p>

                <p className="mt-2 text-sm leading-6 text-cyan-100/80">
                  {canRespond
                    ? "The client has sent this contract for your confirmation. Review it carefully before accepting or declining."
                    : isDraftContract(status)
                      ? "This is still a draft contract. You can review the details."
                      : "This contract is no longer waiting for your response."}
                </p>

                {canRespond && (
                  <div className="mt-4 flex flex-col gap-2">
                    {canAcceptContract(status, contract) && (
                      <button
                        type="button"
                        disabled={actionLoading === "accept"}
                        onClick={requestAcceptContract}
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

          {message && <SuccessToast message={message} onClose={() => setMessage("")} />}
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
                Reason for declining <span className="text-red-300">*</span>
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

              <p className="mt-2 text-xs text-red-100/70">
                
              </p>

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
                  onClick={requestDeclineContract}
                  className="rounded-xl border border-red-400/50 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "decline" ? "Declining..." : "Submit Reason"}
                </button>
              </div>
            </section>
          )}


          <ContractProgress
            status={status}
            contract={contract}
            projectId={realProjectId}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="Scope" icon="assignment">
                <TextValue value={projectScope || "No project scope provided."} />
              </Card>

              <Card title="Deliverables" icon="task_alt">
                <TextValue value={deliverables || "No deliverables provided."} />
              </Card>

              {acceptanceCriteria && (
                <Card title="Acceptance Criteria" icon="verified">
                  <TextValue value={acceptanceCriteria} />
                </Card>
              )}

              <Card title="Payment" icon="payments">
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
                      No milestones yet.
                    </p>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      The client may add milestones before the project starts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {milestoneDrafts.map((milestone, index) => (
                      <MilestoneDraftCard
                        key={milestone.id || index}
                        milestone={milestone}
                        index={index}
                        expertFeeRate={getExpertFeeRate(contract)}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </main>

            <aside className="space-y-6">
              <PaymentSummary contract={contract} milestones={milestoneDrafts} />

              <Card title="Contract details" icon="info">
                <Info label="Status" value={getContractStatusLabel(status, contract)} />
                <Info label="Client" value={clientName} />
                <Info
                  label="Timeline"
                  value={`${getTimelineDays(contract)} days`}
                />
                <Info
                  label="Created"
                  value={formatDate(
                    getField(contract, ["createdAt", "CreatedAt"], "")
                  )}
                />

                {getField(
                  contract,
                  [
                    "signDeadlineAt",
                    "SignDeadlineAt",
                    "signatureDeadlineAt",
                    "SignatureDeadlineAt",
                  ],
                  ""
                ) && (
                  <Info
                    label="Response Deadline"
                    value={formatDate(
                      getField(
                        contract,
                        [
                          "signDeadlineAt",
                          "SignDeadlineAt",
                          "signatureDeadlineAt",
                          "SignatureDeadlineAt",
                        ],
                        ""
                      )
                    )}
                  />
                )}
              </Card>

            </aside>
          </div>
        </div>
      </div>

      {confirmAction && (
        <ConfirmActionModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          tone={confirmAction.tone}
          loading={Boolean(actionLoading)}
          onCancel={() => !actionLoading && setConfirmAction(null)}
          onConfirm={handleConfirmAction}
        />
      )}

      {acceptSuccessModal && (
        <AcceptSuccessModal projectId={acceptSuccessModal.projectId} />
      )}
    </ExpertLayout>
  );
}


function PageSkeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 h-5 w-36 rounded-full bg-white/10" />
        <div className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-6 md:p-8">
          <div className="h-4 w-28 rounded bg-cyan-400/10" />
          <div className="mt-4 h-9 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/[0.07]" />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-20 rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="h-32 rounded-2xl border border-white/10 bg-[#151a22]"
              />
            ))}
          </div>
          <div className="h-72 rounded-2xl border border-white/10 bg-[#151a22]" />
        </div>
      </div>
    </div>
  );
}



function SuccessToast({ message, onClose }) {
  return (
    <div className="fixed right-4 top-4 z-[1200] w-[min(92vw,380px)] animate-[fadeIn_.2s_ease-out]">
      <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-[#111a16] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-green-400/30 bg-green-400/10 text-green-300">
          <span className="material-symbols-outlined">check_circle</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Action completed</p>
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


function ContractProgress({ status, contract, projectId }) {
  const accepted = isContractAccepted(status);
  const waiting = isWaitingForExpert(status, contract);
  const declined = isContractDeclined(status);

  const steps = [
    {
      label: "Proposal accepted",
      helper: "The client selected your proposal.",
      complete: true,
    },
    {
      label: "Contract review",
      helper: waiting
        ? "Your confirmation is required."
        : accepted
          ? "Contract terms were confirmed."
          : declined
            ? "The contract was declined."
            : "The client is preparing the final terms.",
      complete: waiting || accepted || declined,
      active: waiting,
      danger: declined,
    },
    {
      label: "Project workspace",
      helper: accepted
        ? projectId
          ? "Your project workspace is ready."
          : "The project is being prepared."
        : "Available after both parties confirm.",
      complete: accepted,
      active: accepted,
    },
  ];
}

function ConfirmActionModal({
  title,
  message,
  confirmLabel,
  tone = "success",
  loading,
  onCancel,
  onConfirm,
}) {
  const confirmClass =
    tone === "danger"
      ? "border-red-400/50 bg-red-400/10 text-red-300 hover:bg-red-400 hover:text-black"
      : "border-green-400/50 bg-green-400/10 text-green-300 hover:bg-green-400 hover:text-black";

  const icon = tone === "danger" ? "warning" : "verified";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#151a22] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <span className="material-symbols-outlined text-cyan-300">{icon}</span>
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
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl border px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AcceptSuccessModal({ projectId }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-green-400/30 bg-[#151a22] p-6 text-center shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-green-400/30 bg-green-400/10">
          <span className="material-symbols-outlined text-3xl text-green-300">
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
            ? "Redirecting to your project workspace..."
            : "Redirecting to your projects..."}
        </div>
      </div>
    </div>
  );
}

function PaymentSummary({ contract, milestones = [] }) {
  const contractAmount = getFinalPrice(contract, milestones);
  const expertFeeRate = getExpertFeeRate(contract);
  const expertServiceFee = getExpertServiceFee(contract, contractAmount);
  const expertReceivable = getExpertReceivable(
    contract,
    contractAmount,
    expertServiceFee
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-green-400/30 bg-[#122019] shadow-[0_18px_55px_rgba(34,197,94,0.12)]">
      <div className="border-b border-green-400/20 bg-green-400/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-green-400/30 bg-green-400/15">
            <span className="material-symbols-outlined text-green-300">
              payments
            </span>
          </div>

          <div>
            <h2 className="font-extrabold text-white">Your Earnings</h2>
            <p className="mt-1 text-xs text-green-100/70">
              Amount you receive after the expert service fee
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-green-400/30 bg-black/20 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-100/70">
            Your earnings
          </p>

          <p className="mt-2 break-words text-3xl font-black text-green-300">
            {formatMoney(expertReceivable)}
          </p>

          <p className="mt-2 text-xs leading-5 text-green-100/70">
            This is your estimated net earning for the full contract.
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="space-y-3">
          <PaymentRow
            label="Contract Value"
            value={formatMoney(contractAmount)}
          />

          <PaymentRow
            label={`Service fee${
              expertFeeRate > 0 ? ` (${formatPercentage(expertFeeRate)})` : ""
            }`}
            value={`-${formatMoney(expertServiceFee)}`}
            tone="danger"
          />

          <div className="border-t border-green-400/20 pt-3">
            <PaymentRow
              label="Net Earnings"
              value={formatMoney(expertReceivable)}
              tone="success"
              strong
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PaymentRow({
  label,
  value,
  tone = "default",
  strong = false,
}) {
  const valueClass =
    tone === "success"
      ? "text-green-300"
      : tone === "danger"
        ? "text-red-300"
        : "text-white";

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <p
        className={`text-sm ${
          strong ? "font-bold text-white" : "text-green-100/80"
        }`}
      >
        {label}
      </p>

      <p
        className={`break-words text-right ${
          strong ? "text-base font-black" : "font-bold"
        } ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function QuickStat({ label, value, tone = "default" }) {
  const valueClass =
    tone === "success" ? "text-green-300" : "text-white";

  return (
    <div
      className={`rounded-xl border p-4 ${
        tone === "success"
          ? "border-green-400/30 bg-green-400/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className={`mt-1 truncate text-sm font-bold ${valueClass}`}>
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

function MilestoneDraftCard({
  milestone,
  index,
  expertFeeRate = 0,
}) {
  const milestoneAmount = Number(milestone?.amount || 0);
  const milestoneFee =
    expertFeeRate > 0 ? (milestoneAmount * expertFeeRate) / 100 : 0;
  const milestoneNet = Math.max(milestoneAmount - milestoneFee, 0);

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

      {milestone.description && <TextValue value={milestone.description} />}

      <div className="mt-4 rounded-xl border border-green-400/25 bg-green-400/10 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-100/70">
          Your earnings
        </p>

        <p className="mt-1 text-xl font-black text-green-300">
          {formatMoney(milestoneNet)}
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-gray-500">Milestone Value</p>
            <p className="mt-1 font-bold text-white">
              {formatMoney(milestoneAmount)}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-gray-500">
              Expert Fee
              {expertFeeRate > 0
                ? ` (${formatPercentage(expertFeeRate)})`
                : ""}
            </p>
            <p className="mt-1 font-bold text-red-300">
              -{formatMoney(milestoneFee)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {milestone.expectedDeliverable && (
          <Info
            label="Expected Deliverable"
            value={milestone.expectedDeliverable}
          />
        )}

        {milestone.acceptanceCriteria && (
          <Info
            label="Acceptance Criteria"
            value={milestone.acceptanceCriteria}
          />
        )}

        <Info
          label="Deadline"
          value={`${
            milestone.deadlineOffsetDays ?? milestone.durationDays ?? 0
          } days`}
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

function getFinalPrice(contract, milestones = []) {
  const direct = getNumberField(
    contract,
    ["finalPrice", "FinalPrice"],
    0
  );

  if (direct > 0) return direct;

  return (Array.isArray(milestones) ? milestones : []).reduce(
    (total, milestone) => total + Number(milestone?.amount || 0),
    0
  );
}

function getExpertFeeRate(contract) {
  return getNumberField(
    contract,
    ["expertFeeRate", "ExpertFeeRate"],
    0
  );
}

function getExpertServiceFee(contract, contractAmount = 0) {
  const direct = getNumberField(
    contract,
    ["expertFeeAmount", "ExpertFeeAmount"],
    0
  );

  if (direct > 0) return direct;

  const rate = getExpertFeeRate(contract);

  return rate > 0 && contractAmount > 0
    ? (contractAmount * rate) / 100
    : 0;
}

function getExpertReceivable(
  contract,
  contractAmount = 0,
  expertServiceFee = 0
) {
  const direct = getNumberField(
    contract,
    ["expertReceivableAmount", "ExpertReceivableAmount"],
    0
  );

  if (direct > 0) return direct;

  return Math.max(contractAmount - expertServiceFee, 0);
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

function formatPercentage(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return "0%";

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(number)}%`;
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
  return formatDateTime(value, "N/A");
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