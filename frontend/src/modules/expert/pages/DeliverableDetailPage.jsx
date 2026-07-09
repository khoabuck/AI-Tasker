import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import deliverableService from "../../../services/deliverable.service";

export default function DeliverableDetailPage() {
  const { deliverableId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverableId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await deliverableService.getDeliverableById(deliverableId);

      setSubmission(data);
    } catch (err) {
      console.error("LOAD SUBMISSION DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load submission detail."));
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  };

  const goBackToMilestone = () => {
    const milestoneId = getMilestoneIdFromSubmission(submission);

    if (milestoneId) {
      navigate(`/expert/milestones/${milestoneId}`);
      return;
    }

    navigate("/expert/projects");
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading submission...
        </div>
      </ExpertLayout>
    );
  }

  if (!submission) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert
              type="danger"
              title="Submission not found"
              message={error || "Cannot load this submission."}
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

  const statusUi = getSubmissionUiStatus(submission.status);
  const clientFeedback = getClientFeedback(submission);
  const needsChanges = isChangeRequested(submission.status);
  const approved = isApprovedStatus(submission.status);

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={goBackToMilestone}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to milestone
          </button>

          <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="border-b border-white/10 bg-gradient-to-r from-cyan-400/10 via-purple-400/10 to-transparent p-6 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                    Submission Detail
                  </p>

                  <h1 className="text-3xl font-black text-white md:text-4xl">
                    {submission.title || "Submitted Work"}
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                    Review what was submitted, check links, and read any client
                    feedback.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <FriendlyStatusBadge ui={statusUi} />

                  <button
                    type="button"
                    onClick={loadSubmission}
                    className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
              <HeroInfo
                icon="schedule"
                label="Submitted"
                value={formatDate(submission.submittedAt || submission.createdAt)}
              />

              <HeroInfo
                icon="feedback"
                label="Client Feedback"
                value={clientFeedback ? "Available" : "No feedback yet"}
              />
            </div>
          </section>

          {error && (
            <Alert type="danger" title="Submission error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <main className="space-y-6">
              {needsChanges && (
                <Card title="Client requested changes" icon="edit_note">
                  <p className="text-sm leading-7 text-gray-300">
                    The client asked for updates. Go back to the milestone page
                    and use the resubmit form there.
                  </p>

                  {clientFeedback && (
                    <div className="mt-5 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5 text-sm leading-7 text-yellow-100">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-yellow-300">
                        Client Feedback
                      </p>
                      <p className="whitespace-pre-line">{clientFeedback}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={goBackToMilestone}
                    className="mt-5 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                  >
                    Resubmit from Milestone
                  </button>
                </Card>
              )}

              {approved && (
                <Card title="Approved by client" icon="verified">
                  <div className="rounded-2xl border border-green-400/30 bg-green-400/10 p-5 text-sm leading-7 text-green-100">
                    This submission has been approved. No further action is
                    needed from you for this submission.
                  </div>
                </Card>
              )}

              <Card title="Submitted Work" icon="description">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {submission.description || "No description provided."}
                </p>
              </Card>

              <Card title="Review Links" icon="link">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <LinkBox label="File" url={submission.fileUrl} />
                  <LinkBox label="Demo" url={submission.demoUrl} />
                  <LinkBox
                    label="Test Result"
                    url={submission.testResultUrl}
                  />
                </div>
              </Card>

              <Card title="Notes for Client" icon="notes">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {submission.handoverNotes || "No notes provided."}
                </p>
              </Card>

              {!needsChanges && clientFeedback && (
                <Card title="Client Feedback" icon="feedback">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-gray-300">
                    <p className="whitespace-pre-line">{clientFeedback}</p>
                  </div>
                </Card>
              )}
            </main>

            <aside className="space-y-6">
              <Card title="Current State" icon="monitoring">
                <FriendlyStatusBadge ui={statusUi} />

                <p className="mt-4 text-sm leading-6 text-gray-400">
                  {statusUi.description}
                </p>
              </Card>

              <Card title="Next Step" icon="route">
                {needsChanges ? (
                  <NextStep
                    icon="edit_note"
                    title="Update the milestone"
                    description="Go back to the milestone page and submit the updated work there."
                    buttonText="Go to Milestone"
                    onClick={goBackToMilestone}
                  />
                ) : approved ? (
                  <NextStep
                    icon="verified"
                    title="No action needed"
                    description="The client has approved this submission."
                  />
                ) : (
                  <NextStep
                    icon="schedule"
                    title="Wait for review"
                    description="The client is reviewing your submitted work."
                  />
                )}
              </Card>

              <Card title="Quick Tips" icon="tips_and_updates">
                <ul className="space-y-3 text-sm leading-6 text-gray-300">
                  <li>This page is for viewing submission details.</li>
                  <li>Resubmission is handled from the milestone page.</li>
                  <li>Use the links above to verify your submitted work.</li>
                </ul>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function Card({ title, icon, children }) {
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

        <h2 className="text-xl font-extrabold text-white">{title}</h2>
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

function LinkBox({ label, url }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          Open Link
          <span className="material-symbols-outlined text-sm">open_in_new</span>
        </a>
      ) : (
        <p className="mt-3 text-sm font-bold text-gray-500">Not provided</p>
      )}
    </div>
  );
}

function FriendlyStatusBadge({ ui }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${ui.className}`}
    >
      <span className="material-symbols-outlined text-sm">{ui.icon}</span>
      {ui.label}
    </span>
  );
}

function NextStep({ icon, title, description, buttonText, onClick }) {
  return (
    <div>
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
          <span className="material-symbols-outlined text-cyan-300">
            {icon}
          </span>
        </div>

        <div>
          <h3 className="font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-gray-400">{description}</p>
        </div>
      </div>

      {buttonText && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="mt-5 w-full rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          {buttonText}
        </button>
      )}
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

function getMilestoneIdFromSubmission(submission) {
  return (
    submission?.milestoneId ||
    submission?.MilestoneId ||
    submission?.milestoneID ||
    submission?.MilestoneID ||
    submission?.projectMilestoneId ||
    submission?.ProjectMilestoneId ||
    submission?.raw?.milestoneId ||
    submission?.raw?.MilestoneId ||
    submission?.raw?.projectMilestoneId ||
    submission?.raw?.ProjectMilestoneId ||
    ""
  );
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

function getSubmissionUiStatus(status) {
  if (isChangeRequested(status)) {
    return {
      label: "Changes Requested",
      icon: "edit_note",
      description:
        "The client requested changes. Please resubmit the updated work from the milestone page.",
      className: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
    };
  }

  if (isApprovedStatus(status)) {
    return {
      label: "Approved",
      icon: "verified",
      description: "The client approved this submission.",
      className: "border-green-400/30 bg-green-400/10 text-green-300",
    };
  }

  return {
    label: "Waiting for Review",
    icon: "schedule",
    description: "This submission is waiting for client review.",
    className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  };
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