import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import deliverableService from "../../../services/deliverable.service";
import {
  canSubmitDeliverableRevision,
  DELIVERABLE_STATUS_LABEL,
} from "../../../constants/deliverableStatus";

const emptyRevisionForm = {
  feedback: "",
  fileUrl: "",
  demoUrl: "",
  testResultUrl: "",
  description: "",
  handoverNotes: "",
};

export default function DeliverableDetailPage() {
  const { deliverableId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [revisionForm, setRevisionForm] = useState(emptyRevisionForm);

  const [loading, setLoading] = useState(true);
  const [submittingRevision, setSubmittingRevision] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverableId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await deliverableService.getDeliverableById(deliverableId);

      setSubmission(data);

      setRevisionForm({
        feedback: "",
        fileUrl: data?.fileUrl || "",
        demoUrl: data?.demoUrl || "",
        testResultUrl: data?.testResultUrl || "",
        description: data?.description || "",
        handoverNotes: data?.handoverNotes || "",
      });
    } catch (err) {
      console.error("LOAD SUBMISSION DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load submission detail."));
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  };

  const updateRevisionField = (name, value) => {
    setError("");
    setMessage("");

    setRevisionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateRevision = () => {
    if (!revisionForm.description.trim()) {
      return "Please describe what you changed.";
    }

    if (revisionForm.description.trim().length < 20) {
      return "Revision description must be at least 20 characters.";
    }

    if (
      !revisionForm.fileUrl.trim() &&
      !revisionForm.demoUrl.trim() &&
      !revisionForm.testResultUrl.trim()
    ) {
      return "Please provide at least File URL, Demo URL, or Test Result URL.";
    }

    return "";
  };

  const handleSubmitRevision = async (event) => {
    event.preventDefault();

    const validationError = validateRevision();

    if (validationError) {
      setError(validationError);
      return;
    }

    const ok = window.confirm("Do you want to submit this revision?");

    if (!ok) return;

    try {
      setSubmittingRevision(true);
      setError("");
      setMessage("");

      const data = await deliverableService.submitRevision(
        deliverableId,
        revisionForm
      );

      if (data?.deliverableId) {
        setSubmission(data);

        setRevisionForm({
          feedback: "",
          fileUrl: data?.fileUrl || "",
          demoUrl: data?.demoUrl || "",
          testResultUrl: data?.testResultUrl || "",
          description: data?.description || "",
          handoverNotes: data?.handoverNotes || "",
        });
      } else {
        await loadSubmission();
      }

      setMessage("Revision submitted successfully.");
    } catch (err) {
      console.error("SUBMIT REVISION ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot submit revision."));
    } finally {
      setSubmittingRevision(false);
    }
  };

  const goBack = () => {
    if (submission?.milestoneId) {
      navigate(`/expert/milestones/${submission.milestoneId}`);
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

  const status = String(submission.status || "SUBMITTED").toUpperCase();
  const canRevision = canSubmitDeliverableRevision(status);
  const hasClientFeedback = Boolean(String(submission.clientFeedback || "").trim());

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={goBack}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to milestone
          </button>

          <section className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                  Submission Detail
                </p>

                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {submission.title || "Submitted Work"}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Review your submitted work, check client feedback, and send a
                  revision when requested.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <SubmissionStatusBadge status={status} />

                  <InfoPill
                    icon="history"
                    label={`Version ${submission.versionNumber || 1}`}
                  />

                  <InfoPill
                    icon="schedule"
                    label={`Submitted ${formatDate(submission.submittedAt)}`}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={loadSubmission}
                className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="What you submitted" icon="description">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {submission.description || "No description provided."}
                </p>
              </Card>

              <Card title="Submitted links" icon="link">
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
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {submission.handoverNotes || "No handover notes provided."}
                </p>
              </Card>

              {hasClientFeedback && (
                <Card title="Client feedback" icon="feedback">
                  <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-5 text-sm leading-7 text-yellow-100">
                    {submission.clientFeedback}
                  </div>
                </Card>
              )}

              {canRevision && (
                <Card title="Submit revision" icon="published_with_changes">
                  <div className="mb-5 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-4 text-sm leading-6 text-yellow-100">
                    The client requested changes. Update the links and explain
                    what you changed before submitting a revision.
                  </div>

                  <form onSubmit={handleSubmitRevision} className="space-y-5">
                    <Field label="Revision Notes">
                      <textarea
                        rows={3}
                        value={revisionForm.feedback}
                        disabled={submittingRevision}
                        onChange={(event) =>
                          updateRevisionField("feedback", event.target.value)
                        }
                        placeholder="Briefly explain what you changed..."
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </Field>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                      <Field label="File URL">
                        <input
                          type="url"
                          value={revisionForm.fileUrl}
                          disabled={submittingRevision}
                          onChange={(event) =>
                            updateRevisionField("fileUrl", event.target.value)
                          }
                          placeholder="https://..."
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </Field>

                      <Field label="Demo URL">
                        <input
                          type="url"
                          value={revisionForm.demoUrl}
                          disabled={submittingRevision}
                          onChange={(event) =>
                            updateRevisionField("demoUrl", event.target.value)
                          }
                          placeholder="https://..."
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </Field>

                      <Field label="Test Result URL">
                        <input
                          type="url"
                          value={revisionForm.testResultUrl}
                          disabled={submittingRevision}
                          onChange={(event) =>
                            updateRevisionField(
                              "testResultUrl",
                              event.target.value
                            )
                          }
                          placeholder="https://..."
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </Field>
                    </div>

                    <Field label="Revision Description">
                      <textarea
                        rows={5}
                        value={revisionForm.description}
                        disabled={submittingRevision}
                        onChange={(event) =>
                          updateRevisionField("description", event.target.value)
                        }
                        placeholder="Describe the updated work and how the client can review it..."
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </Field>

                    <Field label="Handover Notes">
                      <textarea
                        rows={4}
                        value={revisionForm.handoverNotes}
                        disabled={submittingRevision}
                        onChange={(event) =>
                          updateRevisionField(
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
                      disabled={submittingRevision}
                      className="w-full rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingRevision ? "Submitting..." : "Submit Revision"}
                    </button>
                  </form>
                </Card>
              )}
            </main>

            <aside className="space-y-6">
              <Card title="Quick Overview" icon="monitoring">
                <Info label="Status" value={getSubmissionStatusLabel(status)} />
                <Info
                  label="Version"
                  value={`Version ${submission.versionNumber || 1}`}
                />
                <Info
                  label="Submitted"
                  value={formatDate(submission.submittedAt)}
                />
                <Info
                  label="Client Feedback"
                  value={hasClientFeedback ? "Available" : "No feedback yet"}
                />
              </Card>

              {!canRevision && (
                <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-cyan-300">
                      info
                    </span>

                    <div>
                      <h3 className="font-bold text-white">Revision status</h3>

                      <p className="mt-2 text-sm leading-6 text-gray-300">
                        Revision can be submitted only when the client requests
                        changes.
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
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

function InfoPill({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-gray-300">
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {label}
    </span>
  );
}

function LinkBox({ label, url }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 hover:text-cyan-200"
        >
          Open Link
          <span className="material-symbols-outlined text-sm">open_in_new</span>
        </a>
      ) : (
        <p className="mt-2 text-sm font-bold text-gray-500">Not provided</p>
      )}
    </div>
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
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {getSubmissionStatusLabel(status)}
    </span>
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

function getSubmissionStatusLabel(status) {
  return DELIVERABLE_STATUS_LABEL[status] || formatStatusLabel(status || "");
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