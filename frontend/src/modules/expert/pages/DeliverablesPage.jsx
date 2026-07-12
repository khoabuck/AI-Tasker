import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import deliverableService from "../../../services/deliverable.service";
import projectService from "../../../services/project.service";
import { DELIVERABLE_STATUS_LABEL } from "../../../constants/deliverableStatus";

import { formatDateTime } from "../../../utils/dateTime.utils";
const emptySubmissionForm = {
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
  const [submissions, setSubmissions] = useState([]);

  const [submissionForm, setSubmissionForm] = useState({
    ...emptySubmissionForm,
    milestoneId: milestoneId || "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedMilestoneId = useMemo(() => {
    return milestoneId || submissionForm.milestoneId;
  }, [milestoneId, submissionForm.milestoneId]);

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
        const submissionData =
          await deliverableService.getDeliverablesByMilestone(milestoneId);

        setSubmissions(Array.isArray(submissionData) ? submissionData : []);
        setProject(null);
        setMilestones([]);

        setSubmissionForm((prev) => ({
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

        const safeMilestones = Array.isArray(milestoneData)
          ? milestoneData
          : [];

        setProject(projectData);
        setMilestones(safeMilestones);

        const firstMilestoneId =
          submissionForm.milestoneId || safeMilestones?.[0]?.milestoneId || "";

        setSubmissionForm((prev) => ({
          ...prev,
          milestoneId: firstMilestoneId,
        }));

        const submissionGroups = await Promise.all(
          safeMilestones
            .filter((item) => item?.milestoneId)
            .map((item) =>
              deliverableService.getDeliverablesByMilestone(item.milestoneId)
            )
        );

        setSubmissions(submissionGroups.flat());
        return;
      }

      setProject(null);
      setMilestones([]);
      setSubmissions([]);
    } catch (err) {
      console.error("LOAD SUBMISSIONS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load submissions."));
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionField = (name, value) => {
    setMessage("");
    setError("");

    setSubmissionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateSubmission = () => {
    if (!selectedMilestoneId) {
      return "Please select a milestone.";
    }

    if (!submissionForm.description.trim()) {
      return "Please describe what you delivered.";
    }

    if (submissionForm.description.trim().length < 20) {
      return "Description must be at least 20 characters.";
    }

    if (
      !submissionForm.fileUrl.trim() &&
      !submissionForm.demoUrl.trim() &&
      !submissionForm.testResultUrl.trim()
    ) {
      return "Please provide at least File URL, Demo URL, or Test Result URL.";
    }

    return "";
  };

  const handleSubmitWork = async (event) => {
    event.preventDefault();

    const validationError = validateSubmission();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const created = await deliverableService.submitDeliverable(
        selectedMilestoneId,
        submissionForm
      );

      setMessage("Your work has been submitted successfully.");

      setSubmissionForm({
        ...emptySubmissionForm,
        milestoneId: selectedMilestoneId,
      });

      if (created?.deliverableId) {
        navigate(`/expert/deliverables/${created.deliverableId}`);
        return;
      }

      await loadData();
    } catch (err) {
      console.error("SUBMIT WORK ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot submit your work."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (projectId) {
      navigate(`/expert/projects/${projectId}`);
      return;
    }

    if (milestoneId) {
      navigate(`/expert/milestones/${milestoneId}`);
      return;
    }

    navigate("/expert/projects");
  };

  const pageTitle = milestoneId
    ? `Milestone Submissions`
    : project?.title
    ? `${project.title} Submissions`
    : "Work Submissions";

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading submissions...
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
            onClick={handleBack}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back
          </button>

          <section className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                  Submissions
                </p>

                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {pageTitle}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Submit completed work, review previous submissions, and track
                  client feedback.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <InfoPill
                    icon="assignment"
                    label={`${submissions.length} submission${
                      submissions.length === 1 ? "" : "s"
                    }`}
                  />

                  {milestones.length > 0 && (
                    <InfoPill
                      icon="flag"
                      label={`${milestones.length} milestone${
                        milestones.length === 1 ? "" : "s"
                      }`}
                    />
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={loadData}
                disabled={loading || submitting}
                className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </section>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Submission error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_390px]">
            <main className="space-y-6">
              <Card title="Your submissions" icon="assignment">
                {submissions.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                      assignment
                    </span>

                    <h2 className="text-lg font-bold text-white">
                      No work submitted yet
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">
                      Once you submit your work, it will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((item, index) => (
                      <SubmissionCard
                        key={item.deliverableId || index}
                        submission={item}
                        onDetail={() => {
                          if (!item.deliverableId) {
                            setError(
                              "Cannot open submission detail because id is missing."
                            );
                            return;
                          }

                          navigate(`/expert/deliverables/${item.deliverableId}`);
                        }}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </main>

            <aside>
              <Card title="Submit new work" icon="upload_file">
                <form onSubmit={handleSubmitWork} className="space-y-5">
                  {!milestoneId && (
                    <Field label="Milestone">
                      <select
                        value={submissionForm.milestoneId}
                        disabled={submitting}
                        onChange={(event) =>
                          updateSubmissionField("milestoneId", event.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF] disabled:opacity-50"
                      >
                        <option value="">Select milestone</option>

                        {milestones.map((item) => (
                          <option
                            key={item.milestoneId}
                            value={item.milestoneId}
                          >
                            {item.title || `Milestone ${item.milestoneId}`}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <Field label="File URL">
                    <input
                      type="url"
                      value={submissionForm.fileUrl}
                      disabled={submitting}
                      onChange={(event) =>
                        updateSubmissionField("fileUrl", event.target.value)
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                    />
                  </Field>

                  <Field label="Demo URL">
                    <input
                      type="url"
                      value={submissionForm.demoUrl}
                      disabled={submitting}
                      onChange={(event) =>
                        updateSubmissionField("demoUrl", event.target.value)
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                    />
                  </Field>

                  <Field label="Test Result URL">
                    <input
                      type="url"
                      value={submissionForm.testResultUrl}
                      disabled={submitting}
                      onChange={(event) =>
                        updateSubmissionField(
                          "testResultUrl",
                          event.target.value
                        )
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                    />
                  </Field>

                  <Field label="Delivery Description">
                    <textarea
                      rows={5}
                      value={submissionForm.description}
                      disabled={submitting}
                      onChange={(event) =>
                        updateSubmissionField(
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="Describe what you completed and how the client can review it..."
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                    />
                  </Field>

                  <Field label="Handover Notes">
                    <textarea
                      rows={4}
                      value={submissionForm.handoverNotes}
                      disabled={submitting}
                      onChange={(event) =>
                        updateSubmissionField(
                          "handoverNotes",
                          event.target.value
                        )
                      }
                      placeholder="Setup guide, testing notes, credentials, or anything the client should know..."
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Work"}
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

function SubmissionCard({ submission, onDetail }) {
  const status = String(submission.status || "SUBMITTED").toUpperCase();

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/40">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <SubmissionStatusBadge status={status} />

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
              Version {submission.versionNumber || 1}
            </span>

            {submission.submittedAt && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                {formatDate(submission.submittedAt)}
              </span>
            )}
          </div>

          <h3 className="font-bold text-white">
            {submission.title || "Submitted Work"}
          </h3>

          <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">
            {submission.description || "No description."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <LinkPill label="File" url={submission.fileUrl} />
            <LinkPill label="Demo" url={submission.demoUrl} />
            <LinkPill label="Test Result" url={submission.testResultUrl} />
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

function Card({ title, icon, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
      <div className="mb-5 flex items-center gap-3">
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

function InfoPill({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-gray-300">
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {label}
    </span>
  );
}

function SubmissionStatusBadge({ status }) {
  const style =
    status === "APPROVED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : status === "REVISION_REQUESTED"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : status === "DISPUTED" || status === "REJECTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {DELIVERABLE_STATUS_LABEL[status] || formatStatusLabel(status)}
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

function formatDate(value) {
  return formatDateTime(value, "N/A");
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