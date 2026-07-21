import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import projectService from "../../../services/project.service";
import contractService from "../../../services/contract.service";
import { PROJECT_STATUS_LABEL } from "../../../constants/projectStatus";

import { formatDateTime, parseUtcDate } from "../../../utils/dateTime.utils";

// ===== Expert project page: milestone tracking and completion check =====
export default function ProjectDetailPage() {
  // ===== Route params =====
  const { projectId } = useParams();
  const navigate = useNavigate();

  // ===== Project data state =====
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [contractFinance, setContractFinance] = useState(null);

  // ===== Loading and feedback state =====
  const [loading, setLoading] = useState(true);
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [completionChecking, setCompletionChecking] = useState(false);

  const [error, setError] = useState("");
  const [milestoneError, setMilestoneError] = useState("");
  const [message, setMessage] = useState("");
  const [showWalletAction, setShowWalletAction] = useState(false);
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    const loadContractFinance = async () => {
      const contractId = getProjectContractId(project);

      if (!contractId) {
        setContractFinance(null);
        return;
      }

      try {
        const data = await contractService.getContractById(contractId);

        if (!cancelled) {
          setContractFinance(data || null);
        }
      } catch {
        if (!cancelled) {
          setContractFinance(null);
        }
      }
    };

    loadContractFinance();

    return () => {
      cancelled = true;
    };
  }, [project]);

  useEffect(() => {
    const refreshSilently = async () => {
      if (document.visibilityState !== "visible") return;

      if (
        refreshInFlightRef.current ||
        completionChecking ||
        showCompletionConfirm
      ) {
        return;
      }

      refreshInFlightRef.current = true;

      try {
        await loadProject({
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
  }, [projectId, completionChecking, showCompletionConfirm]);

  // ===== Derived milestone and finance data used by the UI =====
  const displayedMilestones = useMemo(() => {
    if (Array.isArray(milestones) && milestones.length > 0) {
      return milestones;
    }

    if (Array.isArray(project?.milestones)) {
      return project.milestones;
    }

    return [];
  }, [milestones, project]);

  const completionSummary = useMemo(() => {
    return getCompletionSummary(displayedMilestones);
  }, [displayedMilestones]);

  const financialSource = contractFinance || project;

  // ===== API loading: project, milestones, and contract finance =====
  const loadProject = async ({
    preserveMessage = false,
    silent = false,
  } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
        setError("");

        if (!preserveMessage) {
          setMessage("");
        }

        setMilestoneError("");
        setMilestones([]);
      }

      const data = await projectService.getProjectById(projectId);

      setProject(data);

      if (Array.isArray(data?.milestones) && data.milestones.length > 0) {
        setMilestones(data.milestones);
      }

      const realProjectId = getProjectId(data) || projectId;

      if (realProjectId) {
        await loadProjectMilestones(realProjectId, {
          silent,
        });
      }

      if (silent) {
        setError("");
        setMilestoneError("");
      }
    } catch (err) {
      if (!silent) {
        console.error("LOAD PROJECT DETAIL ERROR:", err?.response?.data || err);
        setError(getFriendlyError(err, "Cannot load project detail."));
        setProject(null);
        setMilestones([]);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadProjectMilestones = async (
    targetProjectId,
    { silent = false } = {}
  ) => {
    if (!targetProjectId) return;

    try {
      if (!silent) {
        setMilestoneLoading(true);
        setMilestoneError("");
      }

      const data = await projectService.getProjectMilestones(targetProjectId);

      setMilestones(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!silent) {
        console.error(
          "LOAD PROJECT MILESTONES ERROR:",
          err?.response?.data || err
        );

        setMilestoneError(
          getFriendlyError(err, "Cannot load project milestones.")
        );
      }
    } finally {
      if (!silent) {
        setMilestoneLoading(false);
      }
    }
  };

  // ===== Completion check: server decides whether earnings can be released =====
  const handleCompleteCheck = async () => {
    const realProjectId = getProjectId(project) || projectId;

    if (!realProjectId) {
      setError("Cannot run completion check because project information is unavailable.");
      return;
    }

    try {
      setCompletionChecking(true);
      setError("");
      setMessage("");

      await projectService.completeCheck(realProjectId);
      await loadProject({ preserveMessage: true });

      setShowWalletAction(true);
      setMessage(
        "Completion check finished. If the project is now completed, your pending earnings have been moved to Available Balance."
      );
    } catch (err) {
      console.error("COMPLETE CHECK ERROR:", err?.response?.data || err);
      setError(
        getFriendlyError(
          err,
          "Cannot run completion check right now. Please try again."
        )
      );
    } finally {
      setCompletionChecking(false);
    }
  };

  const openMilestone = (milestone) => {
    const milestoneId = getMilestoneId(milestone);

    if (!milestoneId) {
      setError("Cannot open this milestone because its information is unavailable.");
      return;
    }

    navigate(`/expert/milestones/${milestoneId}`);
  };

  // ===== Main render =====
  if (loading) {
    return (
      <ExpertLayout>
        <PageSkeleton cards={4} />
      </ExpertLayout>
    );
  }

  if (!project) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert
              type="danger"
              title="Project not found"
              message={error || "Cannot load this project."}
            />

            <button
              type="button"
              onClick={() => navigate("/expert/projects")}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  const status = String(project.status || "ACTIVE").toUpperCase();
  const projectReference = formatReference(getProjectId(project) || projectId, "PRJ");
  const canRunCompletionCheck =
    displayedMilestones.length > 0 &&
    completionSummary.completed === displayedMilestones.length &&
    !isProjectCompleted(status);

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate("/expert/projects")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to projects
          </button>

          <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.28)] md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#00F0FF]">
                  Project
                </p>

                <h1 className="text-3xl font-bold text-white md:text-3xl">
                  {project.title || "Untitled Project"}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Track milestone delivery, client review, project status, and
                  when pending earnings can move to your wallet.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <StatusBadge status={status} />

                  <InfoPill icon="tag" label={projectReference} />

                  <InfoPill
                    icon="person"
                    label={project.clientName || "Client"}
                  />

                  <InfoPill
                    icon="payments"
                    label={`You receive ${formatMoney(
                      getProjectNetEarning(
                        financialSource,
                        displayedMilestones
                      )
                    )}`}
                    variant="success"
                  />

                  <InfoPill
                    icon="flag"
                    label={`${displayedMilestones.length} milestone${displayedMilestones.length === 1 ? "" : "s"
                      }`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {project.contractId && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/expert/contracts/${project.contractId}`)
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
                  >
                    View Contract
                  </button>
                )}

                {canRunCompletionCheck && (
                  <button
                    type="button"
                    onClick={() => setShowCompletionConfirm(true)}
                    disabled={completionChecking}
                    className="rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {completionChecking ? "Checking..." : "Check Completion"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowWalletAction(false);
                    loadProject();
                  }}
                  disabled={milestoneLoading || completionChecking}
                  className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {milestoneLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
          </section>

          {message && <SuccessToast message={message} onClose={() => setMessage("")} />}

          {error && (
            <Alert type="danger" title="Project error" message={error} />
          )}

          <PostDisputeDecisionNotice project={project} navigate={navigate} />

          {showWalletAction && (
            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-green-400/30 bg-green-400/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-green-100">
                Your project earnings changed. Open Wallet to review available
                and pending balances.
              </p>

              <button
                type="button"
                onClick={() => navigate("/expert/wallet")}
                className="shrink-0 rounded-xl bg-green-400 px-4 py-2.5 text-sm font-black text-black transition hover:bg-green-300"
              >
                View Wallet
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="Overview" icon="description">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {project.description || "No project description provided."}
                </p>
              </Card>

              <Card title="Milestones" icon="flag">
                {milestoneError && (
                  <Alert
                    type="danger"
                    title="Milestone error"
                    message={milestoneError}
                  />
                )}

                {milestoneLoading && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-400">
                    Loading milestones...
                  </div>
                )}

                {!milestoneLoading && displayedMilestones.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                      flag
                    </span>

                    <h2 className="text-lg font-bold text-white">
                      No milestones yet
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">
                      Milestones will appear after the contract is confirmed and
                      funded.
                    </p>
                  </div>
                )}

                {!milestoneLoading && displayedMilestones.length > 0 && (
                  <div className="space-y-4">
                    {displayedMilestones.map((milestone, index) => (
                      <MilestoneCard
                        key={getMilestoneId(milestone) || index}
                        milestone={milestone}
                        onOpen={() => openMilestone(milestone)}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </main>

            <aside className="space-y-6">
              <Card title="Project summary" icon="monitoring">
                <Info label="Reference" value={projectReference} />
                <Info label="Status" value={getProjectStatusLabel(status)} />
                <Info
                  label="Project value"
                  value={formatMoney(
                    getProjectGrossAmount(
                      financialSource,
                      displayedMilestones
                    )
                  )}
                />
                <Info
                  label="Service fee"
                  value={formatServiceFee(
                    getProjectServiceFee(
                      financialSource,
                      displayedMilestones
                    )
                  )}
                />
                <Info
                  label="Net earnings"
                  value={formatMoney(
                    getProjectNetEarning(
                      financialSource,
                      displayedMilestones
                    )
                  )}
                />
                <Info
                  label="Funding secured"
                  value={formatDate(project.escrowLockedAt)}
                />
                <Info
                  label="Funds still locked"
                  value={formatMoney(
                    project.remainingMilestoneAmount ||
                      getRemainingMilestoneAmount(displayedMilestones)
                  )}
                />
                <Info label="Milestones" value={displayedMilestones.length} />
                <Info
                  label="Started"
                  value={formatDate(getProjectStartDate(project, displayedMilestones))}
                />
                <Info
                  label={isProjectCompleted(status) ? "Completed" : "Deadline"}
                  value={formatDate(
                    isProjectCompleted(status)
                      ? getProjectCompletedDate(project)
                      : getProjectDeadline(project, displayedMilestones)
                  )}
                />
              </Card>
            </aside>
          </div>
        </div>
      </div>
      {showCompletionConfirm && (
        <ConfirmActionModal
          title="Check project completion?"
          message="This will ask the server to verify every milestone. If all requirements are complete, pending earnings may be released to your available balance."
          confirmLabel="Check Completion"
          tone="green"
          loading={completionChecking}
          onCancel={() => !completionChecking && setShowCompletionConfirm(false)}
          onConfirm={async () => {
            setShowCompletionConfirm(false);
            await handleCompleteCheck();
          }}
        />
      )}
    </ExpertLayout>
  );
}


function PageSkeleton({ cards = 4, compact = false }) {
  return (
    <div className={`animate-pulse px-5 md:px-8 ${compact ? "py-6" : "py-10"}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 h-5 w-36 rounded-full bg-white/10" />

        <div className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-6 md:p-8">
          <div className="h-4 w-32 rounded bg-cyan-400/10" />
          <div className="mt-4 h-9 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/[0.06]" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {Array.from({ length: cards }).map((_, index) => (
              <div
                key={index}
                className="h-36 rounded-2xl border border-white/10 bg-[#151a22]"
              />
            ))}
          </div>

          <div className="h-80 rounded-2xl border border-white/10 bg-[#151a22]" />
        </div>
      </div>
    </div>
  );
}



function SuccessToast({ message, onClose }) {
  return (
    <div className="fixed right-4 top-4 z-[1300] w-[min(92vw,390px)]">
      <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-[#111a16] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)]">
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

function PostDisputeDecisionNotice({ project, navigate }) {
  if (!project?.requiresPostDisputeDecision) return null;

  return (
    <section className="mb-6 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="material-symbols-outlined mt-0.5 text-yellow-300">
            pending_actions
          </span>
          <div>
            <p className="text-sm font-black text-white">
              Waiting for client post-dispute decision
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-yellow-100/80">
              Admin released the disputed milestone to the expert. Backend keeps
              the project disputed until the client chooses Continue Project or
              End Contract. No new escrow is locked in this step because the
              remaining project escrow was already locked when the contract was
              confirmed.
            </p>
          </div>
        </div>

        {project.latestResolvedDisputeId && (
          <button
            type="button"
            onClick={() =>
              navigate(`/expert/disputes/${project.latestResolvedDisputeId}`)
            }
            className="shrink-0 rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2.5 text-sm font-bold text-yellow-200 transition hover:bg-yellow-400 hover:text-black"
          >
            View dispute
          </button>
        )}
      </div>
    </section>
  );
}



// ===== Confirmation modal for project completion checks =====
function ConfirmActionModal({
  title,
  message,
  confirmLabel,
  loading,
  tone = "cyan",
  onCancel,
  onConfirm,
}) {
  const toneClass =
    tone === "red"
      ? "border-red-400/50 bg-red-400/10 text-red-300 hover:bg-red-400 hover:text-black"
      : tone === "green"
        ? "border-green-400/50 bg-green-400/10 text-green-300 hover:bg-green-400 hover:text-black"
        : "border-cyan-400/50 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-black";

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151a22] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300">
          <span className="material-symbols-outlined">
            {tone === "red" ? "warning" : "verified"}
          </span>
        </div>

        <h2 className="text-xl font-black text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`rounded-xl border px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


// ===== Milestone card shown in the project timeline list =====
function MilestoneCard({ milestone, onOpen }) {
  const status = String(milestone.status || "PENDING").toUpperCase();
  const paymentStatus = String(milestone.paymentStatus || "").toUpperCase();
  const readOnly = isMilestoneReadOnly(milestone);

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/40">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <MilestoneStatusBadge status={status} />

            {milestone.dueDate && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-gray-400">
                Due {formatDate(milestone.dueDate)}
              </span>
            )}

            <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-bold text-green-300">
              {formatMoney(milestone.amount)}
            </span>

            {paymentStatus && (
              <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-bold text-purple-300">
                Funds {getPaymentStatusLabel(paymentStatus)}
              </span>
            )}
          </div>

          <h3 className="font-bold text-white">
            {milestone.title || "Untitled Milestone"}
          </h3>

          <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">
            {milestone.description || "No milestone description."}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className={`shrink-0 rounded-xl border px-5 py-3 text-sm font-semibold transition ${
            readOnly
              ? "border-white/10 bg-white/[0.04] text-gray-300 hover:text-white"
              : "border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-black"
          }`}
        >
          {readOnly ? "View Details" : "Open Milestone"}
        </button>
      </div>
    </article>
  );
}

function MilestoneProgressTimeline({ milestones, onSelect }) {
  const orderedMilestones = [...milestones]
    .filter(Boolean)
    .sort((a, b) => {
      const orderA = Number(a.orderIndex || a.order || 0);
      const orderB = Number(b.orderIndex || b.order || 0);
      return orderA - orderB;
    });

  if (orderedMilestones.length === 0) return null;

  const currentIndex = getCurrentMilestoneIndex(orderedMilestones);
  const count = orderedMilestones.length;

  const progressPercent =
    count <= 1
      ? isMilestoneCompleted(orderedMilestones[0])
        ? 100
        : 0
      : (currentIndex / (count - 1)) * 100;

  const desktopWidthClass =
    count <= 2
      ? "max-w-[420px]"
      : count === 3
        ? "max-w-[620px]"
        : count === 4
          ? "max-w-[760px]"
          : count === 5
            ? "max-w-[900px]"
            : "";

  const desktopStyle =
    count > 5
      ? {
        minWidth: `${count * 150}px`,
      }
      : undefined;

  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-[#0d1117]/70 p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-white">Milestone Progress</p>
          <p className="mt-1 text-xs text-gray-500">
            Track where this project is in the delivery process.
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
          Step {Math.min(currentIndex + 1, count)} / {count}
        </span>
      </div>

      <div className="hidden overflow-x-auto pb-2 md:block">
        <div
          className={`relative mx-auto w-full py-8 ${desktopWidthClass}`}
          style={desktopStyle}
        >
          {count > 1 && (
            <>
              <div className="absolute left-[70px] right-[70px] top-[54px] h-1 rounded-full bg-white/10" />

              <div
                className="absolute left-[70px] top-[54px] h-1 rounded-full bg-gradient-to-r from-cyan-400 via-green-400 to-purple-400 transition-all duration-500"
                style={{
                  width: `calc((100% - 140px) * ${progressPercent / 100})`,
                }}
              />
            </>
          )}

          <div
            className="relative z-10 grid"
            style={{
              gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
            }}
          >
            {orderedMilestones.map((milestone, index) => {
              const state = getMilestoneStepState(
                milestone,
                index,
                currentIndex
              );

              return (
                <button
                  key={getMilestoneId(milestone) || index}
                  type="button"
                  onClick={() => onSelect(milestone)}
                  className="group flex min-w-[130px] flex-col items-center text-center"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border-4 bg-[#151a22] text-sm font-black transition group-hover:scale-105 ${getStepCircleClass(
                      state
                    )}`}
                  >
                    {state === "COMPLETED" ? (
                      <span className="material-symbols-outlined text-xl">
                        check
                      </span>
                    ) : state === "BLOCKED" ? (
                      <span className="material-symbols-outlined text-xl">
                        close
                      </span>
                    ) : (
                      index + 1
                    )}
                  </div>

                  <p className="mt-3 line-clamp-2 max-w-[120px] text-xs font-bold text-white">
                    {milestone.title || `Milestone ${index + 1}`}
                  </p>

                  <p
                    className={`mt-1 text-[11px] font-bold uppercase ${getStepTextClass(
                      state
                    )}`}
                  >
                    {formatStatusLabel(milestone.status || "PENDING")}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {orderedMilestones.map((milestone, index) => {
          const state = getMilestoneStepState(milestone, index, currentIndex);

          return (
            <button
              key={getMilestoneId(milestone) || index}
              type="button"
              onClick={() => onSelect(milestone)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${getStepCircleClass(
                  state
                )}`}
              >
                {state === "COMPLETED" ? (
                  <span className="material-symbols-outlined text-lg">
                    check
                  </span>
                ) : state === "BLOCKED" ? (
                  <span className="material-symbols-outlined text-lg">
                    close
                  </span>
                ) : (
                  index + 1
                )}
              </div>

              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-bold text-white">
                  {milestone.title || `Milestone ${index + 1}`}
                </p>

                <p
                  className={`mt-1 text-xs font-bold uppercase ${getStepTextClass(
                    state
                  )}`}
                >
                  {formatStatusLabel(milestone.status || "PENDING")}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Shared page card wrapper =====
function Card({ title, icon, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
      <div className="mb-4 flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
            <span className="material-symbols-outlined text-xl text-cyan-300">
              {icon}
            </span>
          </div>
        )}

        <h2 className="text-xl font-extrabold text-white">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words font-bold text-white">
        {formatInfoValue(value)}
      </p>
    </div>
  );
}

function InfoPill({ icon, label, variant = "default" }) {
  const style =
    variant === "success"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : "border-white/10 bg-white/[0.04] text-gray-300";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${style}`}
    >
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const group = getProjectStatusGroup(status);

  const style =
    group === "COMPLETED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : group === "DISPUTED" || group === "CANCELLED"
        ? "border-red-400/30 bg-red-400/10 text-red-300"
        : group === "IN_PROGRESS"
          ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
          : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {getProjectStatusLabel(status)}
    </span>
  );
}

function MilestoneStatusBadge({ status }) {
  const style =
    status === "COMPLETED" || status === "APPROVED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : status === "REVISION_REQUESTED"
        ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
        : status === "CANCELLED" ||
          status === "CANCELED" ||
          status === "REJECTED" ||
          status === "DISPUTED"
          ? "border-red-400/30 bg-red-400/10 text-red-300"
          : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {formatStatusLabel(status)}
    </span>
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

function getProjectId(project) {
  return (
    project?.projectId ||
    project?.ProjectId ||
    project?.projectID ||
    project?.ProjectID ||
    project?.id ||
    project?.Id ||
    project?.raw?.projectId ||
    project?.raw?.ProjectId ||
    project?.raw?.projectID ||
    project?.raw?.ProjectID ||
    project?.raw?.id ||
    project?.raw?.Id ||
    ""
  );
}

function getProjectContractId(project) {
  return (
    project?.contractId ||
    project?.ContractId ||
    project?.contractID ||
    project?.ContractID ||
    project?.contract?.contractId ||
    project?.contract?.ContractId ||
    project?.Contract?.ContractId ||
    project?.raw?.contractId ||
    project?.raw?.ContractId ||
    ""
  );
}

function getMilestoneId(milestone) {
  return (
    milestone?.milestoneId ||
    milestone?.MilestoneId ||
    milestone?.milestoneID ||
    milestone?.MilestoneID ||
    milestone?.projectMilestoneId ||
    milestone?.ProjectMilestoneId ||
    milestone?.projectMilestoneID ||
    milestone?.ProjectMilestoneID ||
    milestone?.id ||
    milestone?.Id ||
    milestone?.raw?.milestoneId ||
    milestone?.raw?.MilestoneId ||
    milestone?.raw?.milestoneID ||
    milestone?.raw?.MilestoneID ||
    milestone?.raw?.projectMilestoneId ||
    milestone?.raw?.ProjectMilestoneId ||
    milestone?.raw?.projectMilestoneID ||
    milestone?.raw?.ProjectMilestoneID ||
    milestone?.raw?.id ||
    milestone?.raw?.Id ||
    ""
  );
}

function getProjectStatusGroup(status) {
  const value = String(status || "").trim().toUpperCase();

  if (["ACTIVE", "CONFIRMED", "ACCEPTED", "OPEN"].includes(value)) {
    return "ACTIVE";
  }

  if (["IN_PROGRESS", "ONGOING", "PROCESSING", "WORKING"].includes(value)) {
    return "IN_PROGRESS";
  }

  if (["COMPLETED", "DONE", "FINISHED"].includes(value)) {
    return "COMPLETED";
  }

  if (["DISPUTED", "IN_DISPUTE"].includes(value)) {
    return "DISPUTED";
  }

  if (["CANCELLED", "CANCELED", "REJECTED", "VOID"].includes(value)) {
    return "CANCELLED";
  }

  return value || "ACTIVE";
}

function getCurrentMilestoneIndex(milestones) {
  const firstNotCompletedIndex = milestones.findIndex((milestone) => {
    return !isMilestoneCompleted(milestone);
  });

  if (firstNotCompletedIndex === -1) {
    return Math.max(milestones.length - 1, 0);
  }

  return firstNotCompletedIndex;
}

function getMilestoneStepState(milestone, index, currentIndex) {
  const status = String(milestone?.status || "").toUpperCase();

  if (
    [
      "REJECTED",
      "DECLINED",
      "CANCELLED",
      "CANCELED",
      "DISPUTED",
      "BLOCKED",
    ].includes(status)
  ) {
    return "BLOCKED";
  }

  if (isMilestoneCompleted(milestone)) {
    return "COMPLETED";
  }

  if (index === currentIndex) {
    return "CURRENT";
  }

  if (index < currentIndex) {
    return "COMPLETED";
  }

  return "UPCOMING";
}

function isMilestoneReadOnly(milestone) {
  const milestoneStatus = String(
    milestone?.status ||
      milestone?.Status ||
      milestone?.raw?.status ||
      milestone?.raw?.Status ||
      ""
  )
    .trim()
    .toUpperCase();

  const disputeStatus = String(
    milestone?.disputeStatus ||
      milestone?.DisputeStatus ||
      milestone?.latestDisputeStatus ||
      milestone?.LatestDisputeStatus ||
      milestone?.raw?.disputeStatus ||
      milestone?.raw?.DisputeStatus ||
      milestone?.raw?.latestDisputeStatus ||
      milestone?.raw?.LatestDisputeStatus ||
      ""
  )
    .trim()
    .toUpperCase();

  const hasResolvedDispute = Boolean(
    milestone?.hasResolvedDispute ||
      milestone?.HasResolvedDispute ||
      milestone?.disputeResolved ||
      milestone?.DisputeResolved ||
      milestone?.resolvedDisputeId ||
      milestone?.ResolvedDisputeId ||
      milestone?.raw?.hasResolvedDispute ||
      milestone?.raw?.HasResolvedDispute ||
      milestone?.raw?.disputeResolved ||
      milestone?.raw?.DisputeResolved ||
      milestone?.raw?.resolvedDisputeId ||
      milestone?.raw?.ResolvedDisputeId
  );

  const readOnlyMilestoneStatuses = [
    "COMPLETED",
    "DONE",
    "FINISHED",
    "APPROVED",
    "PAID",
    "RELEASED",
    "RESOLVED",
    "REFUNDED",
    "CLOSED",
    "CANCELLED",
    "CANCELED",
    "VOID",
    "DISPUTED",
    "REJECTED",
  ];

  const resolvedDisputeStatuses = [
    "RESOLVED",
    "CLOSED",
    "COMPLETED",
    "RELEASED",
    "REFUNDED",
  ];

  return (
    hasResolvedDispute ||
    readOnlyMilestoneStatuses.includes(milestoneStatus) ||
    resolvedDisputeStatuses.includes(disputeStatus)
  );
}

function isMilestoneCompleted(milestone) {
  const status = String(milestone?.status || "").toUpperCase();

  return [
    "COMPLETED",
    "DONE",
    "FINISHED",
    "APPROVED",
    "PAID",
    "RELEASED",
  ].includes(status);
}

function isProjectCompleted(status) {
  return ["COMPLETED", "DONE", "FINISHED", "CLOSED"].includes(
    String(status || "").toUpperCase()
  );
}

function getCompletionSummary(milestones) {
  const items = Array.isArray(milestones) ? milestones : [];
  const completed = items.filter(isMilestoneCompleted).length;
  const total = items.length;

  return {
    completed,
    total,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

function getStepCircleClass(state) {
  const map = {
    COMPLETED:
      "border-green-400 text-green-300 shadow-[0_0_18px_rgba(74,222,128,0.35)]",
    CURRENT:
      "border-cyan-400 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.35)]",
    BLOCKED:
      "border-red-400 text-red-300 shadow-[0_0_18px_rgba(248,113,113,0.35)]",
    UPCOMING: "border-white/20 text-gray-500",
  };

  return map[state] || map.UPCOMING;
}

function getStepTextClass(state) {
  const map = {
    COMPLETED: "text-green-300",
    CURRENT: "text-cyan-300",
    BLOCKED: "text-red-300",
    UPCOMING: "text-gray-500",
  };

  return map[state] || map.UPCOMING;
}

function getProjectStatusLabel(status) {
  return PROJECT_STATUS_LABEL?.[status] || formatStatusLabel(status || "ACTIVE");
}

function getPaymentStatusLabel(status) {
  const value = String(status || "").trim().toUpperCase();

  const map = {
    LOCKED: "Locked",
    FROZEN: "Frozen",
    PENDING: "Pending",
    RELEASED: "Released",
    PAID: "Released",
    REFUNDED: "Refunded",
    CANCELLED: "Cancelled",
    CANCELED: "Cancelled",
  };

  return map[value] || formatStatusLabel(value);
}

function getProjectGrossAmount(entity, milestones = []) {
  const direct = firstPositiveNumber(
    entity?.finalPrice,
    entity?.FinalPrice,
    entity?.contractAmount,
    entity?.ContractAmount,
    entity?.totalBudget,
    entity?.TotalBudget,
    entity?.totalAmount,
    entity?.TotalAmount,
    entity?.grossAmount,
    entity?.GrossAmount,
    entity?.raw?.finalPrice,
    entity?.raw?.FinalPrice,
    entity?.raw?.contractAmount,
    entity?.raw?.ContractAmount,
    entity?.raw?.totalBudget,
    entity?.raw?.TotalBudget,
    0
  );

  if (direct > 0) return direct;

  return (Array.isArray(milestones) ? milestones : []).reduce(
    (total, milestone) => total + getMilestoneAmount(milestone),
    0
  );
}

function getExpertFeeRate(entity) {
  return firstPositiveNumber(
    entity?.expertFeeRate,
    entity?.ExpertFeeRate,
    entity?.expertServiceFeeRate,
    entity?.ExpertServiceFeeRate,
    entity?.platformFeeRate,
    entity?.PlatformFeeRate,
    entity?.serviceFeeRate,
    entity?.ServiceFeeRate,
    entity?.contract?.expertFeeRate,
    entity?.contract?.ExpertFeeRate,
    entity?.contract?.expertServiceFeeRate,
    entity?.contract?.ExpertServiceFeeRate,
    entity?.contract?.platformFeeRate,
    entity?.contract?.PlatformFeeRate,
    entity?.Contract?.ExpertFeeRate,
    entity?.Contract?.ExpertServiceFeeRate,
    entity?.Contract?.PlatformFeeRate,
    entity?.raw?.expertFeeRate,
    entity?.raw?.ExpertFeeRate,
    entity?.raw?.expertServiceFeeRate,
    entity?.raw?.ExpertServiceFeeRate,
    entity?.raw?.platformFeeRate,
    entity?.raw?.PlatformFeeRate,
    0
  );
}

function getProjectServiceFee(entity, milestones = []) {
  const direct = firstPositiveNumber(
    entity?.expertFeeAmount,
    entity?.ExpertFeeAmount,
    entity?.expertServiceFeeAmount,
    entity?.ExpertServiceFeeAmount,
    entity?.platformFeeAmount,
    entity?.PlatformFeeAmount,
    entity?.serviceFeeAmount,
    entity?.ServiceFeeAmount,
    entity?.raw?.expertFeeAmount,
    entity?.raw?.ExpertFeeAmount,
    entity?.raw?.expertServiceFeeAmount,
    entity?.raw?.ExpertServiceFeeAmount,
    entity?.raw?.platformFeeAmount,
    entity?.raw?.PlatformFeeAmount,
    0
  );

  if (direct > 0) return direct;

  const milestoneFees = (Array.isArray(milestones) ? milestones : []).reduce(
    (total, milestone) => total + getMilestoneServiceFee(milestone),
    0
  );

  if (milestoneFees > 0) return milestoneFees;

  const rate = getExpertFeeRate(entity);
  const grossAmount = getProjectGrossAmount(entity, milestones);

  return rate > 0 && grossAmount > 0
    ? (grossAmount * rate) / 100
    : 0;
}

function getProjectNetEarning(entity, milestones = []) {
  const direct = firstPositiveNumber(
    entity?.expertReceivableAmount,
    entity?.ExpertReceivableAmount,
    entity?.expertNetAmount,
    entity?.ExpertNetAmount,
    entity?.netAmount,
    entity?.NetAmount,
    entity?.raw?.expertReceivableAmount,
    entity?.raw?.ExpertReceivableAmount,
    entity?.raw?.expertNetAmount,
    entity?.raw?.ExpertNetAmount,
    0
  );

  if (direct > 0) return direct;

  const grossAmount = getProjectGrossAmount(entity, milestones);
  const serviceFee = getProjectServiceFee(entity, milestones);

  return Math.max(grossAmount - serviceFee, 0);
}

function getMilestoneAmount(milestone) {
  return firstPositiveNumber(
    milestone?.amount,
    milestone?.Amount,
    milestone?.raw?.amount,
    milestone?.raw?.Amount,
    0
  );
}

function getRemainingMilestoneAmount(milestones = []) {
  return (Array.isArray(milestones) ? milestones : []).reduce(
    (total, milestone) => {
      const paymentStatus = String(
        milestone?.paymentStatus ||
          milestone?.PaymentStatus ||
          milestone?.escrowStatus ||
          milestone?.EscrowStatus ||
          milestone?.raw?.paymentStatus ||
          milestone?.raw?.PaymentStatus ||
          ""
      ).toUpperCase();

      if (["LOCKED", "FROZEN", "PENDING"].includes(paymentStatus)) {
        return total + getMilestoneAmount(milestone);
      }

      return total;
    },
    0
  );
}

function getMilestoneServiceFee(milestone) {
  const direct = firstPositiveNumber(
    milestone?.expertFeeAmount,
    milestone?.ExpertFeeAmount,
    milestone?.expertServiceFeeAmount,
    milestone?.ExpertServiceFeeAmount,
    milestone?.platformFeeAmount,
    milestone?.PlatformFeeAmount,
    milestone?.serviceFeeAmount,
    milestone?.ServiceFeeAmount,
    milestone?.raw?.expertFeeAmount,
    milestone?.raw?.ExpertFeeAmount,
    milestone?.raw?.expertServiceFeeAmount,
    milestone?.raw?.ExpertServiceFeeAmount,
    milestone?.raw?.platformFeeAmount,
    milestone?.raw?.PlatformFeeAmount,
    0
  );

  if (direct > 0) return direct;

  const rate = getExpertFeeRate(milestone);
  const amount = getMilestoneAmount(milestone);

  return rate > 0 && amount > 0
    ? (amount * rate) / 100
    : 0;
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}


function getProjectStartDate(project, milestones = []) {
  const directStartDate = getValue(
    project?.startDate,
    project?.StartDate,
    project?.escrowLockedAt,
    project?.EscrowLockedAt,
    project?.createdAt,
    project?.CreatedAt,
    project?.raw?.startDate,
    project?.raw?.StartDate,
    project?.raw?.escrowLockedAt,
    project?.raw?.EscrowLockedAt,
    project?.raw?.createdAt,
    project?.raw?.CreatedAt,
    ""
  );

  if (directStartDate) return directStartDate;

  const milestoneDates = (Array.isArray(milestones) ? milestones : [])
    .map((milestone) =>
      getValue(
        milestone?.startDate,
        milestone?.StartDate,
        milestone?.createdAt,
        milestone?.CreatedAt,
        milestone?.raw?.startDate,
        milestone?.raw?.StartDate,
        milestone?.raw?.createdAt,
        milestone?.raw?.CreatedAt,
        ""
      )
    )
    .map(toValidDate)
    .filter(Boolean);

  if (milestoneDates.length === 0) return null;

  return new Date(
    Math.min(...milestoneDates.map((date) => date.getTime()))
  ).toISOString();
}

function getProjectDeadline(project, milestones = []) {
  const directDeadline = getValue(
    project?.deadline,
    project?.Deadline,
    project?.projectDeadline,
    project?.ProjectDeadline,
    project?.expectedEndDate,
    project?.ExpectedEndDate,
    project?.dueDate,
    project?.DueDate,
    project?.raw?.deadline,
    project?.raw?.Deadline,
    project?.raw?.projectDeadline,
    project?.raw?.ProjectDeadline,
    project?.raw?.expectedEndDate,
    project?.raw?.ExpectedEndDate,
    project?.raw?.dueDate,
    project?.raw?.DueDate,
    ""
  );

  if (directDeadline) return directDeadline;

  const milestoneDeadlines = (Array.isArray(milestones) ? milestones : [])
    .map((milestone) =>
      getValue(
        milestone?.deadline,
        milestone?.Deadline,
        milestone?.dueDate,
        milestone?.DueDate,
        milestone?.endDate,
        milestone?.EndDate,
        milestone?.raw?.deadline,
        milestone?.raw?.Deadline,
        milestone?.raw?.dueDate,
        milestone?.raw?.DueDate,
        milestone?.raw?.endDate,
        milestone?.raw?.EndDate,
        ""
      )
    )
    .map(toValidDate)
    .filter(Boolean);

  if (milestoneDeadlines.length > 0) {
    return new Date(
      Math.max(...milestoneDeadlines.map((date) => date.getTime()))
    ).toISOString();
  }

  const startDate = toValidDate(getProjectStartDate(project, milestones));
  const totalDurationDays = (Array.isArray(milestones) ? milestones : []).reduce(
    (total, milestone) => {
      const duration = Number(
        getValue(
          milestone?.durationDays,
          milestone?.DurationDays,
          milestone?.raw?.durationDays,
          milestone?.raw?.DurationDays,
          0
        )
      );

      return total + (Number.isFinite(duration) && duration > 0 ? duration : 0);
    },
    0
  );

  if (!startDate || totalDurationDays <= 0) return null;

  const calculatedDeadline = new Date(startDate);
  calculatedDeadline.setDate(calculatedDeadline.getDate() + totalDurationDays);
  return calculatedDeadline.toISOString();
}

function getProjectCompletedDate(project) {
  return getValue(
    project?.endDate,
    project?.EndDate,
    project?.completedAt,
    project?.CompletedAt,
    project?.updatedAt,
    project?.UpdatedAt,
    project?.raw?.endDate,
    project?.raw?.EndDate,
    project?.raw?.completedAt,
    project?.raw?.CompletedAt,
    project?.raw?.updatedAt,
    project?.raw?.UpdatedAt,
    ""
  );
}

function toValidDate(value) {
  return parseUtcDate(value);
}

function getValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatServiceFee(value) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return formatMoney(0);
  }

  return `-${formatMoney(amount)}`;
}

function formatDate(value) {
  return formatDateTime(value, "N/A");
}

function formatInfoValue(value) {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  return value;
}

function formatStatusLabel(status) {
  return String(status || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatReference(value, prefix = "REF") {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";

  const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const compact = clean.length > 6 ? clean.slice(-6) : clean;

  return `${prefix}-${compact || raw.toUpperCase()}`;
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}