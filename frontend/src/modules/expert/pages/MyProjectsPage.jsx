import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import projectService from "../../../services/project.service";

export default function MyProjectsPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMyProjects();
  }, []);

  const loadMyProjects = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await projectService.getMyProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
      setError("Cannot load your projects. Please check backend API.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const getProjectId = (project) => {
    return project.id || project.projectId || project.projectID;
  };

  const getProjectTitle = (project) => {
    return (
      project.title ||
      project.projectTitle ||
      project.name ||
      project.jobTitle ||
      project.job?.title ||
      "Untitled Project"
    );
  };

  const getProjectDescription = (project) => {
    return (
      project.description ||
      project.projectDescription ||
      project.summary ||
      project.job?.description ||
      ""
    );
  };

  const getClientName = (project) => {
    return (
      project.clientName ||
      project.client?.fullName ||
      project.client?.name ||
      "Client"
    );
  };

  const getStatus = (project) => {
    return project.status || project.projectStatus || "ACTIVE";
  };

  const getBudget = (project) => {
    return (
      project.budget ||
      project.totalBudget ||
      project.contractValue ||
      project.amount ||
      project.proposedBudget ||
      0
    );
  };

  const getDeadline = (project) => {
    return (
      project.deadline ||
      project.endDate ||
      project.dueDate ||
      project.expectedEndDate
    );
  };

  const getStartedAt = (project) => {
    return project.startDate || project.startedAt || project.createdAt;
  };

  const formatDate = (value) => {
    if (!value) return "No date";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "No date";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const getStatusClass = (status) => {
    const value = String(status).toUpperCase();

    if (value === "ACTIVE" || value === "IN_PROGRESS") {
      return "border-green-400/30 bg-green-400/10 text-green-300";
    }

    if (value === "COMPLETED" || value === "DONE") {
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
    }

    if (value === "CANCELLED" || value === "FAILED") {
      return "border-red-400/30 bg-red-400/10 text-red-300";
    }

    if (value === "PENDING") {
      return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
    }

    return "border-gray-400/30 bg-gray-400/10 text-gray-300";
  };

  const filteredProjects = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return projects.filter((project) => {
      const status = String(getStatus(project)).toUpperCase();
      const title = getProjectTitle(project).toLowerCase();
      const description = getProjectDescription(project).toLowerCase();
      const clientName = getClientName(project).toLowerCase();

      const matchStatus =
        statusFilter === "ALL" || status === statusFilter.toUpperCase();

      const matchSearch =
        !keyword ||
        title.includes(keyword) ||
        description.includes(keyword) ||
        clientName.includes(keyword);

      return matchStatus && matchSearch;
    });
  }, [projects, statusFilter, searchText]);

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Expert Projects
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                My projects
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Track your active projects, deadlines, budgets, and
                deliverables.
              </p>
            </div>

            <button
              type="button"
              onClick={loadMyProjects}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Refresh
            </button>
          </div>

          {/* Filter */}
          <div className={`${cardStyle} mb-6 p-6`}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px_160px]">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Search Project
                </label>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    search
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search by title, description, or client..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Total
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {filteredProjects.length}
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading projects...
            </div>
          )}

          {/* Empty */}
          {!loading && filteredProjects.length === 0 && (
            <div className={`${cardStyle} p-12 text-center`}>
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                folder_off
              </span>

              <h2 className="text-xl font-bold text-white">
                No projects found
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                When a client accepts your proposal, the project will appear
                here.
              </p>

              <button
                type="button"
                onClick={() => navigate("/expert/jobs")}
                className="mt-6 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Browse Jobs
              </button>
            </div>
          )}

          {/* Project List */}
          {!loading && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 gap-5">
              {filteredProjects.map((project) => {
                const projectId = getProjectId(project);
                const status = getStatus(project);

                return (
                  <article
                    key={projectId}
                    className={`${cardStyle} p-6 transition hover:border-cyan-400/40 hover:shadow-[0_0_35px_rgba(0,240,255,0.08)]`}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                              status
                            )}`}
                          >
                            {status}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                            Started {formatDate(getStartedAt(project))}
                          </span>
                        </div>

                        <h2 className="text-xl font-bold text-white">
                          {getProjectTitle(project)}
                        </h2>

                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                          {getProjectDescription(project) ||
                            "No description provided."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                            Client: {getClientName(project)}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                            Deadline: {formatDate(getDeadline(project))}
                          </span>
                        </div>
                      </div>

                      <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-72">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs uppercase tracking-wider text-gray-500">
                              Budget
                            </p>
                            <p className="mt-1 text-xl font-bold text-white">
                              ${getBudget(project)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wider text-gray-500">
                              Deadline
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-300">
                              {formatDate(getDeadline(project))}
                            </p>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/expert/projects/${projectId}`)
                              }
                              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
                            >
                              Detail
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/expert/projects/${projectId}/deliverables`
                                )
                              }
                              className="flex-1 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                            >
                              Deliver
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}