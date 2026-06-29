import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import milestoneService from "../../../services/milestone.service";
import deliverableService from "../../../services/deliverable.service";

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

      const list = Array.isArray(data) ? data : [];
      const latest = getLatestSubmission(list);

      setSubmissions(list);

      if (latest && isChangeRequested(latest.status)) {
        setSubmissionForm(buildFormFromSubmission(latest));
      } else if (!latest) {
        setSubmissionForm({ ...emptySubmissionForm });
      }
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

  const resetSubmissionForm = () => {
    setMessage("");
    setError("");
    setSubmissionError("");
    setSubmissionForm({ ...emptySubmissionForm });
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
    const latestSubmission = getLatestSubmission(submissions);

    const isResubmission =
      Boolean(latestSubmission) &&
      (isChangeRequested(latestSubmission.status) ||
        isChangeRequested(milestone?.status));

    if (latestSubmission && !isResubmission) {
      setSubmissionError(
        "You already submitted this milestone. You can submit again only when the client requests changes."
      );
      return;
    }

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

      setMessage(
        isResubmission
          ? "Your updated work has been resubmitted successfully."
          : "Your work has been submitted successfully."
      );

      setSubmissionForm({ ...emptySubmissionForm });

      await loadSubmissions(realMilestoneId);
    } catch (err) {
      console.error("SUBMIT WORK ERROR:", err?.response?.data || err);
      setSubmissionError(
        getFriendlyError(
          err,
          "Cannot submit your work. Please check the milestone status and try again."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openSubmissionDetail = (submission) => {
    const submissionId = getSubmissionId(submission);

    if (!submissionId) {
      setSubmissionError("Cannot open submission detail because id is missing.");
      return;
    }

    navigate(`/expert/deliverables/${submissionId}`);
  };

  const goBackToProject = () => {
    const projectId = getProjectIdFromMilestone(milestone);

    if (projectId) {
      navigate(`/expert/projects/${projectId}`);
      return;
    }

    navigate("/expert/projects");
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

  const realMilestoneId = getMilestoneId(milestone) || milestoneId;
  const milestoneStatus = String(milestone.status || "PENDING").toUpperCase();

  const latestSubmission = getLatestSubmission(submissions);
  const hasSubmission = Boolean(getSubmissionId(latestSubmission));

  const needsResubmission =
    hasSubmission &&
    (isChangeRequested(latestSubmission?.status) ||
      isChangeRequested(milestoneStatus));

  const canSubmit =
    canSubmitWorkForMilestone(milestoneStatus) &&
    (!hasSubmission || needsResubmission) &&
    !submissionLoading;

  const milestoneUi = getMilestoneUiStatus({
    milestoneStatus,
    latestSubmission,
    hasSubmission,
    needsResubmission,
  });

  const formTitle = needsResubmission ? "Resubmit Work" : "Submit Work";
  const formDescription = needsResubmission
    ? "Update your links and notes based on the client's request, then submit this milestone again."
    : "Share your completed work with the client for review.";

  const latestClientFeedback = getClientFeedback(latestSubmission);

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={goBackToProject}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to project
          </button>

          <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="border-b border-white/10 bg-gradient-to-r from-cyan-400/10 via-purple-400/10 to-transparent p-6 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                    Milestone Workspace
                  </p>

                  <h1 className="text-3xl font-black text-white md:text-4xl">
                    {milestone.title || "Untitled Milestone"}
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                    Review the milestone brief, submit your work, and resubmit
                    here when the client asks for changes.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <FriendlyStatusBadge ui={milestoneUi} />

                  <button
                    type="button"
                    onClick={() => loadSubmissions(realMilestoneId)}
                    disabled={submissionLoading}
                    className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submissionLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-0 md:grid-cols-3">
              <HeroInfo
                icon="calendar_month"
                label="Due Date"
                value={formatDate(milestone.dueDate)}
              />

              <HeroInfo
                icon="payments"
                label="Payment"
                value={formatMoney(milestone.amount)}
              />

              <HeroInfo
                icon="assignment"
                label="Submissions"
                value={submissions.length}
              />
            </div>
          </section>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Milestone error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <main className="space-y-6">
              <Card
                title="Work Brief"
                subtitle="What the client expects from this milestone."
                icon="task_alt"
              >
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {milestone.description || "No description provided."}
                </p>

                {milestone.acceptanceCriteria && (
                  <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                      Acceptance Criteria
                    </p>

                    <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                      {milestone.acceptanceCriteria}
                    </p>
                  </div>
                )}
              </Card>

              <Card
                title={formTitle}
                subtitle={formDescription}
                icon={
                  needsResubmission ? "published_with_changes" : "upload_file"
                }
              >
                {submissionError && (
                  <Alert
                    type="danger"
                    title="Submission error"
                    message={submissionError}
                  />
                )}

                {!canSubmitWorkForMilestone(milestoneStatus) && (
                  <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5 text-sm leading-6 text-yellow-100">
                    This milestone is currently closed for submission.
                  </div>
                )}

                {hasSubmission && !needsResubmission && (
                  <SubmittedNotice
                    submission={latestSubmission}
                    onOpen={() => openSubmissionDetail(latestSubmission)}
                  />
                )}

                {needsResubmission && (
                  <div className="mb-5 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5 text-sm leading-6 text-yellow-100">
                    <div className="flex gap-3">
                      <span className="material-symbols-outlined text-yellow-300">
                        edit_note
                      </span>

                      <div>
                        <p className="font-bold text-white">
                          Changes requested by client
                        </p>

                        <p className="mt-1">
                          Please update the milestone submission below. This
                          will send a new submission to the client.
                        </p>
                      </div>
                    </div>

                    {latestClientFeedback && (
                      <div className="mt-4 rounded-xl border border-yellow-400/30 bg-black/20 p-4">
                        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-yellow-300">
                          Client Feedback
                        </p>

                        <p className="whitespace-pre-line text-sm text-yellow-50">
                          {latestClientFeedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {canSubmit && (
                  <form onSubmit={handleSubmitWork} className="space-y-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                      <SubmitWorkInput
                        label="File URL"
                        value={submissionForm.fileUrl}
                        disabled={submitting}
                        onChange={(value) =>
                          updateSubmissionField("fileUrl", value)
                        }
                        placeholder="https://drive.google.com/..."
                      />

                      <SubmitWorkInput
                        label="Demo URL"
                        value={submissionForm.demoUrl}
                        disabled={submitting}
                        onChange={(value) =>
                          updateSubmissionField("demoUrl", value)
                        }
                        placeholder="https://demo.example.com"
                      />

                      <SubmitWorkInput
                        label="Test Result URL"
                        value={submissionForm.testResultUrl}
                        disabled={submitting}
                        onChange={(value) =>
                          updateSubmissionField("testResultUrl", value)
                        }
                        placeholder="https://docs.google.com/..."
                      />
                    </div>

                    <SubmitWorkTextArea
                      label="What did you deliver?"
                      required
                      value={submissionForm.description}
                      disabled={submitting}
                      onChange={(value) =>
                        updateSubmissionField("description", value)
                      }
                      placeholder="Describe what you completed, what changed, and how the client can review it..."
                      rows={5}
                    />

                    <SubmitWorkTextArea
                      label="Notes for client"
                      value={submissionForm.handoverNotes}
                      disabled={submitting}
                      onChange={(value) =>
                        updateSubmissionField("handoverNotes", value)
                      }
                      placeholder="Setup guide, testing notes, credentials, or anything the client should know..."
                      rows={4}
                    />

                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={resetSubmissionForm}
                        disabled={submitting}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Clear
                      </button>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          send
                        </span>

                        {submitting
                          ? "Submitting..."
                          : needsResubmission
                          ? "Resubmit Work"
                          : "Submit Work"}
                      </button>
                    </div>
                  </form>
                )}
              </Card>

              <Card
                title="Submission History"
                subtitle="Previous submissions for this milestone."
                icon="history"
              >
                {submissionLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-400">
                    Loading submissions...
                  </div>
                ) : submissions.length === 0 ? (
                  <EmptyState
                    icon="assignment"
                    title="No submission yet"
                    description="Your submitted work will appear here after you send it to the client."
                  />
                ) : (
                  <div className="space-y-4">
                    {submissions.map((item, index) => (
                      <SubmissionCard
                        key={getSubmissionId(item) || index}
                        submission={item}
                        onDetail={() => openSubmissionDetail(item)}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </main>

            <aside className="space-y-6">
              <Card title="What happens next" icon="route">
                <Step
                  active={!hasSubmission}
                  done={hasSubmission}
                  number="1"
                  title="Submit your work"
                  description="Send the work links and notes for client review."
                />

                <Step
                  active={hasSubmission && !needsResubmission}
                  done={isApprovedStatus(latestSubmission?.status)}
                  number="2"
                  title="Client reviews"
                  description="The client checks your submitted milestone."
                />

                <Step
                  active={needsResubmission}
                  done={false}
                  number="3"
                  title="Update if needed"
                  description="If changes are requested, resubmit directly from this page."
                />
              </Card>

              <Card title="Helpful Tips" icon="tips_and_updates">
                <ul className="space-y-3 text-sm leading-6 text-gray-300">
                  <li>Provide at least one working review link.</li>
                  <li>Keep the description clear and client-friendly.</li>
                  <li>Use notes for setup steps, test accounts, or caveats.</li>
                  <li>When changes are requested, update the same form here.</li>
                </ul>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function SubmitWorkInput({
  label,
  value,
  disabled,
  onChange,
  placeholder,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-400">
        {label}
      </span>

      <input
        type="url"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-[#0f141d] px-4 py-3.5 text-sm font-semibold text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-400 focus:bg-[#111823] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function SubmitWorkTextArea({
  label,
  required,
  value,
  disabled,
  onChange,
  placeholder,
  rows = 4,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-400">
        {label} {required && <span className="text-red-300">*</span>}
      </span>

      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-2xl border border-white/10 bg-[#0f141d] px-4 py-3.5 text-sm leading-6 text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-400 focus:bg-[#111823] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function SubmittedNotice({ submission, onOpen }) {
  const ui = getSubmissionUiStatus(submission?.status);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <FriendlyStatusBadge ui={ui} small />

          <h3 className="mt-4 text-lg font-bold text-white">
            Work already submitted
          </h3>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            You can submit again only when the client requests changes. You can
            still open the submission to view details and feedback.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          View Submission
        </button>
      </div>
    </div>
  );
}

function SubmissionCard({ submission, onDetail }) {
  const ui = getSubmissionUiStatus(submission.status);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/40">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FriendlyStatusBadge ui={ui} small />

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
              Version {submission.versionNumber || 1}
            </span>

            {(submission.submittedAt || submission.createdAt) && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                {formatDate(submission.submittedAt || submission.createdAt)}
              </span>
            )}
          </div>

          <h3 className="font-bold text-white">
            {submission.title || "Submitted Work"}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
            {submission.description || "No description provided."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <LinkPill label="File" url={submission.fileUrl} />
            <LinkPill label="Demo" url={submission.demoUrl} />
            <LinkPill label="Test" url={submission.testResultUrl} />
          </div>
        </div>

        <button
          type="button"
          onClick={onDetail}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
        >
          Detail
        </button>
      </div>
    </article>
  );
}

function Card({ title, subtitle, icon, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.22)]">
      <div className="mb-5 flex items-start gap-3">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
            <span className="material-symbols-outlined text-xl text-cyan-300">
              {icon}
            </span>
          </div>
        )}

        <div>
          <h2 className="text-xl font-extrabold text-white">{title}</h2>

          {subtitle && (
            <p className="mt-1 text-sm leading-6 text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

function HeroInfo({ icon, label, value }) {
  return (
    <div className="border-t border-white/10 p-5 md:border-r md:border-t-0 md:last:border-r-0">
      <div className="mb-2 flex items-center gap-2 text-gray-500">
        <span className="material-symbols-outlined text-lg">{icon}</span>

        <span className="text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="text-lg font-black text-white">{formatInfoValue(value)}</p>
    </div>
  );
}

function Step({ number, title, description, active, done }) {
  const style = done
    ? "border-green-400/30 bg-green-400/10 text-green-300"
    : active
    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
    : "border-white/10 bg-white/[0.04] text-gray-500";

  return (
    <div className="mb-4 flex gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black ${style}`}
      >
        {done ? (
          <span className="material-symbols-outlined text-sm">check</span>
        ) : (
          number
        )}
      </div>

      <div>
        <p className="font-bold text-white">{title}</p>

        <p className="mt-1 text-sm leading-6 text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function FriendlyStatusBadge({ ui, small = false }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-bold ${ui.className} ${
        small ? "px-3 py-1 text-xs" : "px-4 py-2 text-xs"
      }`}
    >
      <span className="material-symbols-outlined text-sm">{ui.icon}</span>
      {ui.label}
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

function EmptyState({ icon, title, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        {icon}
      </span>

      <h2 className="text-lg font-bold text-white">{title}</h2>

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
    <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm ${style}`}>
      <p className="font-bold">{title}</p>

      <p className="mt-1">{message}</p>
    </div>
  );
}

function buildFormFromSubmission(submission) {
  return {
    fileUrl: submission?.fileUrl || submission?.raw?.fileUrl || "",
    demoUrl: submission?.demoUrl || submission?.raw?.demoUrl || "",
    testResultUrl:
      submission?.testResultUrl || submission?.raw?.testResultUrl || "",
    description: submission?.description || submission?.raw?.description || "",
    handoverNotes:
      submission?.handoverNotes || submission?.raw?.handoverNotes || "",
  };
}

function getMilestoneId(milestone) {
  return (
    milestone?.milestoneId ||
    milestone?.MilestoneId ||
    milestone?.milestoneID ||
    milestone?.MilestoneID ||
    milestone?.projectMilestoneId ||
    milestone?.ProjectMilestoneId ||
    milestone?.id ||
    milestone?.Id ||
    milestone?.raw?.milestoneId ||
    milestone?.raw?.MilestoneId ||
    milestone?.raw?.projectMilestoneId ||
    milestone?.raw?.ProjectMilestoneId ||
    milestone?.raw?.id ||
    milestone?.raw?.Id ||
    ""
  );
}

function getProjectIdFromMilestone(milestone) {
  return (
    milestone?.projectId ||
    milestone?.ProjectId ||
    milestone?.projectID ||
    milestone?.ProjectID ||
    milestone?.raw?.projectId ||
    milestone?.raw?.ProjectId ||
    milestone?.raw?.projectID ||
    milestone?.raw?.ProjectID ||
    ""
  );
}

function getSubmissionId(submission) {
  return (
    submission?.deliverableId ||
    submission?.DeliverableId ||
    submission?.deliverableID ||
    submission?.DeliverableID ||
    submission?.submissionId ||
    submission?.SubmissionId ||
    submission?.id ||
    submission?.Id ||
    submission?.raw?.deliverableId ||
    submission?.raw?.DeliverableId ||
    submission?.raw?.submissionId ||
    submission?.raw?.SubmissionId ||
    submission?.raw?.id ||
    submission?.raw?.Id ||
    ""
  );
}

function getLatestSubmission(submissions) {
  if (!Array.isArray(submissions) || submissions.length === 0) return null;

  return [...submissions].sort((a, b) => {
    const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime();

    if (dateA !== dateB) return dateB - dateA;

    const versionA = Number(a.versionNumber || 0);
    const versionB = Number(b.versionNumber || 0);

    return versionB - versionA;
  })[0];
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
    "DISPUTED",
    "CLOSED",
    "VOID",
  ].includes(value);
}

function isChangeRequested(status) {
  const value = String(status || "").trim().toUpperCase();

  return [
    "REVISION_REQUESTED",
    "REVISION_REQUIRED",
    "NEEDS_REVISION",
    "CHANGES_REQUESTED",
    "REQUEST_REVISION",
    "REVISION",
    "RESUBMISSION_REQUESTED",
    "RESUBMIT_REQUESTED",
    "REWORK_REQUIRED",
    "REJECTED",
    "REJECTED_BY_CLIENT",
  ].includes(value);
}

function isApprovedStatus(status) {
  const value = String(status || "").trim().toUpperCase();

  return [
    "APPROVED",
    "ACCEPTED",
    "COMPLETED",
    "DONE",
    "PAID",
    "RELEASED",
  ].includes(value);
}

function getMilestoneUiStatus({
  milestoneStatus,
  latestSubmission,
  hasSubmission,
  needsResubmission,
}) {
  if (needsResubmission || isChangeRequested(milestoneStatus)) {
    return {
      label: "Changes Requested",
      icon: "edit_note",
      className: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
    };
  }

  if (
    isApprovedStatus(milestoneStatus) ||
    isApprovedStatus(latestSubmission?.status)
  ) {
    return {
      label: "Approved",
      icon: "verified",
      className: "border-green-400/30 bg-green-400/10 text-green-300",
    };
  }

  if (hasSubmission) {
    return {
      label: "Waiting for Review",
      icon: "schedule",
      className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    };
  }

  return {
    label: "Ready to Submit",
    icon: "rocket_launch",
    className: "border-purple-400/30 bg-purple-400/10 text-purple-300",
  };
}

function getSubmissionUiStatus(status) {
  if (isChangeRequested(status)) {
    return {
      label: "Changes Requested",
      icon: "edit_note",
      className: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
    };
  }

  if (isApprovedStatus(status)) {
    return {
      label: "Approved",
      icon: "verified",
      className: "border-green-400/30 bg-green-400/10 text-green-300",
    };
  }

  return {
    label: "Waiting for Review",
    icon: "schedule",
    className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  };
}

function getClientFeedback(submission) {
  return (
    submission?.clientFeedback ||
    submission?.feedback ||
    submission?.revisionReason ||
    submission?.reviewNote ||
    submission?.raw?.clientFeedback ||
    submission?.raw?.feedback ||
    submission?.raw?.revisionReason ||
    submission?.raw?.reviewNote ||
    ""
  );
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

  return date.toLocaleDateString("vi-VN");
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