import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import projectService from "../../../services/project.service";
import { PROJECT_STATUS_LABEL } from "../../../constants/projectStatus";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);

  const [loading, setLoading] = useState(true);
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [completionChecking, setCompletionChecking] = useState(false);

  const [error, setError] = useState("");
  const [milestoneError, setMilestoneError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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

  const loadProject = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      setMilestoneError("");
      setMilestones([]);

      const data = await projectService.getProjectById(projectId);

      setProject(data);

      if (Array.isArray(data?.milestones) && data.milestones.length > 0) {
        setMilestones(data.milestones);
      }

      const realProjectId = getProjectId(data) || projectId;

      if (realProjectId) {
        await loadProjectMilestones(realProjectId);
      }
    } catch (err) {
      console.error("LOAD PROJECT DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load project detail."));
      setProject(null);
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectMilestones = async (targetProjectId) => {
    if (!targetProjectId) return;

    try {
      setMilestoneLoading(true);
      setMilestoneError("");

      const data = await projectService.getProjectMilestones(targetProjectId);

      setMilestones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(
        "LOAD PROJECT MILESTONES ERROR:",
        err?.response?.data || err
      );

      setMilestoneError(
        getFriendlyError(err, "Cannot load project milestones.")
      );
    } finally {
      setMilestoneLoading(false);
    }
  };

  const handleCompleteCheck = async () => {
    const realProjectId = getProjectId(project) || projectId;

    if (!realProjectId) {
      setError("Cannot run completion check because project id is missing.");
      return;
    }

    try {
      setCompletionChecking(true);
      setError("");
      setMessage("");

      await projectService.completeCheck(realProjectId);

      setMessage("Completion check finished. Project status has been updated.");
      await loadProject();
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
      setError("Cannot open milestone because milestone id is missing.");
      return;
    }

    navigate(`/expert/milestones/${milestoneId}`);
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading project...
        </div>
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

          <section className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                  Project Workspace
                </p>

                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {project.title || "Untitled Project"}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Review project requirements, open milestones, and submit your
                  work from one place.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <StatusBadge status={status} />

                  <InfoPill
                    icon="person"
                    label={project.clientName || "Client"}
                  />

                  <InfoPill
                    icon="payments"
                    label={formatMoney(project.totalBudget)}
                    variant="success"
                  />

                  <InfoPill
                    icon="flag"
                    label={`${displayedMilestones.length} milestone${
                      displayedMilestones.length === 1 ? "" : "s"
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
                    View Agreement
                  </button>
                )}

                <button
                  type="button"
                  onClick={loadProject}
                  disabled={milestoneLoading || completionChecking}
                  className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {milestoneLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
          </section>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Project error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="Project Overview" icon="description">
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

                {displayedMilestones.length > 0 && (
                  <MilestoneProgressTimeline
                    milestones={displayedMilestones}
                    onSelect={openMilestone}
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
                      No milestones found
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">
                      Milestones will appear here when this project is ready.
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
              <Card title="Quick Overview" icon="monitoring">
                <Info label="Status" value={getProjectStatusLabel(status)} />
                <Info label="Budget" value={formatMoney(project.totalBudget)} />
                <Info label="Milestones" value={displayedMilestones.length} />
                <Info
                  label="Completed"
                  value={`${completionSummary.completed}/${displayedMilestones.length}`}
                />
                <Info
                  label="Progress"
                  value={`${Math.round(
                    Number(project.progressPercent || completionSummary.progress)
                  )}%`}
                />
                <Info label="Start Date" value={formatDate(project.startDate)} />
                <Info
                  label="Deadline"
                  value={formatDate(project.deadline || project.endDate)}
                />
              </Card>

              <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-cyan-300">
                    tips_and_updates
                  </span>

                  <div>
                    <h3 className="font-bold text-white">How to continue</h3>

                    <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                      <li>Open a milestone to view requirements.</li>
                      <li>Submit work directly inside milestone detail.</li>
                      <li>Track client feedback from your submissions.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-green-400/20 bg-green-400/10 p-5">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-300">
                    task_alt
                  </span>

                  <div>
                    <h3 className="font-bold text-white">Completion Check</h3>

                    <p className="mt-2 text-sm leading-6 text-green-100/80">
                      Run this check after all milestones are approved or
                      completed. The system will verify whether the project can
                      move to completed status.
                    </p>

                    <button
                      type="button"
                      disabled={!canRunCompletionCheck || completionChecking}
                      onClick={handleCompleteCheck}
                      className="mt-4 w-full rounded-xl border border-green-400/50 bg-green-400/10 px-4 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {completionChecking
                        ? "Checking..."
                        : canRunCompletionCheck
                        ? "Run Completion Check"
                        : isProjectCompleted(status)
                        ? "Project Completed"
                        : "Complete all milestones first"}
                    </button>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function MilestoneCard({ milestone, onOpen }) {
  const status = String(milestone.status || "PENDING").toUpperCase();
  const completed = isMilestoneCompleted(milestone);

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
          className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
            completed
              ? "border-white/10 bg-white/[0.04] text-gray-300 hover:text-white"
              : "border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-black"
          }`}
        >
          {completed ? "View Details" : "Open Milestone"}
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

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString();
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

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}