import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import deliverableService from "../../../services/deliverable.service";
import projectService from "../../../services/project.service";
import {
  DELIVERABLE_STATUS_LABEL,
} from "../../../constants/deliverableStatus";

const emptyForm = {
  milestoneId: "",
  fileUrl: "",
  demoUrl: "",
  testResultUrl: "",
  description: "",
  handoverNotes: "",
};

export default function DeliverablesPage() {
  const { projectId, milestoneId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [deliverables, setDeliverables] = useState([]);

  const [formData, setFormData] = useState({
    ...emptyForm,
    milestoneId: milestoneId || "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedMilestoneId = useMemo(() => {
    return milestoneId || formData.milestoneId;
  }, [milestoneId, formData.milestoneId]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, milestoneId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      if (milestoneId) {
        const deliverableData =
          await deliverableService.getDeliverablesByMilestone(milestoneId);

        setDeliverables(deliverableData);
        setMilestones([]);
        setProject(null);
        setFormData((prev) => ({
          ...prev,
          milestoneId,
        }));
        return;
      }

      if (projectId) {
        const [projectData, milestoneData] = await Promise.all([
          projectService.getProjectById(projectId),
          projectService.getProjectMilestones(projectId),
        ]);

        setProject(projectData);
        setMilestones(milestoneData);

        const firstMilestoneId =
          formData.milestoneId || milestoneData?.[0]?.milestoneId || "";

        setFormData((prev) => ({
          ...prev,
          milestoneId: firstMilestoneId,
        }));

        const deliverableGroups = await Promise.all(
          milestoneData.map((item) =>
            deliverableService.getDeliverablesByMilestone(item.milestoneId)
          )
        );

        setDeliverables(deliverableGroups.flat());
      }
    } catch (err) {
      console.error("LOAD DELIVERABLES ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load deliverables."));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (name, value) => {
    setMessage("");
    setError("");

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!selectedMilestoneId) {
      return "Please select a milestone.";
    }

    if (!formData.description.trim()) {
      return "Description is required.";
    }

    if (formData.description.trim().length < 20) {
      return "Description must be at least 20 characters.";
    }

    if (
      !formData.fileUrl.trim() &&
      !formData.demoUrl.trim() &&
      !formData.testResultUrl.trim()
    ) {
      return "Please provide at least File URL, Demo URL, or Test Result URL.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await deliverableService.submitDeliverable(selectedMilestoneId, formData);

      setMessage("Deliverable submitted successfully.");

      setFormData({
        ...emptyForm,
        milestoneId: selectedMilestoneId,
      });

      await loadData();
    } catch (err) {
      console.error("SUBMIT DELIVERABLE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot submit deliverable."));
    } finally {
      setSubmitting(false);
    }
  };

  const pageTitle = milestoneId
    ? `Deliverables of Milestone #${milestoneId}`
    : project?.title || "Project Deliverables";

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading deliverables...
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => {
              if (projectId) navigate(`/expert/projects/${projectId}`);
              else navigate("/expert/projects");
            }}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to project
          </button>

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Deliverables
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                {pageTitle}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Submit milestone deliverables with file/demo/test result URLs
                and handover notes.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Refresh
            </button>
          </div>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Deliverable error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_390px]">
            <main className="space-y-5">
              <Card title="Submitted Deliverables">
                {deliverables.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                      assignment
                    </span>

                    <h2 className="text-lg font-bold text-white">
                      No deliverables submitted
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">
                      Submit the first deliverable for this milestone.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deliverables.map((item) => (
                      <DeliverableCard
                        key={item.deliverableId}
                        deliverable={item}
                        onDetail={() =>
                          navigate(`/expert/deliverables/${item.deliverableId}`)
                        }
                      />
                    ))}
                  </div>
                )}
              </Card>
            </main>

            <aside>
              <Card title="Submit New Deliverable">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {!milestoneId && (
                    <Field label="Milestone">
                      <select
                        value={formData.milestoneId}
                        disabled={submitting}
                        onChange={(event) =>
                          updateField("milestoneId", event.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF] disabled:opacity-50"
                      >
                        <option value="">Select milestone</option>

                        {milestones.map((item) => (
                          <option
                            key={item.milestoneId}
                            value={item.milestoneId}
                          >
                            {item.title || `Milestone #${item.milestoneId}`}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <Field label="File URL">
                    <input
                      type="url"
                      value={formData.fileUrl}
                      disabled={submitting}
                      onChange={(event) =>
                        updateField("fileUrl", event.target.value)
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                    />
                  </Field>

                  <Field label="Demo URL">
                    <input
                      type="url"
                      value={formData.demoUrl}
                      disabled={submitting}
                      onChange={(event) =>
                        updateField("demoUrl", event.target.value)
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                    />
                  </Field>

                  <Field label="Test Result URL">
                    <input
                      type="url"
                      value={formData.testResultUrl}
                      disabled={submitting}
                      onChange={(event) =>
                        updateField("testResultUrl", event.target.value)
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                    />
                  </Field>

                  <Field label="Description">
                    <textarea
                      rows={5}
                      value={formData.description}
                      disabled={submitting}
                      onChange={(event) =>
                        updateField("description", event.target.value)
                      }
                      placeholder="Describe what you delivered..."
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                    />
                  </Field>

                  <Field label="Handover Notes">
                    <textarea
                      rows={4}
                      value={formData.handoverNotes}
                      disabled={submitting}
                      onChange={(event) =>
                        updateField("handoverNotes", event.target.value)
                      }
                      placeholder="Account info, setup guide, testing notes..."
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Deliverable"}
                  </button>
                </form>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function DeliverableCard({ deliverable, onDetail }) {
  const status = String(deliverable.status || "").toUpperCase();

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/40">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
              Version {deliverable.versionNumber || 1}
            </span>

            {deliverable.milestoneId && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                Milestone #{deliverable.milestoneId}
              </span>
            )}
          </div>

          <h3 className="font-bold text-white">
            {deliverable.title || `Deliverable #${deliverable.deliverableId}`}
          </h3>

          <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">
            {deliverable.description || "No description."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <LinkPill label="File" url={deliverable.fileUrl} />
            <LinkPill label="Demo" url={deliverable.demoUrl} />
            <LinkPill label="Test Result" url={deliverable.testResultUrl} />
          </div>
        </div>

        <button
          type="button"
          onClick={onDetail}
          className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          Detail
        </button>
      </div>
    </article>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
      <h2 className="mb-5 text-xl font-extrabold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "APPROVED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : status === "REVISION_REQUESTED"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : status === "DISPUTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {DELIVERABLE_STATUS_LABEL[status] || status}
    </span>
  );
}

function LinkPill({ label, url }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-400 hover:text-black"
    >
      {label}
    </a>
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

function getFriendlyError(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.response?.data ||
    err?.message ||
    fallback
  );
}