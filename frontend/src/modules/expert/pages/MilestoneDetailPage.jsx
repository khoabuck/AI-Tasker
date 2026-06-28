import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import milestoneService from "../../../services/milestone.service";
import deliverableService from "../../../services/deliverable.service";
import { MILESTONE_STATUS_LABEL } from "../../../constants/projectStatus";
import { DELIVERABLE_STATUS_LABEL } from "../../../constants/deliverableStatus";

const emptySubmissionForm = {
  fileUrl: "",
  demoUrl: "",
  testResultUrl: "",
  description: "",
  handoverNotes: "",
};

export default function MilestoneDetailPage() {
  const { milestoneId } = useParams();
  const navigate = useNavigate();

  const [milestone, setMilestone] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const [submissionForm, setSubmissionForm] = useState(emptySubmissionForm);

  const [loading, setLoading] = useState(true);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    loadMilestone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestoneId]);

  const loadMilestone = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      setSubmissionError("");

      const data = await milestoneService.getMilestoneById(milestoneId);

      setMilestone(data);

      const realMilestoneId = getMilestoneId(data) || milestoneId;

      if (realMilestoneId) {
        await loadSubmissions(realMilestoneId);
      }
    } catch (err) {
      console.error("LOAD MILESTONE DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load milestone."));
      setMilestone(null);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (targetMilestoneId = milestoneId) => {
    if (!targetMilestoneId) return;

    try {
      setSubmissionLoading(true);
      setSubmissionError("");

      const data = await deliverableService.getDeliverablesByMilestone(
        targetMilestoneId
      );

      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD SUBMISSIONS ERROR:", err?.response?.data || err);
      setSubmissionError(getFriendlyError(err, "Cannot load submissions."));
      setSubmissions([]);
    } finally {
      setSubmissionLoading(false);
    }
  };

  const updateSubmissionField = (name, value) => {
    setMessage("");
    setError("");
    setSubmissionError("");

    setSubmissionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateSubmission = () => {
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

    const realMilestoneId = getMilestoneId(milestone) || milestoneId;

    if (!realMilestoneId) {
      setSubmissionError("Cannot submit work because milestone is missing.");
      return;
    }

    const validationError = validateSubmission();

    if (validationError) {
      setSubmissionError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      setSubmissionError("");

      await deliverableService.submitDeliverable(
        realMilestoneId,
        submissionForm
      );

      setMessage("Your work has been submitted successfully.");
      setSubmissionForm(emptySubmissionForm);

      await loadSubmissions(realMilestoneId);
    } catch (err) {
      console.error("SUBMIT WORK ERROR:", err?.response?.data || err);
      setSubmissionError(getFriendlyError(err, "Cannot submit your work."));
    } finally {
      setSubmitting(false);
    }
  };

  const openSubmissionDetail = (submission) => {
    if (!submission?.deliverableId) {
      setSubmissionError("Cannot open submission detail because id is missing.");
      return;
    }

    navigate(`/expert/deliverables/${submission.deliverableId}`);
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading milestone...
        </div>
      </ExpertLayout>
    );
  }

  if (!milestone) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert
              type="danger"
              title="Milestone not found"
              message={error || "Cannot load this milestone."}
            />

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

  const status = String(milestone.status || "PENDING").toUpperCase();
  const realMilestoneId = getMilestoneId(milestone) || milestoneId;
  const canSubmit = canSubmitWorkForMilestone(status);

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() =>
              milestone.projectId
                ? navigate(`/expert/projects/${milestone.projectId}`)
                : navigate("/expert/projects")
            }
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to project
          </button>

          <section className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                  Milestone Work
                </p>

                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {milestone.title || "Untitled Milestone"}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Review what needs to be delivered, submit your completed work,
                  and track client feedback.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <StatusBadge status={status} />

                  <InfoPill
                    icon="calendar_month"
                    label={`Due ${formatDate(milestone.dueDate)}`}
                  />

                  <InfoPill
                    icon="payments"
                    label={formatMoney(milestone.amount)}
                    variant="success"
                  />

                  <InfoPill
                    icon="assignment"
                    label={`${submissions.length} submission${
                      submissions.length === 1 ? "" : "s"
                    }`}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadSubmissions(realMilestoneId)}
                disabled={submissionLoading}
                className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submissionLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </section>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Milestone error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="What you need to deliver" icon="task_alt">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {milestone.description || "No description provided."}
                </p>

                {milestone.acceptanceCriteria && (
                  <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                      Acceptance Criteria
                    </p>

                    <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                      {milestone.acceptanceCriteria}
                    </p>
                  </div>
                )}
              </Card>

              <Card title="Submit your work" icon="upload_file">
                {!canSubmit && (
                  <div className="mb-5 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-4 text-sm text-yellow-200">
                    This milestone is currently closed for new submissions.
                  </div>
                )}

                {submissionError && (
                  <Alert
                    type="danger"
                    title="Submission error"
                    message={submissionError}
                  />
                )}

                <form onSubmit={handleSubmitWork} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <Field label="File URL">
                      <input
                        type="url"
                        value={submissionForm.fileUrl}
                        disabled={!canSubmit || submitting}
                        onChange={(event) =>
                          updateSubmissionField("fileUrl", event.target.value)
                        }
                        placeholder="https://..."
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </Field>

                    <Field label="Demo URL">
                      <input
                        type="url"
                        value={submissionForm.demoUrl}
                        disabled={!canSubmit || submitting}
                        onChange={(event) =>
                          updateSubmissionField("demoUrl", event.target.value)
                        }
                        placeholder="https://..."
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </Field>

                    <Field label="Test Result URL">
                      <input
                        type="url"
                        value={submissionForm.testResultUrl}
                        disabled={!canSubmit || submitting}
                        onChange={(event) =>
                          updateSubmissionField(
                            "testResultUrl",
                            event.target.value
                          )
                        }
                        placeholder="https://..."
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </Field>
                  </div>

                  <Field label="Delivery Description">
                    <textarea
                      rows={5}
                      value={submissionForm.description}
                      disabled={!canSubmit || submitting}
                      onChange={(event) =>
                        updateSubmissionField(
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="Describe what you completed, what is included, and how the client can review it..."
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </Field>

                  <Field label="Handover Notes">
                    <textarea
                      rows={4}
                      value={submissionForm.handoverNotes}
                      disabled={!canSubmit || submitting}
                      onChange={(event) =>
                        updateSubmissionField(
                          "handoverNotes",
                          event.target.value
                        )
                      }
                      placeholder="Setup guide, testing notes, credentials, or anything the client should know..."
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={!canSubmit || submitting}
                    className="w-full rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Work"}
                  </button>
                </form>
              </Card>

              <Card title="Your submissions" icon="assignment">
                {submissionLoading ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-400">
                    Loading submissions...
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                      assignment
                    </span>

                    <h2 className="text-lg font-bold text-white">
                      No work submitted yet
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">
                      Once you submit your work, it will appear here for
                      tracking.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((item, index) => (
                      <SubmissionCard
                        key={item.deliverableId || index}
                        submission={item}
                        onDetail={() => openSubmissionDetail(item)}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </main>

            <aside className="space-y-6">
              <Card title="Quick Overview" icon="monitoring">
                <Info label="Status" value={getMilestoneStatusLabel(status)} />
                <Info label="Payment" value={formatMoney(milestone.amount)} />
                <Info label="Due Date" value={formatDate(milestone.dueDate)} />
                <Info label="Submissions" value={submissions.length} />
              </Card>

              <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-cyan-300">
                    tips_and_updates
                  </span>

                  <div>
                    <h3 className="font-bold text-white">Submission tips</h3>

                    <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                      <li>Provide at least one working link.</li>
                      <li>Explain clearly what was delivered.</li>
                      <li>Add setup or testing notes if needed.</li>
                    </ul>
                  </div>
                </div>
              </section>
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
      <div className="mb-4 flex items-center gap-3">
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

function Info({ label, value }) {
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words font-bold text-white">
        {formatInfoValue(value)}
      </p>
    </div>
  );
}

function InfoPill({ icon, label, variant = "default" }) {
  const style =
    variant === "success"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : "border-white/10 bg-white/[0.04] text-gray-300";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${style}`}
    >
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "COMPLETED" || status === "APPROVED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : status === "REVISION_REQUESTED"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : status === "CANCELLED" ||
        status === "CANCELED" ||
        status === "REJECTED" ||
        status === "DISPUTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {getMilestoneStatusLabel(status)}
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

function getMilestoneId(milestone) {
  return (
    milestone?.milestoneId ||
    milestone?.MilestoneId ||
    milestone?.milestoneID ||
    milestone?.MilestoneID ||
    milestone?.projectMilestoneId ||
    milestone?.ProjectMilestoneId ||
    milestone?.projectMilestoneID ||
    milestone?.ProjectMilestoneID ||
    milestone?.id ||
    milestone?.Id ||
    milestone?.raw?.milestoneId ||
    milestone?.raw?.MilestoneId ||
    milestone?.raw?.milestoneID ||
    milestone?.raw?.MilestoneID ||
    milestone?.raw?.projectMilestoneId ||
    milestone?.raw?.ProjectMilestoneId ||
    milestone?.raw?.projectMilestoneID ||
    milestone?.raw?.ProjectMilestoneID ||
    milestone?.raw?.id ||
    milestone?.raw?.Id ||
    ""
  );
}

function canSubmitWorkForMilestone(status) {
  const value = String(status || "").trim().toUpperCase();

  return ![
    "COMPLETED",
    "DONE",
    "FINISHED",
    "APPROVED",
    "PAID",
    "RELEASED",
    "CANCELLED",
    "CANCELED",
    "REJECTED",
    "DECLINED",
    "DISPUTED",
  ].includes(value);
}

function getMilestoneStatusLabel(status) {
  return MILESTONE_STATUS_LABEL[status] || formatStatusLabel(status || "PENDING");
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

function formatInfoValue(value) {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  return value;
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