import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import projectService from "../../../services/project.service";
import deliverableService from "../../../services/deliverable.service";

export default function DeliverablesPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [deliverables, setDeliverables] = useState([]);

  const [formData, setFormData] = useState({
    milestoneId: "",
    title: "",
    description: "",
    fileUrl: "",
    note: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPageData();
  }, [projectId]);

  const loadPageData = async () => {
    try {
      setLoading(true);
      setError("");

      const projectData = await projectService.getProjectById(projectId);
      const deliverableData =
        await deliverableService.getDeliverablesByProject(projectId);

      setProject(projectData);
      setDeliverables(deliverableData);
    } catch (err) {
      console.error(err);
      setError("Cannot load deliverables. Please check backend API.");
      setProject(null);
      setDeliverables([]);
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

  const getMilestones = () => {
    if (Array.isArray(project?.milestones)) return project.milestones;
    if (Array.isArray(project?.projectMilestones)) {
      return project.projectMilestones;
    }

    return [];
  };

  const getMilestoneName = (milestoneId) => {
    if (!milestoneId) return "No milestone";

    const milestone = getMilestones().find((item) => {
      const id = item.id || item.milestoneId;
      return String(id) === String(milestoneId);
    });

    return milestone?.title || milestone?.name || `Milestone ${milestoneId}`;
  };

  const getDeliverableId = (item) => {
    return item.id || item.deliverableId || item.deliverableID;
  };

  const getDeliverableTitle = (item) => {
    return item.title || item.name || "Untitled Deliverable";
  };

  const getDeliverableDescription = (item) => {
    return item.description || item.note || "";
  };

  const getDeliverableStatus = (item) => {
    return item.status || "SUBMITTED";
  };

  const getDeliverableFileUrl = (item) => {
    return item.fileUrl || item.url || item.attachmentUrl || "";
  };

  const getCreatedAt = (item) => {
    return item.createdAt || item.submittedAt || item.createdDate;
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

    if (value === "APPROVED" || value === "ACCEPTED") {
      return "border-green-400/30 bg-green-400/10 text-green-300";
    }

    if (value === "REJECTED") {
      return "border-red-400/30 bg-red-400/10 text-red-300";
    }

    if (value === "REVISION_REQUIRED") {
      return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
    }

    if (value === "SUBMITTED") {
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
    }

    return "border-gray-400/30 bg-gray-400/10 text-gray-300";
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      return "Deliverable title is required.";
    }

    if (!formData.description.trim()) {
      return "Deliverable description is required.";
    }

    if (formData.description.trim().length < 20) {
      return "Description must be at least 20 characters.";
    }

    if (!formData.fileUrl.trim()) {
      return "File URL is required.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const validateError = validateForm();

    if (validateError) {
      setError(validateError);
      return;
    }

    try {
      setSubmitting(true);

      await deliverableService.submitDeliverable(projectId, formData);

      setMessage("Deliverable submitted successfully.");

      setFormData({
        milestoneId: "",
        title: "",
        description: "",
        fileUrl: "",
        note: "",
      });

      await loadPageData();
    } catch (err) {
      console.error(err);
      setError("Cannot submit deliverable. Please check backend API.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (deliverableId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this deliverable?"
    );

    if (!confirmDelete) return;

    try {
      setActionLoadingId(deliverableId);
      setMessage("");
      setError("");

      await deliverableService.deleteDeliverable(deliverableId);

      setMessage("Deliverable deleted successfully.");
      await loadPageData();
    } catch (err) {
      console.error(err);
      setError("Cannot delete deliverable. Please check backend API.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]";

  const labelStyle =
    "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

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

          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Project Deliverables
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Submit deliverables
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Upload your work result, attach a file link, and explain what you
              delivered to the client.
            </p>
          </div>

          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading deliverables...
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-300">
              {message}
            </div>
          )}

          {!loading && project && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
              {/* Left side */}
              <div className="space-y-6">
                {/* Project summary */}
                <section className={`${cardStyle} p-6 md:p-8`}>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                        getProjectStatus()
                      )}`}
                    >
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
                    Submit your work and keep the client updated.
                  </p>
                </section>

                {/* Deliverable list */}
                <section className={`${cardStyle} p-6 md:p-8`}>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                      <span className="material-symbols-outlined text-xl text-[#00F0FF]">
                        upload_file
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Submitted Deliverables
                      </h2>
                      <p className="text-sm text-gray-500">
                        Previous work submissions for this project.
                      </p>
                    </div>
                  </div>

                  {deliverables.length === 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
                      <span className="material-symbols-outlined mb-3 block text-4xl text-gray-500">
                        inventory_2
                      </span>

                      <h3 className="font-bold text-white">
                        No deliverables yet
                      </h3>

                      <p className="mt-2 text-sm text-gray-400">
                        Submit your first deliverable using the form on the
                        right.
                      </p>
                    </div>
                  )}

                  {deliverables.length > 0 && (
                    <div className="space-y-3">
                      {deliverables.map((item) => {
                        const deliverableId = getDeliverableId(item);
                        const fileUrl = getDeliverableFileUrl(item);

                        return (
                          <div
                            key={deliverableId}
                            className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                                      getDeliverableStatus(item)
                                    )}`}
                                  >
                                    {getDeliverableStatus(item)}
                                  </span>

                                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                                    {formatDate(getCreatedAt(item))}
                                  </span>
                                </div>

                                <h3 className="text-sm font-bold text-white">
                                  {getDeliverableTitle(item)}
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-gray-400">
                                  {getDeliverableDescription(item) ||
                                    "No description provided."}
                                </p>

                                {item.milestoneId && (
                                  <p className="mt-2 text-xs text-gray-500">
                                    Milestone:{" "}
                                    {getMilestoneName(item.milestoneId)}
                                  </p>
                                )}

                                {fileUrl && (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200"
                                  >
                                    Open file
                                    <span className="material-symbols-outlined text-sm">
                                      open_in_new
                                    </span>
                                  </a>
                                )}
                              </div>

                              <button
                                type="button"
                                disabled={actionLoadingId === deliverableId}
                                onClick={() => handleDelete(deliverableId)}
                                className="text-left text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                              >
                                {actionLoadingId === deliverableId
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* Submit form */}
              <aside>
                <form
                  onSubmit={handleSubmit}
                  className={`${cardStyle} sticky top-24 p-6`}
                >
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                      <span className="material-symbols-outlined text-xl text-[#00F0FF]">
                        add_task
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white">
                        New Deliverable
                      </h2>
                      <p className="text-sm text-gray-500">
                        Submit your completed work.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className={labelStyle}>Milestone</label>

                      <select
                        name="milestoneId"
                        value={formData.milestoneId}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                      >
                        <option value="">No milestone</option>

                        {getMilestones().map((milestone, index) => {
                          const id = milestone.id || milestone.milestoneId;

                          return (
                            <option key={id || index} value={id}>
                              {milestone.title ||
                                milestone.name ||
                                `Milestone ${index + 1}`}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className={labelStyle}>Title</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Final source code"
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="5"
                        placeholder="Describe what you delivered..."
                        className={`${inputStyle} resize-none`}
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>File URL</label>
                      <input
                        type="text"
                        name="fileUrl"
                        value={formData.fileUrl}
                        onChange={handleChange}
                        placeholder="Google Drive / GitHub / Demo link"
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>Note</label>
                      <textarea
                        name="note"
                        value={formData.note}
                        onChange={handleChange}
                        rows="3"
                        placeholder="Optional note for client..."
                        className={`${inputStyle} resize-none`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.15)] transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : "Submit Deliverable"}
                    </button>
                  </div>
                </form>
              </aside>
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}