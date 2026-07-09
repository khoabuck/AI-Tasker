import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import disputeService from "../../../services/dispute.service";
import {
  DISPUTE_STATUS_LABEL,
  RESOLUTION_TYPE_LABEL,
  isDisputeResolved,
} from "../../../constants/disputeStatus";

const emptyEvidenceForm = {
  evidenceText: "",
  fileUrl: "",
  imageUrl: "",
  image: null,
};

export default function DisputeDetailPage() {
  const { disputeId } = useParams();
  const navigate = useNavigate();

  const [dispute, setDispute] = useState(null);
  const [evidenceForm, setEvidenceForm] = useState(emptyEvidenceForm);

  const [loading, setLoading] = useState(true);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadDispute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeId]);

  const loadDispute = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await disputeService.getDisputeById(disputeId);

      setDispute(data);
    } catch (err) {
      console.error("LOAD DISPUTE DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load dispute detail."));
      setDispute(null);
    } finally {
      setLoading(false);
    }
  };

  const updateEvidenceField = (name, value) => {
    setError("");
    setMessage("");

    setEvidenceForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEvidenceImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    setError("");
    setMessage("");

    setEvidenceForm((prev) => ({
      ...prev,
      image: file,
    }));
  };

  const validateEvidence = () => {
    if (!evidenceForm.evidenceText.trim()) {
      return "Evidence text is required.";
    }

    if (evidenceForm.evidenceText.trim().length < 20) {
      return "Evidence text must be at least 20 characters.";
    }

    return "";
  };

  const handleSubmitEvidence = async (event) => {
    event.preventDefault();

    const validationError = validateEvidence();

    if (validationError) {
      setError(validationError);
      return;
    }

    const ok = window.confirm("Do you want to submit this evidence?");

    if (!ok) return;

    try {
      setSubmittingEvidence(true);
      setError("");
      setMessage("");

      if (evidenceForm.image) {
        await disputeService.addDisputeImageEvidence(disputeId, evidenceForm);
      } else {
        await disputeService.addDisputeEvidence(disputeId, evidenceForm);
      }

      setMessage("Evidence submitted successfully.");
      setEvidenceForm(emptyEvidenceForm);

      await loadDispute();
    } catch (err) {
      console.error("ADD EVIDENCE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot submit evidence."));
    } finally {
      setSubmittingEvidence(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading dispute detail...
        </div>
      </ExpertLayout>
    );
  }

  if (!dispute) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert
              type="danger"
              title="Dispute not found"
              message={error || "Cannot load dispute detail."}
            />

            <button
              type="button"
              onClick={() => navigate("/expert/disputes")}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Back to Disputes
            </button>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  const status = String(dispute.status || "").toUpperCase();
  const resolved = isDisputeResolved(status);

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate("/expert/disputes")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to disputes
          </button>

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Dispute Detail
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                {dispute.projectTitle || `Dispute #${dispute.disputeId}`}
              </h1>

              <p className="mt-2 text-sm text-gray-400">
                Opened by {dispute.openedByName || "User"} · Respondent{" "}
                {dispute.respondentName || "Respondent"}
              </p>

              <div className="mt-4">
                <StatusBadge status={status} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {dispute.projectId && (
                <button
                  type="button"
                  onClick={() => navigate(`/expert/projects/${dispute.projectId}`)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
                >
                  View Project
                </button>
              )}

              {dispute.milestoneId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/expert/milestones/${dispute.milestoneId}`)
                  }
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
                >
                  View Milestone
                </button>
              )}

              <button
                type="button"
                onClick={loadDispute}
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
            <Alert type="danger" title="Dispute error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_390px]">
            <main className="space-y-6">
              <Card title="Reason">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {dispute.reason || "No reason."}
                </p>
              </Card>

              <Card title="Initial Evidence">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {dispute.evidenceText || "No evidence text."}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  {dispute.fileUrl && (
                    <a
                      href={dispute.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                    >
                      Open Evidence File
                    </a>
                  )}

                  {dispute.imageUrl && (
                    <a
                      href={dispute.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-lg border border-purple-400/40 bg-purple-400/10 px-4 py-2 text-sm font-bold text-purple-200 transition hover:bg-purple-400 hover:text-black"
                    >
                      Open Evidence Image
                    </a>
                  )}
                </div>

                {dispute.imageUrl && (
                  <img
                    src={dispute.imageUrl}
                    alt="Evidence"
                    className="mt-5 max-h-[360px] rounded-xl border border-white/10 object-contain"
                  />
                )}
              </Card>

              <Card title="Evidence Timeline">
                {dispute.evidences.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                      folder_open
                    </span>

                    <h3 className="font-bold text-white">
                      No extra evidence yet
                    </h3>

                    <p className="mt-2 text-sm text-gray-400">
                      Add evidence to support your case.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dispute.evidences.map((item) => (
                      <EvidenceItem key={item.evidenceId} evidence={item} />
                    ))}
                  </div>
                )}
              </Card>

              {dispute.adminDecision && (
                <Card title="Admin Decision">
                  <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-5 text-green-100">
                    <p className="text-sm leading-7">
                      {dispute.adminDecision}
                    </p>
                  </div>
                </Card>
              )}
            </main>

            <aside className="space-y-6">
              <Card title="Dispute Summary">
                <Info label="Dispute ID" value={`#${dispute.disputeId}`} />

                <Info
                  label="Project"
                  value={dispute.projectId ? `#${dispute.projectId}` : "N/A"}
                />

                <Info
                  label="Milestone"
                  value={
                    dispute.milestoneId
                      ? `#${dispute.milestoneId}`
                      : "Whole project"
                  }
                />

                <Info
                  label="Disputed Amount"
                  value={formatMoney(dispute.disputedAmount)}
                />

                <Info
                  label="Status"
                  value={DISPUTE_STATUS_LABEL[status] || status}
                />

                <Info label="Created At" value={formatDate(dispute.createdAt)} />

                <Info label="Resolved At" value={formatDate(dispute.resolvedAt)} />
              </Card>

              {dispute.resolutionType && (
                <Card title="Resolution">
                  <Info
                    label="Resolution Type"
                    value={
                      RESOLUTION_TYPE_LABEL[dispute.resolutionType] ||
                      dispute.resolutionType
                    }
                  />
                </Card>
              )}

              <Card title="Add Evidence">
                {resolved && (
                  <div className="mb-5 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-4 text-sm text-yellow-200">
                    This dispute is resolved. You should not submit new evidence.
                  </div>
                )}

                <form onSubmit={handleSubmitEvidence} className="space-y-5">
                  <Field label="Evidence Text">
                    <textarea
                      rows={5}
                      value={evidenceForm.evidenceText}
                      disabled={submittingEvidence || resolved}
                      onChange={(event) =>
                        updateEvidenceField("evidenceText", event.target.value)
                      }
                      placeholder="Add more proof, screenshots explanation, timeline..."
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </Field>

                  <Field label="Evidence File URL">
                    <input
                      type="url"
                      value={evidenceForm.fileUrl}
                      disabled={submittingEvidence || resolved}
                      onChange={(event) =>
                        updateEvidenceField("fileUrl", event.target.value)
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </Field>

                  <Field label="Evidence Image URL">
                    <input
                      type="url"
                      value={evidenceForm.imageUrl}
                      disabled={submittingEvidence || resolved}
                      onChange={(event) =>
                        updateEvidenceField("imageUrl", event.target.value)
                      }
                      placeholder="https://image-url..."
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </Field>

                  <Field label="Upload Image">
                    <input
                      type="file"
                      accept="image/*"
                      disabled={submittingEvidence || resolved}
                      onChange={handleEvidenceImageChange}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400/10 file:px-3 file:py-2 file:text-sm file:font-bold file:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    {evidenceForm.image && (
                      <p className="mt-2 text-xs text-gray-500">
                        Selected: {evidenceForm.image.name}
                      </p>
                    )}
                  </Field>

                  <button
                    type="submit"
                    disabled={submittingEvidence || resolved}
                    className="w-full rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingEvidence ? "Submitting..." : "Submit Evidence"}
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

function EvidenceItem({ evidence }) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
          Evidence #{evidence.evidenceId}
        </span>

        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
          {formatDate(evidence.createdAt)}
        </span>
      </div>

      <p className="text-sm leading-7 text-gray-300">
        {evidence.evidenceText || "No evidence text."}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {evidence.fileUrl && (
          <a
            href={evidence.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
          >
            Open File
          </a>
        )}

        {evidence.imageUrl && (
          <a
            href={evidence.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg border border-purple-400/40 bg-purple-400/10 px-4 py-2 text-sm font-bold text-purple-200 transition hover:bg-purple-400 hover:text-black"
          >
            Open Image
          </a>
        )}
      </div>

      {evidence.imageUrl && (
        <img
          src={evidence.imageUrl}
          alt="Evidence"
          className="mt-5 max-h-[320px] rounded-xl border border-white/10 object-contain"
        />
      )}
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
    status === "RESOLVED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : status === "UNDER_REVIEW"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-red-400/30 bg-red-400/10 text-red-300";

  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {DISPUTE_STATUS_LABEL[status] || status}
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

  return date.toLocaleString();
}

function getFriendlyError(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.response?.data?.detail ||
    err?.response?.data ||
    err?.message ||
    fallback
  );
}