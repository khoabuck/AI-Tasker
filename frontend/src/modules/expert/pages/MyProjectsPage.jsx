import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import projectService from "../../../services/project.service";
import { PROJECT_STATUS_LABEL } from "../../../constants/projectStatus";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "DISPUTED", label: "Disputed" },
  { key: "CANCELLED", label: "Cancelled" },
];

export default function MyProjectsPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    if (filter === "ALL") return projects;

    return projects.filter(
      (project) => String(project.status || "").toUpperCase() === filter
    );
  }, [projects, filter]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await projectService.getMyProjects();

      setProjects(data);
    } catch (err) {
      console.error("LOAD PROJECTS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load projects."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              My Projects
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Project workspace
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              View projects created from confirmed contracts and track
              milestones.
            </p>
          </div>

          {error && <Alert title="Project error" message={error} />}

          <div className="mb-6 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  filter === item.key
                    ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300"
                    : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center text-gray-400">
              Loading projects...
            </div>
          )}

          {!loading && filteredProjects.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center">
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                work
              </span>

              <h2 className="text-xl font-bold text-white">
                No projects found
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Projects will appear after contracts are confirmed and
                initialized.
              </p>

              <button
                type="button"
                onClick={() => navigate("/expert/proposals")}
                className="mt-6 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                View Proposals
              </button>
            </div>
          )}

          {!loading && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 gap-5">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.projectId}
                  project={project}
                  onDetail={() =>
                    navigate(`/expert/projects/${project.projectId}`)
                  }
                  onMilestones={() =>
                    navigate(`/expert/projects/${project.projectId}/milestones`)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function ProjectCard({ project, onDetail, onMilestones }) {
  const status = String(project.status || "").toUpperCase();

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22] p-6 transition hover:border-cyan-400/40">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />

            {project.contractId && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                Contract #{project.contractId}
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-white">
            {project.title || "Untitled Project"}
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Client: {project.clientName || "Client"}
          </p>

          <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-400">
            {project.description || "No description."}
          </p>
        </div>

        <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-72">
          <div className="space-y-4">
            <Info label="Budget" value={formatMoney(project.totalBudget)} />
            <Info label="Start Date" value={formatDate(project.startDate)} />
            <Info
              label="Deadline"
              value={formatDate(project.deadline || project.endDate)}
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onDetail}
                className="flex-1 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Detail
              </button>

              <button
                type="button"
                onClick={onMilestones}
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
              >
                Milestones
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value || "N/A"}</p>
    </div>
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
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {PROJECT_STATUS_LABEL[status] || status}
    </span>
  );
}

function Alert({ title, message }) {
  return (
    <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
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

  return date.toLocaleDateString();
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