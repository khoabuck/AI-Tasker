import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import projectService from "../../../services/project.service";
import milestoneService from "../../../services/milestone.service";

export default function ProjectMilestonesPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPageData();
  }, [projectId]);

  const loadPageData = async () => {
    try {
      setLoading(true);
      setError("");

      const projectData = await projectService.getProjectById(projectId);
      const milestoneData = await milestoneService.getMilestonesByProject(
        projectId
      );

      setProject(projectData);
      setMilestones(milestoneData);
    } catch (err) {
      console.error(err);
      setError("Cannot load milestones. Please check backend API.");
      setProject(null);
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  };

  const getProjectTitle = () => {
    return (
      project?.title ||
      project?.projectTitle ||
      project?.name ||
      project?.jobTitle ||
      project?.job?.title ||
      "Untitled Project"
    );
  };

  const getProjectStatus = () => {
    return project?.status || project?.projectStatus || "ACTIVE";
  };

  const getMilestoneId = (milestone) => {
    return milestone.id || milestone.milestoneId || milestone.milestoneID;
  };

  const getMilestoneTitle = (milestone, index) => {
    return (
      milestone.title ||
      milestone.name ||
      milestone.milestoneTitle ||
      `Milestone ${index + 1}`
    );
  };

  const getMilestoneDescription = (milestone) => {
    return milestone.description || milestone.detail || "";
  };

  const getMilestoneStatus = (milestone) => {
    return milestone.status || "PENDING";
  };

  const getMilestoneAmount = (milestone) => {
    return (
      milestone.amount ||
      milestone.budget ||
      milestone.milestoneAmount ||
      milestone.paymentAmount ||
      0
    );
  };

  const getMilestoneDueDate = (milestone) => {
    return (
      milestone.dueDate ||
      milestone.deadline ||
      milestone.endDate ||
      milestone.expectedEndDate
    );
  };

  const getMilestoneCreatedAt = (milestone) => {
    return milestone.createdAt || milestone.startDate || milestone.createdDate;
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

  const formatMoney = (value) => {
    const number = Number(value || 0);
    return `$${number.toLocaleString("en-US")}`;
  };

  const getStatusClass = (status) => {
    const value = String(status).toUpperCase();

    if (value === "COMPLETED" || value === "DONE" || value === "APPROVED") {
      return "border-green-400/30 bg-green-400/10 text-green-300";
    }

    if (value === "ACTIVE" || value === "IN_PROGRESS") {
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
    }

    if (value === "PENDING") {
      return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
    }

    if (value === "REJECTED" || value === "CANCELLED") {
      return "border-red-400/30 bg-red-400/10 text-red-300";
    }

    return "border-gray-400/30 bg-gray-400/10 text-gray-300";
  };

  const filteredMilestones = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return milestones.filter((milestone, index) => {
      const status = String(getMilestoneStatus(milestone)).toUpperCase();
      const title = getMilestoneTitle(milestone, index).toLowerCase();
      const description = getMilestoneDescription(milestone).toLowerCase();

      const matchStatus =
        statusFilter === "ALL" || status === statusFilter.toUpperCase();

      const matchSearch =
        !keyword || title.includes(keyword) || description.includes(keyword);

      return matchStatus && matchSearch;
    });
  }, [milestones, statusFilter, searchText]);

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() => navigate(`/expert/projects/${projectId}`)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to project detail
          </button>

          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Project Milestones
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Milestones
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Track project stages, deadline, payment amount, and milestone
                status.
              </p>
            </div>

            <button
              type="button"
              onClick={loadPageData}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Refresh
            </button>
          </div>

          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading milestones...
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && project && (
            <>
              <section className={`${cardStyle} mb-6 p-6 md:p-8`}>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
                    {getProjectStatus()}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                    Project #{projectId}
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-white">
                  {getProjectTitle()}
                </h2>

                <p className="mt-3 text-sm text-gray-400">
                  View all milestones for this project.
                </p>
              </section>

              <section className={`${cardStyle} mb-6 p-6`}>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px_160px]">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                      Search Milestone
                    </label>

                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                        search
                      </span>

                      <input
                        type="text"
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        placeholder="Search by title or description..."
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
                      <option value="PENDING">Pending</option>
                      <option value="ACTIVE">Active</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-gray-500">
                      Total
                    </p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {filteredMilestones.length}
                    </p>
                  </div>
                </div>
              </section>

              {filteredMilestones.length === 0 && (
                <div className={`${cardStyle} p-12 text-center`}>
                  <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                    flag
                  </span>

                  <h2 className="text-xl font-bold text-white">
                    No milestones found
                  </h2>

                  <p className="mt-2 text-sm text-gray-400">
                    This project has no milestone yet.
                  </p>
                </div>
              )}

              {filteredMilestones.length > 0 && (
                <div className="grid grid-cols-1 gap-5">
                  {filteredMilestones.map((milestone, index) => {
                    const status = getMilestoneStatus(milestone);

                    return (
                      <article
                        key={getMilestoneId(milestone) || index}
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
                                Created{" "}
                                {formatDate(
                                  getMilestoneCreatedAt(milestone)
                                )}
                              </span>
                            </div>

                            <h2 className="text-xl font-bold text-white">
                              {getMilestoneTitle(milestone, index)}
                            </h2>

                            <p className="mt-3 text-sm leading-6 text-gray-400">
                              {getMilestoneDescription(milestone) ||
                                "No description provided."}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                                Due:{" "}
                                {formatDate(getMilestoneDueDate(milestone))}
                              </span>

                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                                Amount:{" "}
                                {formatMoney(getMilestoneAmount(milestone))}
                              </span>
                            </div>
                          </div>

                          <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-72">
                            <div className="space-y-4">
                              <div>
                                <p className="text-xs uppercase tracking-wider text-gray-500">
                                  Payment Amount
                                </p>
                                <p className="mt-1 text-xl font-bold text-white">
                                  {formatMoney(getMilestoneAmount(milestone))}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs uppercase tracking-wider text-gray-500">
                                  Deadline
                                </p>
                                <p className="mt-1 text-sm font-semibold text-gray-300">
                                  {formatDate(getMilestoneDueDate(milestone))}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/expert/projects/${projectId}/deliverables`
                                  )
                                }
                                className="w-full rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                              >
                                Submit Deliverable
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}