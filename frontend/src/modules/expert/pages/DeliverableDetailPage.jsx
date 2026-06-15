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

  const [deliverable, setDeliverable] = useState(null);
  const [revisionForm, setRevisionForm] = useState(emptyRevisionForm);

  const [loading, setLoading] = useState(true);
  const [submittingRevision, setSubmittingRevision] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadDeliverable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverableId]);

  const loadDeliverable = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await deliverableService.getDeliverableById(deliverableId);

      setDeliverable(data);
      setRevisionForm({
        feedback: "",
        fileUrl: data?.fileUrl || "",
        demoUrl: data?.demoUrl || "",
        testResultUrl: data?.testResultUrl || "",
        description: data?.description || "",
        handoverNotes: data?.handoverNotes || "",
      });
    } catch (err) {
      console.error("LOAD DELIVERABLE DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load deliverable detail."));
      setDeliverable(null);
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
      return "Revision description is required.";
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
        setDeliverable(data);
      } else {
        await loadDeliverable();
      }

      setMessage("Revision submitted successfully.");
      setRevisionForm(emptyRevisionForm);
    } catch (err) {
      console.error("SUBMIT REVISION ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot submit revision."));
    } finally {
      setSubmittingRevision(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading deliverable detail...
        </div>
      </ExpertLayout>
    );
  }

  if (!deliverable) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert
              type="danger"
              title="Deliverable not found"
              message={error || "Cannot load deliverable detail."}
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

  const status = String(deliverable.status || "").toUpperCase();
  const canRevision = canSubmitDeliverableRevision(status);

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => {
              if (deliverable.milestoneId) {
                navigate(
                  `/expert/milestones/${deliverable.milestoneId}/deliverables`
                );
              } else {
                navigate("/expert/projects");
              }
            }}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to deliverables
          </button>

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Deliverable Detail
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                {deliverable.title || `Deliverable #${deliverable.deliverableId}`}
              </h1>

              <p className="mt-2 text-sm text-gray-400">
                Version {deliverable.versionNumber || 1} · Milestone #
                {deliverable.milestoneId || "N/A"}
              </p>

              <div className="mt-4">
                <StatusBadge status={status} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {deliverable.milestoneId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/expert/milestones/${deliverable.milestoneId}`)
                  }
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
                >
                  View Milestone
                </button>
              )}

              <button
                type="button"
                onClick={loadDeliverable}
                className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Refresh
              </button>
            </div>
          </div>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Deliverable error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_390px]">
            <main className="space-y-6">
              <Card title="Description">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {deliverable.description || "No description."}
                </p>
              </Card>

              <Card title="Handover Notes">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {deliverable.handoverNotes || "No handover notes."}
                </p>
              </Card>

              {deliverable.clientFeedback && (
                <Card title="Client Feedback">
                  <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm leading-7 text-yellow-100">
                    {deliverable.clientFeedback}
                  </div>
                </Card>
              )}

              <Card title="Links">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <LinkBox label="File URL" url={deliverable.fileUrl} />
                  <LinkBox label="Demo URL" url={deliverable.demoUrl} />
                  <LinkBox
                    label="Test Result URL"
                    url={deliverable.testResultUrl}
                  />
                </div>
              </Card>
            </main>

            <aside className="space-y-6">
              <Card title="Summary">
                <Info
                  label="Deliverable ID"
                  value={`#${deliverable.deliverableId}`}
                />

                <Info
                  label="Milestone ID"
                  value={
                    deliverable.milestoneId
                      ? `#${deliverable.milestoneId}`
                      : "N/A"
                  }
                />

                <Info
                  label="Version"
                  value={deliverable.versionNumber || 1}
                />

                <Info
                  label="Status"
                  value={DELIVERABLE_STATUS_LABEL[status] || status}
                />

                <Info
                  label="Submitted At"
                  value={formatDate(deliverable.submittedAt)}
                />
              </Card>

              <Card title="Submit Revision">
                {!canRevision && (
                  <div className="mb-5 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-4 text-sm text-yellow-200">
                    Revision can only be submitted when status is
                    REVISION_REQUESTED.
                  </div>
                )}

                <form onSubmit={handleSubmitRevision} className="space-y-5">
                  <Field label="Revision Feedback / Notes">
                    <textarea
                      rows={3}
                      value={revisionForm.feedback}
                      disabled={!canRevision || submittingRevision}
                      onChange={(event) =>
                        updateRevisionField("feedback", event.target.value)
                      }
                      placeholder="Explain what you changed..."
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </Field>

                  <Field label="File URL">
                    <input
                      type="url"
                      value={revisionForm.fileUrl}
                      disabled={!canRevision || submittingRevision}
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
                      disabled={!canRevision || submittingRevision}
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
                      disabled={!canRevision || submittingRevision}
                      onChange={(event) =>
                        updateRevisionField("testResultUrl", event.target.value)
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </Field>

                  <Field label="Revision Description">
                    <textarea
                      rows={4}
                      value={revisionForm.description}
                      disabled={!canRevision || submittingRevision}
                      onChange={(event) =>
                        updateRevisionField("description", event.target.value)
                      }
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </Field>

                  <Field label="Handover Notes">
                    <textarea
                      rows={3}
                      value={revisionForm.handoverNotes}
                      disabled={!canRevision || submittingRevision}
                      onChange={(event) =>
                        updateRevisionField("handoverNotes", event.target.value)
                      }
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={!canRevision || submittingRevision}
                    className="w-full rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingRevision ? "Submitting..." : "Submit Revision"}
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

function Info({ label, value }) {
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words font-bold text-white">{value || "N/A"}</p>
    </div>
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
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {DELIVERABLE_STATUS_LABEL[status] || status}
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
          className="mt-2 block break-words text-sm font-bold text-cyan-300 hover:text-cyan-200"
        >
          Open Link
        </a>
      ) : (
        <p className="mt-2 text-sm font-bold text-gray-500">N/A</p>
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
    <div className={`mb-5 rounded-xl border px-5 py-4 text-sm ${style}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
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