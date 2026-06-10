import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import projectService from "../../../services/project.service";
import disputeService from "../../../services/dispute.service";

export default function DisputePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [disputes, setDisputes] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    evidenceUrl: "",
    requestedResolution: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
      const disputeData = await disputeService.getDisputesByProject(projectId);

      setProject(projectData);
      setDisputes(disputeData);
    } catch (err) {
      console.error(err);
      setError("Cannot load dispute page. Please check backend API.");
      setProject(null);
      setDisputes([]);
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

  const getClientName = () => {
    return (
      project?.clientName ||
      project?.client?.fullName ||
      project?.client?.name ||
      "Client"
    );
  };

  const getDisputeId = (dispute) => {
    return dispute.id || dispute.disputeId || dispute.disputeID;
  };

  const getDisputeTitle = (dispute) => {
    return dispute.title || dispute.reason || "Untitled Dispute";
  };

  const getDisputeDescription = (dispute) => {
    return dispute.description || dispute.content || "";
  };

  const getDisputeStatus = (dispute) => {
    return dispute.status || "OPEN";
  };

  const getEvidenceUrl = (dispute) => {
    return dispute.evidenceUrl || dispute.evidence || "";
  };

  const getCreatedAt = (dispute) => {
    return dispute.createdAt || dispute.openedAt || dispute.createdDate;
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

    if (value === "OPEN" || value === "PENDING") {
      return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
    }

    if (value === "RESOLVED" || value === "CLOSED") {
      return "border-green-400/30 bg-green-400/10 text-green-300";
    }

    if (value === "REJECTED") {
      return "border-red-400/30 bg-red-400/10 text-red-300";
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
      return "Dispute title is required.";
    }

    if (!formData.description.trim()) {
      return "Dispute description is required.";
    }

    if (formData.description.trim().length < 30) {
      return "Description must be at least 30 characters.";
    }

    if (!formData.requestedResolution.trim()) {
      return "Requested resolution is required.";
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

      await disputeService.createDispute(projectId, formData);

      setMessage("Dispute opened successfully.");

      setFormData({
        title: "",
        description: "",
        evidenceUrl: "",
        requestedResolution: "",
      });

      await loadPageData();
    } catch (err) {
      console.error(err);
      setError("Cannot open dispute. Please check backend API.");
    } finally {
      setSubmitting(false);
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
              Project Dispute
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Open project dispute
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Create a dispute when there is a serious issue about project
              scope, payment, deliverable, or client communication.
            </p>
          </div>

          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading dispute page...
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
              {/* Left */}
              <div className="space-y-6">
                {/* Project Summary */}
                <section className={`${cardStyle} p-6 md:p-8`}>
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
                    Client:{" "}
                    <span className="font-semibold text-cyan-300">
                      {getClientName()}
                    </span>
                  </p>
                </section>

                {/* Existing Disputes */}
                <section className={`${cardStyle} p-6 md:p-8`}>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                      <span className="material-symbols-outlined text-xl text-[#00F0FF]">
                        gavel
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Existing Disputes
                      </h2>
                      <p className="text-sm text-gray-500">
                        Disputes opened for this project.
                      </p>
                    </div>
                  </div>

                  {disputes.length === 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
                      <span className="material-symbols-outlined mb-3 block text-4xl text-gray-500">
                        rule
                      </span>

                      <h3 className="font-bold text-white">
                        No disputes yet
                      </h3>

                      <p className="mt-2 text-sm text-gray-400">
                        This project has no dispute history.
                      </p>
                    </div>
                  )}

                  {disputes.length > 0 && (
                    <div className="space-y-3">
                      {disputes.map((dispute) => {
                        const disputeId = getDisputeId(dispute);
                        const evidenceUrl = getEvidenceUrl(dispute);

                        return (
                          <div
                            key={disputeId}
                            className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                          >
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                                  getDisputeStatus(dispute)
                                )}`}
                              >
                                {getDisputeStatus(dispute)}
                              </span>

                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                                {formatDate(getCreatedAt(dispute))}
                              </span>
                            </div>

                            <h3 className="text-sm font-bold text-white">
                              {getDisputeTitle(dispute)}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-gray-400">
                              {getDisputeDescription(dispute) ||
                                "No description provided."}
                            </p>

                            {evidenceUrl && (
                              <a
                                href={evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200"
                              >
                                View evidence
                                <span className="material-symbols-outlined text-sm">
                                  open_in_new
                                </span>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* Right Form */}
              <aside>
                <form
                  onSubmit={handleSubmit}
                  className={`${cardStyle} sticky top-24 p-6`}
                >
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10">
                      <span className="material-symbols-outlined text-xl text-red-300">
                        report_problem
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white">
                        New Dispute
                      </h2>
                      <p className="text-sm text-gray-500">
                        Describe the issue clearly.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className={labelStyle}>Dispute Title</label>

                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Payment or deliverable issue"
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>Description</label>

                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="6"
                        placeholder="Explain what happened, when it happened, and why you need admin support..."
                        className={`${inputStyle} resize-none`}
                      />

                      <p className="mt-2 text-xs text-gray-500">
                        Minimum 30 characters.
                      </p>
                    </div>

                    <div>
                      <label className={labelStyle}>Evidence URL</label>

                      <input
                        type="text"
                        name="evidenceUrl"
                        value={formData.evidenceUrl}
                        onChange={handleChange}
                        placeholder="Google Drive / Screenshot / Chat evidence link"
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>
                        Requested Resolution
                      </label>

                      <textarea
                        name="requestedResolution"
                        value={formData.requestedResolution}
                        onChange={handleChange}
                        rows="4"
                        placeholder="Example: I request admin to review the milestone and release payment..."
                        className={`${inputStyle} resize-none`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-xl border border-red-400/50 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Opening..." : "Open Dispute"}
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