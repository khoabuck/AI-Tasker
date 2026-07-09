import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import projectService from "../../../services/project.service";
import { PROJECT_STATUS_LABEL } from "../../../constants/projectStatus";

const STATUS_TABS = [
  { key: "ALL", label: "All Projects" },
  { key: "ACTIVE", label: "Active" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "DISPUTED", label: "Disputed" },
  { key: "CANCELLED", label: "Cancelled" },
];

export default function MyProjectsPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [keyword, setKeyword] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await projectService.getMyProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD MY PROJECTS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load your projects."));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter(
        (item) =>
          getProjectStatusGroup(item.status) === "ACTIVE" ||
          getProjectStatusGroup(item.status) === "IN_PROGRESS"
      ).length,
      completed: projects.filter(
        (item) => getProjectStatusGroup(item.status) === "COMPLETED"
      ).length,
      disputed: projects.filter(
        (item) => getProjectStatusGroup(item.status) === "DISPUTED"
      ).length,
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return projects.filter((project) => {
      const group = getProjectStatusGroup(project.status);
      const matchTab = activeTab === "ALL" || group === activeTab;

      const matchKeyword =
        !search ||
        String(project.title || "").toLowerCase().includes(search) ||
        String(project.description || "").toLowerCase().includes(search) ||
        String(project.clientName || "").toLowerCase().includes(search);

      return matchTab && matchKeyword;
    });
  }, [projects, activeTab, keyword]);

  const openProject = (project) => {
    const projectId = getProjectId(project);

    if (!projectId) {
      setError("Cannot open project because project id is missing.");
      return;
    }

    navigate(`/expert/projects/${projectId}`);
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading your projects...
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                  Expert Workspace
                </p>

                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  My Projects
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Track your active projects, open project details, and continue
                  working on milestones from one place.
                </p>
              </div>

              <button
                type="button"
                onClick={loadProjects}
                className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Refresh
              </button>
            </div>
          </section>

          {error && (
            <Alert type="danger" title="Projects error" message={error} />
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard
              icon="work"
              label="Total Projects"
              value={summary.total}
            />

            <SummaryCard
              icon="rocket_launch"
              label="Active Work"
              value={summary.active}
            />

            <SummaryCard
              icon="task_alt"
              label="Completed"
              value={summary.completed}
            />

            <SummaryCard
              icon="report"
              label="Disputed"
              value={summary.disputed}
            />
          </div>

          <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                      activeTab === tab.key
                        ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300"
                        : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-[340px]">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-500">
                  search
                </span>

                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Search project or client..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF]"
                />
              </div>
            </div>
          </section>

          {filteredProjects.length === 0 ? (
            <EmptyState
              title="No projects found"
              description={
                projects.length === 0
                  ? "You do not have any projects yet."
                  : "Try changing your filter or search keyword."
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {filteredProjects.map((project, index) => (
                <ProjectCard
                  key={getProjectId(project) || index}
                  project={project}
                  onOpen={() => openProject(project)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function ProjectCard({ project, onOpen }) {
  const status = String(project.status || "ACTIVE").toUpperCase();

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22] p-6 transition hover:border-cyan-400/40">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />

            {project.deadline && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-gray-400">
                Due {formatDate(project.deadline)}
              </span>
            )}
          </div>

          <h2 className="line-clamp-2 text-xl font-extrabold text-white">
            {project.title || "Untitled Project"}
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Client: {project.clientName || "Client"}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          View Project
        </button>
      </div>

      <p className="mb-5 line-clamp-3 text-sm leading-6 text-gray-400">
        {project.description || "No project description."}
      </p>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <MiniInfo
          icon="payments"
          label="Budget"
          value={formatMoney(project.totalBudget)}
        />

        <MiniInfo
          icon="flag"
          label="Milestones"
          value={project.milestoneCount || project.milestones?.length || 0}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs text-gray-500">
        {project.startDate && <span>Started {formatDate(project.startDate)}</span>}
        {project.startDate && project.deadline && <span>•</span>}
        {project.deadline && <span>Deadline {formatDate(project.deadline)}</span>}
      </div>
    </article>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
        <span className="material-symbols-outlined text-cyan-300">{icon}</span>
      </div>

      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-400">{label}</p>
    </div>
  );
}

function MiniInfo({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2 text-gray-500">
        <span className="material-symbols-outlined text-base">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="font-bold text-white">{formatInfoValue(value)}</p>
    </div>
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
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {PROJECT_STATUS_LABEL?.[status] || formatStatusLabel(status)}
    </span>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center">
      <span className="material-symbols-outlined mb-4 block text-6xl text-gray-500">
        work_off
      </span>

      <h2 className="text-xl font-bold text-white">{title}</h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
        {description}
      </p>
    </div>
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

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatStatusLabel(status) {
  return String(status || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatInfoValue(value) {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  return value;
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}