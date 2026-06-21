import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";
import conversationService from "../../../services/conversation.service";

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

      const data = await jobService.getJobById(jobId);
      const normalizedJobId = getJobId(data);

      if (!normalizedJobId) {
        throw new Error("Job detail does not have a valid id.");
      }

      setJob(normalizeLoadedJob(data));
    } catch (err) {
      console.error("LOAD JOB DETAIL MODAL ERROR:", err?.response?.data || err);

      setLoadError(
        err?.response?.data?.message ||
          err?.message ||
          "We could not load this job right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProposal = () => {
    if (!job?.id) return;

    onClose?.();
    navigate(`/expert/jobs/${job.id}/proposal`);
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
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#0f141d] shadow-[0_30px_120px_rgba(0,0,0,0.7)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0f141d]/95 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Project Detail
            </p>

            <h2 className="mt-1 text-lg font-extrabold text-white">
              Review before applying
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-400 transition hover:border-red-400/50 hover:text-red-300"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="custom-scrollbar max-h-[82vh] overflow-y-auto p-5 md:p-6">
          {loading && (
            <div className="flex min-h-[45vh] items-center justify-center text-gray-400">
              Loading project detail...
            </div>
          )}

          {!loading && loadError && (
            <div className="rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-12 text-center text-red-300">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10">
                <span className="material-symbols-outlined text-3xl">
                  error
                </span>
              </div>

              <h2 className="text-xl font-bold text-white">
                Cannot load this job
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6">
                {loadError}
              </p>

              <button
                type="button"
                onClick={loadJobDetail}
                className="mt-6 rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-200 transition hover:bg-red-400 hover:text-black"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !loadError && job && (
            <JobDetailContent
              job={job}
              actionError={actionError}
              startingChat={startingChat}
              compact
              canMessageClient={Boolean(
                getClientUserId(job) || getClientProfileId(job)
              )}
              onSubmitProposal={handleSubmitProposal}
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

      const data = await jobService.getJobById(jobId);
      const normalizedJobId = getJobId(data);

      if (!normalizedJobId) {
        throw new Error("Job detail does not have a valid id.");
      }

      setJob(normalizeLoadedJob(data));
    } catch (err) {
      console.error("LOAD JOB DETAIL ERROR:", err?.response?.data || err);

      setLoadError(
        err?.response?.data?.message ||
          err?.message ||
          "We could not load this job right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProposal = () => {
    if (!job?.id) return;

    navigate(`/expert/jobs/${job.id}/proposal`);
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
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading job detail...
        </div>
      </ExpertLayout>
    );
  }

  if (loadError) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <BackButton onClick={() => navigate("/expert/jobs")} />

            <div className="rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-12 text-center text-red-300">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10">
                <span className="material-symbols-outlined text-3xl">
                  error
                </span>
              </div>

              <h2 className="text-xl font-bold text-white">
                Cannot load this job
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6">
                {loadError}
              </p>

              <button
                type="button"
                onClick={loadJobDetail}
                className="mt-6 rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-200 transition hover:bg-red-400 hover:text-black"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <BackButton onClick={() => navigate("/expert/jobs")} />

          <JobDetailContent
            job={job}
            actionError={actionError}
            startingChat={startingChat}
            canMessageClient={Boolean(
              getClientUserId(job) || getClientProfileId(job)
            )}
            onSubmitProposal={handleSubmitProposal}
            onMessageClient={handleMessageClient}
          />
        </div>
      </div>
    </ExpertLayout>
  );
}

function JobDetailContent({
  job,
  actionError,
  startingChat,
  canMessageClient,
  onSubmitProposal,
  onMessageClient,
  compact = false,
}) {
  const skills = useMemo(() => normalizeSkills(job?.skills), [job]);

  const hasExpectedDeliverables = Boolean(
    String(job?.expectedDeliverables || "").trim()
  );

  return (
    <>
      {actionError && (
        <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm leading-6 text-red-300">
          {actionError}
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-5 ${
          compact ? "xl:grid-cols-[1fr_280px]" : "xl:grid-cols-[1fr_320px]"
        }`}
      >
        <main className="space-y-5">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="border-b border-white/10 bg-white/[0.02] p-5 md:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge tone="green">{formatStatus(job.status)}</Badge>
                <Badge>{job.category || job.projectType || "General"}</Badge>
                {job.complexity && (
                  <Badge tone="purple">{job.complexity}</Badge>
                )}
              </div>

              <h1
                className={`max-w-4xl font-extrabold leading-tight text-white ${
                  compact ? "text-2xl md:text-3xl" : "text-3xl md:text-5xl"
                }`}
              >
                {job.title || "Untitled Job"}
              </h1>

              <p className="mt-4 max-w-4xl whitespace-pre-line text-sm leading-7 text-gray-400">
                {job.description || "No project description provided."}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onSubmitProposal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    send
                  </span>
                  Submit Proposal
                </button>

                <button
                  type="button"
                  onClick={onMessageClient}
                  disabled={startingChat || !canMessageClient}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-400/60 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    chat
                  </span>
                  {startingChat ? "Opening Chat..." : "Message Client"}
                </button>
              </div>

              {!canMessageClient && (
                <p className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm leading-6 text-yellow-200">
                  Messaging is currently unavailable for this job. You can still
                  submit a proposal to contact the client through your
                  application.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-3 md:p-6">
              <MiniInfo
                icon="payments"
                label="Budget"
                value={formatBudget(job.budgetMin, job.budgetMax)}
              />

              <MiniInfo
                icon="schedule"
                label="Timeline"
                value={job.durationDays ? `${job.durationDays} days` : "Flexible"}
              />

              <MiniInfo
                icon="event"
                label="Deadline"
                value={formatDate(job.deadline)}
              />
            </div>
          </section>

          <InfoSection
            icon="article"
            title="Project Description"
            description="Review the client’s requirements carefully before submitting your proposal."
          >
            <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
              {job.description || "No project description provided."}
            </p>
          </InfoSection>

          <InfoSection
            icon="psychology"
            title="Required Skills"
            description="Skills the client expects for this project."
          >
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No specific skills listed.</p>
            )}
          </InfoSection>

          <InfoSection
            icon="task_alt"
            title="Expected Outcomes"
            description="What the client expects to receive when the project is completed."
          >
            <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
              {hasExpectedDeliverables
                ? job.expectedDeliverables
                : "The client has not listed specific deliverables yet. You can clarify expected outcomes in your proposal or message."}
            </p>
          </InfoSection>
        </main>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <CompactSnapshot job={job} />
        </aside>
      </div>
    </>
  );
}

function CompactSnapshot({ job }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#151a22] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
      <h2 className="mb-4 text-lg font-extrabold text-white">
        Project Snapshot
      </h2>

      <div className="space-y-3">
        <SnapshotRow
          label="Budget"
          value={formatBudget(job.budgetMin, job.budgetMax)}
        />

        <SnapshotRow
          label="Timeline"
          value={job.durationDays ? `${job.durationDays} days` : "Flexible"}
        />

        <SnapshotRow label="Deadline" value={formatDate(job.deadline)} />

        <SnapshotRow
          label="Project Type"
          value={job.projectType || job.category || "General"}
        />

        <SnapshotRow label="Client" value={job.clientName || "Client"} />
      </div>
    </section>
  );
}

function SnapshotRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>

      <span className="max-w-[55%] text-right text-sm font-bold text-white">
        {value || "N/A"}
      </span>
    </div>
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

  const clientUserId = getClientUserId(job);
  const clientProfileId = getClientProfileId(job);
  const conversationTargetId = clientUserId || clientProfileId;

  if (!conversationTargetId) {
    setActionError(
      "Messaging is not available for this job right now. Please try again later."
    );
    return;
  }

  try {
    setStartingChat(true);
    setActionError("");

    const conversation = await conversationService.createConversation({
      participantUserId: conversationTargetId,
      clientUserId,
      clientProfileId,
      jobPostingId: getJobId(job),
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

function normalizeLoadedJob(data) {
  return {
    ...data,
    id: getJobId(data),
    clientUserId: getClientUserId(data),
    clientProfileId: getClientProfileId(data),
    clientName: getClientName(data),
  };
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition hover:text-cyan-300"
    >
      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
      Back to jobs
    </button>
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

function MiniInfo({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function InfoSection({ icon, title, description, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#151a22] p-5 md:p-6">
      <SectionHeader icon={icon} title={title} description={description} />

      <div className="mt-5">{children}</div>
    </section>
  );
}

function SectionHeader({ icon, title, description }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-white">{title}</h2>

        {description && (
          <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function getJobId(job) {
  return (
    job?.id ||
    job?.jobId ||
    job?.JobId ||
    job?.jobPostingId ||
    job?.JobPostingId ||
    job?.ID ||
    job?.Id
  );
}

function getClientUserId(job) {
  return (
    job?.clientUserId ||
    job?.ClientUserId ||
    job?.client?.userId ||
    job?.client?.UserId ||
    job?.client?.id ||
    job?.client?.Id ||
    job?.clientProfile?.userId ||
    job?.ClientProfile?.UserId ||
    job?.raw?.clientUserId ||
    job?.raw?.ClientUserId
  );
}

function getClientProfileId(job) {
  return (
    job?.clientProfileId ||
    job?.ClientProfileId ||
    job?.clientProfile?.clientProfileId ||
    job?.ClientProfile?.ClientProfileId ||
    job?.client?.clientProfileId ||
    job?.Client?.ClientProfileId ||
    job?.raw?.clientProfileId ||
    job?.raw?.ClientProfileId
  );
}

function getClientName(job) {
  return (
    job?.clientName ||
    job?.ClientName ||
    job?.client?.fullName ||
    job?.client?.FullName ||
    job?.client?.name ||
    job?.client?.Name ||
    job?.clientProfile?.fullName ||
    job?.ClientProfile?.FullName ||
    "Client"
  );
}

function normalizeSkills(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.name || item?.Name || item?.skillName || item?.SkillName;
      })
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatBudget(min, max) {
  const minValue = Number(min || 0);
  const maxValue = Number(max || 0);

  if (!minValue && !maxValue) return "Negotiable";
  if (minValue && !maxValue) return `From $${minValue}`;
  if (!minValue && maxValue) return `Up to $${maxValue}`;

  return `$${minValue} - $${maxValue}`;
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatStatus(value) {
  if (!value) return "OPEN";

  return String(value).replaceAll("_", " ");
}

function getFriendlyError(err, fallback) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "You do not have permission to start this conversation.";
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