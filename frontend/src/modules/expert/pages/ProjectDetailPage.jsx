import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import projectService from "../../../services/project.service";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProjectDetail();
  }, [projectId]);

  const loadProjectDetail = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await projectService.getProjectById(projectId);
      setProject(data);
    } catch (err) {
      console.error(err);
      setError("Cannot load project detail. Please check backend API.");
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    return (
      project?.title ||
      project?.projectTitle ||
      project?.name ||
      project?.jobTitle ||
      project?.job?.title ||
      "Untitled Project"
    );
  };

  const getDescription = () => {
    return (
      project?.description ||
      project?.projectDescription ||
      project?.summary ||
      project?.job?.description ||
      ""
    );
  };

  const getStatus = () => {
    return project?.status || project?.projectStatus || "ACTIVE";
  };

  const getClientName = () => {
    return (
      project?.clientName ||
      project?.client?.fullName ||
      project?.client?.name ||
      "Client"
    );
  };

  const getBudget = () => {
    return (
      project?.budget ||
      project?.totalBudget ||
      project?.contractValue ||
      project?.amount ||
      project?.proposedBudget ||
      0
    );
  };

  const getDeadline = () => {
    return (
      project?.deadline ||
      project?.endDate ||
      project?.dueDate ||
      project?.expectedEndDate
    );
  };

  const getStartedAt = () => {
    return project?.startDate || project?.startedAt || project?.createdAt;
  };

  const getMilestones = () => {
    if (Array.isArray(project?.milestones)) return project.milestones;
    if (Array.isArray(project?.projectMilestones)) {
      return project.projectMilestones;
    }

    return [];
  };

  const getDeliverables = () => {
    if (Array.isArray(project?.deliverables)) return project.deliverables;
    if (Array.isArray(project?.projectDeliverables)) {
      return project.projectDeliverables;
    }

    return [];
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

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
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

          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading project detail...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && project && (
            <>
              <section className={`${cardStyle} mb-6 p-6 md:p-8`}>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                      getStatus()
                    )}`}
                  >
                    {getStatus()}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                    Started {formatDate(getStartedAt())}
                  </span>
                </div>

                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {getTitle()}
                </h1>

                <p className="mt-3 text-sm text-gray-400">
                  Client:{" "}
                  <span className="font-semibold text-cyan-300">
                    {getClientName()}
                  </span>
                </p>
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
                <div className="space-y-6">
                  <section className={`${cardStyle} p-6 md:p-8`}>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                        <span className="material-symbols-outlined text-xl text-[#00F0FF]">
                          description
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-white">
                          Project Description
                        </h2>
                        <p className="text-sm text-gray-500">
                          Main project information.
                        </p>
                      </div>
                    </div>

                    <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                      {getDescription() || "No description provided."}
                    </p>
                  </section>

                  <section className={`${cardStyle} p-6 md:p-8`}>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                        <span className="material-symbols-outlined text-xl text-[#00F0FF]">
                          flag
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-white">
                          Milestones Preview
                        </h2>
                        <p className="text-sm text-gray-500">
                          Project stages and progress.
                        </p>
                      </div>
                    </div>

                    {getMilestones().length === 0 && (
                      <p className="text-sm text-gray-500">
                        No milestones found.
                      </p>
                    )}

                    <div className="space-y-3">
                      {getMilestones()
                        .slice(0, 3)
                        .map((milestone, index) => (
                          <div
                            key={milestone.id || milestone.milestoneId || index}
                            className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <h3 className="text-sm font-bold text-white">
                                  {milestone.title ||
                                    milestone.name ||
                                    `Milestone ${index + 1}`}
                                </h3>

                                <p className="mt-1 text-sm leading-6 text-gray-400">
                                  {milestone.description ||
                                    "No description provided."}
                                </p>
                              </div>

                              <span
                                className={`w-fit rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                                  milestone.status || "PENDING"
                                )}`}
                              >
                                {milestone.status || "PENDING"}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </section>

                  <section className={`${cardStyle} p-6 md:p-8`}>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                        <span className="material-symbols-outlined text-xl text-[#00F0FF]">
                          upload_file
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-white">
                          Deliverables
                        </h2>
                        <p className="text-sm text-gray-500">
                          Submitted work for this project.
                        </p>
                      </div>
                    </div>

                    {getDeliverables().length === 0 && (
                      <p className="text-sm text-gray-500">
                        No deliverables submitted yet.
                      </p>
                    )}

                    <div className="space-y-3">
                      {getDeliverables().map((item, index) => (
                        <div
                          key={item.id || item.deliverableId || index}
                          className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-white">
                                {item.title ||
                                  item.name ||
                                  `Deliverable ${index + 1}`}
                              </h3>

                              <p className="mt-1 text-sm leading-6 text-gray-400">
                                {item.description ||
                                  "No description provided."}
                              </p>
                            </div>

                            <span
                              className={`w-fit rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                                item.status || "SUBMITTED"
                              )}`}
                            >
                              {item.status || "SUBMITTED"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <aside className="space-y-6">
                  <section className={`${cardStyle} p-6`}>
                    <h2 className="mb-5 text-lg font-bold text-white">
                      Project Summary
                    </h2>

                    <div className="space-y-5">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">
                          Budget
                        </p>
                        <p className="mt-1 text-xl font-bold text-white">
                          ${getBudget()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">
                          Deadline
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-300">
                          {formatDate(getDeadline())}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">
                          Client
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-300">
                          {getClientName()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">
                          Status
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-300">
                          {getStatus()}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className={`${cardStyle} p-6`}>
                    <h2 className="mb-4 text-lg font-bold text-white">
                      Actions
                    </h2>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/expert/projects/${projectId}/milestones`)
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                      >
                        View Milestones
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/expert/projects/${projectId}/deliverables`
                          )
                        }
                        className="w-full rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                      >
                        Submit Deliverable
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/expert/projects/${projectId}/dispute`)
                        }
                        className="w-full rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
                      >
                        Open Dispute
                      </button>
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}