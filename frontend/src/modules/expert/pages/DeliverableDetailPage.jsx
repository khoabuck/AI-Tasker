import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import deliverableService from "../../../services/deliverable.service";

import { formatDateTime } from "../../../utils/dateTime.utils";
export default function DeliverableDetailPage() {
  const { deliverableId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [submissionNumber, setSubmissionNumber] = useState(1);
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

      const milestoneId = getMilestoneIdFromSubmission(data);
      const explicitNumber = getExplicitSubmissionNumber(data);

      if (milestoneId) {
        try {
          const milestoneSubmissions =
            await deliverableService.getDeliverablesByMilestone(milestoneId);

          setSubmissionNumber(
            getSubmissionNumberFromList(
              Array.isArray(milestoneSubmissions)
                ? milestoneSubmissions
                : [],
              data
            ) || explicitNumber || 1
          );
        } catch {
          setSubmissionNumber(explicitNumber || 1);
        }
      } else {
        setSubmissionNumber(explicitNumber || 1);
      }
    } catch (err) {
      console.error("LOAD SUBMISSION DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load submission detail."));
      setSubmission(null);
      setSubmissionNumber(1);
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
        <PageSkeleton cards={4} compact />
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
              className="rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
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
      <div className="min-w-0 overflow-x-hidden px-4 py-5 md:px-6">
        <div className="mx-auto w-full max-w-5xl min-w-0">
          <button
            type="button"
            onClick={goBackToMilestone}
            className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to milestone
          </button>

          <section className="mb-4 min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#151a22] shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
            <div className="border-b border-white/10 bg-gradient-to-r from-cyan-400/10 via-purple-400/10 to-transparent p-4 md:p-5">
              <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#00F0FF]">
                    Delivery
                  </p>

                  <h1 className="break-words text-2xl font-black leading-tight text-white md:text-3xl">
                    Submission {submissionNumber}
                  </h1>

                  <p className="mt-2 max-w-2xl break-words text-sm leading-5 text-gray-400">
                    Review submitted work, links, and client feedback.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
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

          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <main className="min-w-0 space-y-4">
              {needsChanges && (
                <Card title="Changes requested" icon="edit_note">
                  <p className="text-sm leading-7 text-gray-300">
                    Update and resubmit from the milestone page.
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
                    Update delivery
                  </button>
                </Card>
              )}

              {approved && (
                <Card title="Approved" icon="verified">
                  <div className="rounded-2xl border border-green-400/30 bg-green-400/10 p-5 text-sm leading-7 text-green-100">
                    This submission has been approved. No further action is needed.
                  </div>
                </Card>
              )}

              <Card title="Delivery details" icon="description">
                <div className="max-w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-gray-300">
                    {submission.description || "No description provided."}
                  </p>
                </div>
              </Card>

              <Card title="Delivery links" icon="link">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <LinkBox label="File" url={submission.fileUrl} />
                  <LinkBox label="Demo" url={submission.demoUrl} />
                  <LinkBox
                    label="Test Result"
                    url={submission.testResultUrl}
                  />
                </div>
              </Card>

              <Card title="Handover notes" icon="notes">
                <div className="max-w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-gray-300">
                    {submission.handoverNotes || "No notes provided."}
                  </p>
                </div>
              </Card>

              {!needsChanges && clientFeedback && (
                <Card title="Client Feedback" icon="feedback">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-gray-300">
                    <p className="whitespace-pre-line">{clientFeedback}</p>
                  </div>
                </Card>
              )}
            </main>

            <aside className="min-w-0 space-y-4">
              <Card title="Status" icon="monitoring">
                <FriendlyStatusBadge ui={statusUi} />

                <p className="mt-4 text-sm leading-6 text-gray-400">
                  {statusUi.description}
                </p>
              </Card>

              <Card title="Next step" icon="route">
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

            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}


function PageSkeleton({ cards = 4, compact = false }) {
  return (
    <div className={`animate-pulse px-5 md:px-8 ${compact ? "py-6" : "py-10"}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 h-5 w-36 rounded-full bg-white/10" />

        <div className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-6 md:p-8">
          <div className="h-4 w-32 rounded bg-cyan-400/10" />
          <div className="mt-4 h-9 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/[0.06]" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {Array.from({ length: cards }).map((_, index) => (
              <div
                key={index}
                className="h-36 rounded-2xl border border-white/10 bg-[#151a22]"
              />
            ))}
          </div>

          <div className="h-80 rounded-2xl border border-white/10 bg-[#151a22]" />
        </div>
      </div>
    </div>
  );
}


function Card({ title, icon, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#151a22] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
      <div className="mb-3 flex min-w-0 items-start gap-3">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
            <span className="material-symbols-outlined text-xl text-cyan-300">
              {icon}
            </span>
          </div>
        )}

        <h2 className="break-words text-base font-extrabold text-white">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function HeroInfo({ icon, label, value }) {
  return (
    <div className="min-w-0 border-t border-white/10 p-3 md:border-r md:border-t-0 md:last:border-r-0">
      <div className="mb-2 flex items-center gap-2 text-gray-500">
        <span className="material-symbols-outlined text-lg">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="break-words text-sm font-black text-white">{formatInfoValue(value)}</p>
    </div>
  );
}

function LinkBox({ label, url }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
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
          className="mt-4 w-full rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
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

function getSubmissionId(submission) {
  return (
    submission?.deliverableId ||
    submission?.DeliverableId ||
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

function getExplicitSubmissionNumber(submission) {
  const number = Number(
    submission?.versionNumber ||
      submission?.VersionNumber ||
      submission?.submissionNumber ||
      submission?.SubmissionNumber ||
      submission?.raw?.versionNumber ||
      submission?.raw?.VersionNumber ||
      submission?.raw?.submissionNumber ||
      submission?.raw?.SubmissionNumber ||
      0
  );

  return Number.isInteger(number) && number > 0 ? number : 0;
}

function getSubmissionNumberFromList(submissions, currentSubmission) {
  if (!Array.isArray(submissions) || submissions.length === 0) {
    return 0;
  }

  const currentId = String(getSubmissionId(currentSubmission) || "");

  const ordered = [...submissions].sort((a, b) => {
    const timeA = getSubmissionTime(a);
    const timeB = getSubmissionTime(b);

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return (
      getExplicitSubmissionNumber(a) -
      getExplicitSubmissionNumber(b)
    );
  });

  const index = ordered.findIndex(
    (item) => String(getSubmissionId(item) || "") === currentId
  );

  return index >= 0 ? index + 1 : 0;
}

function getSubmissionTime(submission) {
  const value =
    submission?.submittedAt ||
    submission?.SubmittedAt ||
    submission?.createdAt ||
    submission?.CreatedAt ||
    submission?.raw?.submittedAt ||
    submission?.raw?.SubmittedAt ||
    submission?.raw?.createdAt ||
    submission?.raw?.CreatedAt ||
    "";

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
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
  return formatDateTime(value, "N/A");
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