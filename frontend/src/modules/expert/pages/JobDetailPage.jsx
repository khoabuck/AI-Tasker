import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";
import conversationService from "../../../services/conversation.service";
import proposalService from "../../../services/proposal.service";

import { formatDateTime, isExpired } from "../../../utils/dateTime.utils";
export function JobDetailModal({ jobId, onClose }) {
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, []);

  useEffect(() => {
    loadJobDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const loadJobDetail = async () => {
    try {
      setLoading(true);
      setLoadError("");
      setActionError("");

      const normalizedJob = await loadJobWithApplicationState(jobId);

      if (!normalizedJob.id) {
        throw new Error("This job is unavailable right now.");
      }

      setJob(normalizedJob);
    } catch (err) {
      console.error("LOAD JOB DETAIL MODAL ERROR:", err?.response?.data || err);

      setLoadError(getFriendlyError(err, "We could not load this job right now."));
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProposalAction = () => {
    if (!job?.id) return;

    onClose?.();
    navigate(getJobProposalTarget(job));
  };

  const handleMessageClient = async () => {
    await startConversationFromJob({
      job,
      navigate,
      setStartingChat,
      setActionError,
      onBeforeNavigate: onClose,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0f141d] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[#101722] px-5 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#00F0FF]">
              Job Detail
            </p>
            <h2 className="mt-0.5 text-base font-extrabold text-white">
              Review before applying
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-400 transition hover:border-red-400/50 hover:text-red-300"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="custom-scrollbar max-h-[84vh] overflow-y-auto p-4 md:p-5">
          {loading && <JobDetailSkeleton compact />}

          {!loading && loadError && (
            <FriendlyError
              title="Cannot load this job"
              message={loadError}
              onRetry={loadJobDetail}
            />
          )}

          {!loading && !loadError && job && (
            <JobDetailContent
              job={job}
              actionError={actionError}
              startingChat={startingChat}
              compact
              canMessageClient={Boolean(job.clientUserId || job.clientProfileId)}
              onProposalAction={handleProposalAction}
              onMessageClient={handleMessageClient}
            />
          )}
        </div>
      </div>

      <style>
        {`
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 240, 255, 0.35) transparent;
          }

          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }

          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(0, 240, 255, 0.28);
            border-radius: 999px;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 240, 255, 0.5);
          }
        `}
      </style>
    </div>
  );
}

export default function JobDetailPage() {
  const navigate = useNavigate();
  const { jobId } = useParams();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    loadJobDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const loadJobDetail = async () => {
    try {
      setLoading(true);
      setLoadError("");
      setActionError("");

      const normalizedJob = await loadJobWithApplicationState(jobId);

      if (!normalizedJob.id) {
        throw new Error("This job is unavailable right now.");
      }

      setJob(normalizedJob);
    } catch (err) {
      console.error("LOAD JOB DETAIL ERROR:", err?.response?.data || err);

      setLoadError(getFriendlyError(err, "We could not load this job right now."));
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProposalAction = () => {
    if (!job?.id) return;
    navigate(getJobProposalTarget(job));
  };

  const handleMessageClient = async () => {
    await startConversationFromJob({
      job,
      navigate,
      setStartingChat,
      setActionError,
    });
  };

  if (loading) {
    return (
      <ExpertLayout>
        <PageSkeleton cards={4} compact />
      </ExpertLayout>
    );
  }

  if (loadError) {
    return (
      <ExpertLayout>
        <div className="px-5 py-8 md:px-8">
          <div className="mx-auto max-w-5xl">
            <BackButton onClick={() => navigate("/expert/jobs")} />
            <FriendlyError
              title="Cannot load this job"
              message={loadError}
              onRetry={loadJobDetail}
            />
          </div>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <BackButton onClick={() => navigate("/expert/jobs")} />

          <JobDetailContent
            job={job}
            actionError={actionError}
            startingChat={startingChat}
            canMessageClient={Boolean(job?.clientUserId || job?.clientProfileId)}
            onProposalAction={handleProposalAction}
            onMessageClient={handleMessageClient}
          />
        </div>
      </div>
    </ExpertLayout>
  );
}


function PageSkeleton({ cards = 4, compact = false }) {
  return (
    <div className={`animate-pulse px-5 md:px-8 ${compact ? "py-6" : "py-10"}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 h-5 w-36 rounded-full bg-white/10" />

        <div className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8">
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



function JobDetailSkeleton({ compact = false }) {
  return (
    <div className="animate-pulse">
      <div className="mb-4 rounded-2xl border border-white/10 bg-[#151a22] p-5">
        <div className="h-5 w-32 rounded-full bg-white/10" />
        <div className="mt-4 h-8 w-3/4 rounded bg-white/10" />
        <div className="mt-3 h-4 w-1/2 rounded bg-white/[0.06]" />
      </div>

      <div className={`grid grid-cols-1 gap-4 ${compact ? "xl:grid-cols-[1fr_280px]" : "xl:grid-cols-[1fr_320px]"}`}>
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-32 rounded-2xl border border-white/10 bg-[#151a22]"
            />
          ))}
        </div>
        <div className="h-64 rounded-2xl border border-white/10 bg-[#151a22]" />
      </div>
    </div>
  );
}


function JobDetailContent({
  job,
  actionError,
  startingChat,
  canMessageClient,
  onProposalAction,
  onMessageClient,
  compact = false,
}) {
  const skills = useMemo(() => normalizeSkills(job?.skills), [job]);
  const canApply = isOpenJob(job?.status);

  return (
    <>
      {actionError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
          {actionError}
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-4 ${
          compact ? "xl:grid-cols-[1fr_280px]" : "xl:grid-cols-[1fr_320px]"
        }`}
      >
        <main className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-[#151a22] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={job.status} />
                  <Badge>{job.category || job.projectType || "General"}</Badge>
                  {job.complexity && <Badge tone="purple">{job.complexity}</Badge>}
                </div>

                <h1
                  className={`font-extrabold leading-tight text-white ${
                    compact ? "text-2xl" : "text-2xl md:text-3xl"
                  }`}
                >
                  {job.title || "Untitled Job"}
                </h1>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Posted by{" "}
                  <span className="font-bold text-white">
                    {job.clientName || "Client"}
                  </span>
                  {job.createdAt ? (
                    <>
                      {" "}
                      · <span>{formatDate(job.createdAt)}</span>
                    </>
                  ) : null}
                </p>

                <p className="mt-3 line-clamp-2 max-w-4xl text-sm leading-6 text-gray-400">
                  {job.description || "No project description provided."}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:w-[260px] lg:flex-col">
                <button
                  type="button"
                  onClick={onProposalAction}
                  disabled={!canApply && job.applicationStatus === "NONE"}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-gray-500"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {getProposalActionIcon(job)}
                  </span>
                  {getProposalActionLabel(job, canApply)}
                </button>

                <button
                  type="button"
                  onClick={onMessageClient}
                  disabled={startingChat || !canMessageClient}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-green-400/60 bg-green-400/10 px-4 py-2.5 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    chat
                  </span>
                  {startingChat ? "Opening..." : "Message Client"}
                </button>
              </div>
            </div>

            {!canMessageClient && (
              <p className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm leading-6 text-yellow-100/90">
                Messaging is not available for this job yet. You can still
                submit a proposal and include your questions there.
              </p>
            )}
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <QuickInfo
              icon="payments"
              label="Budget"
              value={formatBudget(job.budgetMin, job.budgetMax)}
            />

            <QuickInfo
              icon="schedule"
              label="Timeline"
              value={formatDuration(job.durationDays)}
            />

            <QuickInfo
              icon="event"
              label="Deadline"
              value={formatDate(job.deadline)}
            />
          </section>

          <InfoSection
            icon="article"
            title="Project Description"
            description="Understand what the client needs before writing your proposal."
          >
            <TextBlock value={job.description || "No project description provided."} />
          </InfoSection>

          <InfoSection
            icon="task_alt"
            title="Expected Outcomes"
            description="What the client expects to receive after the project."
          >
            <TextBlock
              value={
                job.expectedDeliverables ||
                "The client has not listed specific deliverables yet. You can clarify expected outcomes in your proposal."
              }
            />
          </InfoSection>

          <InfoSection
            icon="psychology"
            title="Skills Needed"
            description="Skills that may help you complete this project."
          >
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No specific skills listed by the client.
              </p>
            )}
          </InfoSection>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <ApplyCard
            job={job}
            canApply={canApply}
            startingChat={startingChat}
            canMessageClient={canMessageClient}
            onProposalAction={onProposalAction}
            onMessageClient={onMessageClient}
          />

          <SnapshotCard job={job} />
        </aside>
      </div>
    </>
  );
}

function ApplyCard({
  job,
  canApply,
  startingChat,
  canMessageClient,
  onProposalAction,
  onMessageClient,
}) {
  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
      <p className="text-sm font-extrabold text-white">Ready to apply?</p>

      <p className="mt-2 text-sm leading-6 text-cyan-100/80">
        Send a proposal explaining your approach, timeline, and expected
        deliverables.
      </p>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={onProposalAction}
          disabled={!canApply && job.applicationStatus === "NONE"}
          className="w-full rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-gray-500"
        >
          {getProposalActionLabel(job, canApply)}
        </button>

        <button
          type="button"
          onClick={onMessageClient}
          disabled={startingChat || !canMessageClient}
          className="w-full rounded-xl border border-green-400/50 bg-green-400/10 px-4 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {startingChat ? "Opening Chat..." : "Message Client"}
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-cyan-100/60">
        Job status: {formatStatus(job.status)}
      </p>
    </section>
  );
}

function SnapshotCard({ job }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-4">
      <h2 className="mb-3 text-base font-extrabold text-white">
        Job Snapshot
      </h2>

      <div className="space-y-2">
        <SnapshotRow
          label="Budget"
          value={formatBudget(job.budgetMin, job.budgetMax)}
        />

        <SnapshotRow label="Timeline" value={formatDuration(job.durationDays)} />

        <SnapshotRow label="Deadline" value={formatDate(job.deadline)} />

        <SnapshotRow
          label="Category"
          value={job.projectType || job.category || "General"}
        />

        <SnapshotRow label="Client" value={job.clientName || "Client"} />
      </div>
    </section>
  );
}

function SnapshotRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>

      <span className="max-w-[58%] text-right text-sm font-bold text-white">
        {value || "N/A"}
      </span>
    </div>
  );
}

function QuickInfo({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-4">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>

      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function InfoSection({ icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-4">
      <div className="mb-3 flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>

        <div>
          <h2 className="text-base font-extrabold text-white">{title}</h2>

          {description && (
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {description}
            </p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

function TextBlock({ value }) {
  return (
    <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
      {formatDisplayValue(value)}
    </p>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition hover:text-cyan-300"
    >
      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
      Back to jobs
    </button>
  );
}

function FriendlyError({ title, message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-10 text-center text-red-300">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/30 bg-red-400/10">
        <span className="material-symbols-outlined text-2xl">error</span>
      </div>

      <h2 className="text-lg font-bold text-white">{title}</h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6">{message}</p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-2.5 text-sm font-bold text-red-200 transition hover:bg-red-400 hover:text-black"
      >
        Try Again
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const active = isOpenJob(status);

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
        active
          ? "border-green-400/30 bg-green-400/10 text-green-300"
          : "border-gray-400/20 bg-white/[0.04] text-gray-400"
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function Badge({ children, tone = "cyan" }) {
  const style =
    tone === "green"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : tone === "purple"
      ? "border-purple-400/30 bg-purple-400/10 text-purple-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {children}
    </span>
  );
}

async function startConversationFromJob({
  job,
  navigate,
  setStartingChat,
  setActionError,
  onBeforeNavigate,
}) {
  if (!job) return;

  const conversationTargetId = job.clientUserId || job.clientProfileId;

  if (!conversationTargetId) {
    setActionError(
      "Messaging is not available for this job right now. You can still submit a proposal."
    );
    return;
  }

  try {
    setStartingChat(true);
    setActionError("");

    const conversation = await conversationService.createConversation({
      participantUserId: conversationTargetId,
      clientUserId: job.clientUserId,
      clientProfileId: job.clientProfileId,
      jobPostingId: job.id,
      initialMessage: `Hello ${
        job.clientName || "Client"
      }, I am interested in your job "${
        job.title || "this project"
      }". I would like to discuss the requirements with you.`,
    });

    const conversationId =
      conversation?.conversationId ||
      conversation?.ConversationId ||
      conversation?.id ||
      conversation?.Id;

    onBeforeNavigate?.();

    if (conversationId) {
      navigate(`/expert/messages?conversationId=${conversationId}`);
      return;
    }

    navigate("/expert/messages");
  } catch (err) {
    console.error("START CONVERSATION ERROR:", err?.response?.data || err);
    setActionError(
      getFriendlyError(
        err,
        "We could not open the conversation right now. Please try again."
      )
    );
  } finally {
    setStartingChat(false);
  }
}


async function loadJobWithApplicationState(jobId) {
  const [jobResult, proposalsResult, draftsResult] = await Promise.allSettled([
    jobService.getJobById(jobId),
    proposalService.getMyProposals(),
    proposalService.getMyDraftProposals(),
  ]);

  if (jobResult.status !== "fulfilled") {
    throw jobResult.reason;
  }

  const normalizedJob = normalizeLoadedJob(jobResult.value);
  const proposals =
    proposalsResult.status === "fulfilled" && Array.isArray(proposalsResult.value)
      ? proposalsResult.value
      : [];
  const drafts =
    draftsResult.status === "fulfilled" && Array.isArray(draftsResult.value)
      ? draftsResult.value
      : [];

  const proposal = findProposalForJob(proposals, normalizedJob.id, false);
  const draft = proposal
    ? null
    : findProposalForJob(drafts, normalizedJob.id, true);

  if (proposal) {
    return {
      ...normalizedJob,
      applicationStatus: "SUBMITTED",
      proposal,
      draft: null,
    };
  }

  if (draft) {
    return {
      ...normalizedJob,
      applicationStatus: "DRAFT",
      proposal: null,
      draft,
    };
  }

  return {
    ...normalizedJob,
    applicationStatus: "NONE",
    proposal: null,
    draft: null,
  };
}

function findProposalForJob(items, jobId, draftOnly) {
  if (!Array.isArray(items) || !jobId) return null;

  return (
    items.find((item) => {
      const status = String(item?.status || item?.Status || "").toUpperCase();
      const sameJob = String(getProposalJobId(item)) === String(jobId);

      if (!sameJob) return false;
      if (draftOnly) return !status || status === "DRAFT";
      return status !== "DRAFT";
    }) || null
  );
}

function getProposalJobId(proposal) {
  return (
    proposal?.jobId ||
    proposal?.jobPostingId ||
    proposal?.JobId ||
    proposal?.JobPostingId ||
    proposal?.raw?.jobId ||
    proposal?.raw?.jobPostingId ||
    proposal?.raw?.JobId ||
    proposal?.raw?.JobPostingId ||
    ""
  );
}

function getProposalId(proposal) {
  return (
    proposal?.proposalId ||
    proposal?.id ||
    proposal?.ProposalId ||
    proposal?.Id ||
    proposal?.raw?.proposalId ||
    proposal?.raw?.id ||
    proposal?.raw?.ProposalId ||
    proposal?.raw?.Id ||
    ""
  );
}

function getJobProposalTarget(job) {
  if (job?.applicationStatus === "SUBMITTED") {
    const proposalId = getProposalId(job.proposal);
    return proposalId
      ? `/expert/proposals/${proposalId}`
      : "/expert/proposals";
  }

  if (job?.applicationStatus === "DRAFT") {
    const draftId = getProposalId(job.draft);
    return draftId
      ? `/expert/jobs/${job.id}/proposal?draftId=${draftId}`
      : `/expert/jobs/${job.id}/proposal`;
  }

  return `/expert/jobs/${job.id}/proposal`;
}

function getProposalActionLabel(job, canApply) {
  if (job?.applicationStatus === "SUBMITTED") return "View Proposal";
  if (job?.applicationStatus === "DRAFT") return "Continue Draft";
  return canApply ? "Submit Proposal" : "Not accepting proposals";
}

function getProposalActionIcon(job) {
  if (job?.applicationStatus === "SUBMITTED") return "visibility";
  if (job?.applicationStatus === "DRAFT") return "edit_note";
  return "send";
}

function normalizeLoadedJob(data) {
  const job = unwrapData(data);

  return {
    raw: job,

    id: getJobId(job),

    title:
      getField(job, ["title", "Title", "jobTitle", "JobTitle"]) ||
      "Untitled Job",

    description:
      getField(job, [
        "description",
        "Description",
        "jobDescription",
        "JobDescription",
        "projectScope",
        "ProjectScope",
      ]) || "",

    expectedDeliverables:
      getField(job, [
        "expectedDeliverables",
        "ExpectedDeliverables",
        "deliverables",
        "Deliverables",
        "expectedOutputs",
        "ExpectedOutputs",
      ]) || "",

    status: getField(job, ["status", "Status"]) || "OPEN",

    category:
      getField(job, ["category", "Category", "projectType", "ProjectType"]) ||
      "General",

    projectType:
      getField(job, ["projectType", "ProjectType", "category", "Category"]) ||
      "General",

    complexity: getField(job, ["complexity", "Complexity"]) || "",

    skills: normalizeSkills(
      getField(job, [
        "skills",
        "Skills",
        "requiredSkills",
        "RequiredSkills",
        "skillNames",
        "SkillNames",
      ])
    ),

    budgetMin: Number(
      getField(job, ["budgetMin", "BudgetMin", "minBudget", "MinBudget"], 0)
    ),

    budgetMax: Number(
      getField(
        job,
        ["budgetMax", "BudgetMax", "maxBudget", "MaxBudget", "fixedBudget", "FixedBudget"],
        0
      )
    ),

    durationDays: Number(
      getField(
        job,
        [
          "durationDays",
          "DurationDays",
          "estimatedDurationDays",
          "EstimatedDurationDays",
          "timelineDays",
          "TimelineDays",
        ],
        0
      )
    ),

    deadline:
      getField(job, [
        "deadline",
        "Deadline",
        "proposalDeadline",
        "ProposalDeadline",
        "expiresAt",
        "ExpiresAt",
      ]) || null,

    createdAt: getField(job, ["createdAt", "CreatedAt"]) || null,

    clientName: getClientName(job),
    clientUserId: getClientUserId(job),
    clientProfileId: getClientProfileId(job),
  };
}

function unwrapData(value) {
  if (!value) return value;

  if (value?.data?.data !== undefined) return value.data.data;
  if (value?.data !== undefined && value?.success !== undefined) return value.data;
  if (value?.data !== undefined && value?.status !== undefined) return value.data;

  return value;
}

function getField(object, keys = [], fallback = "") {
  for (const key of keys) {
    const value = getByPath(object, key);

    if (value !== undefined && value !== null && value !== "") {
      return value;
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

function getJobId(job) {
  return getField(job, [
    "id",
    "Id",
    "jobId",
    "JobId",
    "jobPostingId",
    "JobPostingId",
    "ID",
  ]);
}

function getClientUserId(job) {
  return getField(job, [
    "clientUserId",
    "ClientUserId",
    "client.userId",
    "client.UserId",
    "client.id",
    "client.Id",
    "clientProfile.userId",
    "ClientProfile.UserId",
    "raw.clientUserId",
    "raw.ClientUserId",
  ]);
}

function getClientProfileId(job) {
  return getField(job, [
    "clientProfileId",
    "ClientProfileId",
    "clientProfile.clientProfileId",
    "ClientProfile.ClientProfileId",
    "client.clientProfileId",
    "Client.ClientProfileId",
    "raw.clientProfileId",
    "raw.ClientProfileId",
  ]);
}

function getClientName(job) {
  return (
    getField(job, [
      "clientName",
      "ClientName",
      "client.fullName",
      "client.FullName",
      "client.name",
      "client.Name",
      "clientProfile.fullName",
      "ClientProfile.FullName",
      "businessName",
      "BusinessName",
    ]) || "Client"
  );
}

function normalizeSkills(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;

        return (
          item?.name ||
          item?.Name ||
          item?.skillName ||
          item?.SkillName ||
          item?.title ||
          item?.Title
        );
      })
      .filter(Boolean)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isOpenJob(status) {
  return ["OPEN", "ACTIVE", "PUBLISHED", "AVAILABLE"].includes(
    String(status || "").toUpperCase()
  );
}

function formatStatus(value) {
  if (!value) return "Open";

  const status = String(value).toUpperCase();

  const map = {
    OPEN: "Open",
    ACTIVE: "Open",
    PUBLISHED: "Open",
    AVAILABLE: "Open",
    CLOSED: "Closed",
    CANCELLED: "Cancelled",
    CANCELED: "Cancelled",
    DRAFT: "Draft",
  };

  return map[status] || String(value).replaceAll("_", " ");
}

function formatBudget(min, max) {
  const minValue = Number(min || 0);
  const maxValue = Number(max || 0);

  if (!minValue && !maxValue) return "Negotiable";
  if (minValue && !maxValue) return `From ${formatMoney(minValue)}`;
  if (!minValue && maxValue) return `Up to ${formatMoney(maxValue)}`;

  return `${formatMoney(minValue)} - ${formatMoney(maxValue)}`;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatDuration(days) {
  const number = Number(days || 0);

  if (!number || number <= 0) return "Flexible";
  if (number === 1) return "1 day";

  return `${number} days`;
}

function formatDate(value) {
  return formatDateTime(value, "Flexible");
}

function formatDisplayValue(value) {
  if (value === undefined || value === null || value === "") return "N/A";

  if (typeof value === "object") {
    return (
      value.title ||
      value.Title ||
      value.name ||
      value.Name ||
      value.description ||
      value.Description ||
      "N/A"
    );
  }

  return String(value);
}

function getFriendlyError(err, fallback) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "You do not have permission to do this action.";
  }

  if (status === 404) {
    return "This job could not be found. It may have been removed or closed.";
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

  return err?.message || fallback || "Something went wrong.";
}