import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import projectService from "../../../services/project.service";
import { PROJECT_STATUS_LABEL } from "../../../constants/projectStatus";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await projectService.getProjectById(projectId);

      setProject(data);
    } catch (err) {
      console.error("LOAD PROJECT DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load project detail."));
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteCheck = async () => {
    const ok = window.confirm(
      "Do you want to run project complete check now?"
    );

    if (!ok) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const data = await projectService.completeCheck(projectId);

      if (data?.projectId) {
        setProject(data);
      } else {
        await loadProject();
      }

      setMessage("Project complete check finished.");
    } catch (err) {
      console.error("COMPLETE CHECK ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot run complete check."));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading project detail...
        </div>
      </ExpertLayout>
    );
  }

  if (!project) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert type="danger" title="Project not found" message={error} />

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

  const status = String(project.status || "").toUpperCase();

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

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Project Detail
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                {project.title || "Untitled Project"}
              </h1>

              <p className="mt-2 text-sm text-gray-400">
                Client: {project.clientName || "Client"}
              </p>

              <div className="mt-4">
                <StatusBadge status={status} />
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

              <button
                type="button"
                onClick={() =>
                  navigate(`/expert/projects/${project.projectId}/milestones`)
                }
                className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                View Milestones
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCompleteCheck}
                className="rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? "Checking..." : "Complete Check"}
              </button>
            </div>
          </div>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && <Alert type="danger" title="Project error" message={error} />}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="Description">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {project.description || "No description."}
                </p>
              </Card>

              <Card title="Milestones Preview">
                {project.milestones.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No milestone data returned in project detail. Open
                    milestones page to load them.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {project.milestones.map((milestone) => (
                      <MilestonePreview
                        key={milestone.milestoneId}
                        milestone={milestone}
                        onClick={() =>
                          navigate(`/expert/milestones/${milestone.milestoneId}`)
                        }
                      />
                    ))}
                  </div>
                )}
              </Card>
            </main>

            <aside className="space-y-6">
              <Card title="Project Summary">
                <Info label="Budget" value={formatMoney(project.totalBudget)} />
                <Info label="Status" value={PROJECT_STATUS_LABEL[status] || status} />
                <Info label="Start Date" value={formatDate(project.startDate)} />
                <Info
                  label="Deadline"
                  value={formatDate(project.deadline || project.endDate)}
                />
                <Info label="Contract ID" value={project.contractId ? `#${project.contractId}` : "N/A"} />
                <Info label="Created At" value={formatDate(project.createdAt)} />
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
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

function MilestonePreview({ milestone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-cyan-400/40"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-bold text-white">{milestone.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-gray-400">
            {milestone.description || "No description."}
          </p>
        </div>

        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase text-cyan-300">
          {milestone.status}
        </span>
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "COMPLETED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : status === "CANCELLED" || status === "DISPUTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}>
      {PROJECT_STATUS_LABEL[status] || status}
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

function formatMoney(value) {
  const number = Number(value || 0);
  if (!number) return "$0";
  return `$${number.toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
}

function getFriendlyError(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.response?.data ||
    err?.message ||
    fallback
  );
}