import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import disputeService from "../../../services/dispute.service";
import {
  DISPUTE_STATUS_LABEL,
  RESOLUTION_TYPE_LABEL,
} from "../../../constants/disputeStatus";

const emptyEvidenceForm = {
  evidenceText: "",
  fileUrl: "",
  images: [],
};

export default function DisputeDetailPage() {
  const { disputeId } = useParams();
  const navigate = useNavigate();

  const [dispute, setDispute] = useState(null);
  const [evidenceForm, setEvidenceForm] = useState(emptyEvidenceForm);

  const [loading, setLoading] = useState(true);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showEvidenceConfirm, setShowEvidenceConfirm] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [evidenceModalError, setEvidenceModalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    loadDispute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeId]);

  const status = String(dispute?.status || "").trim().toUpperCase();
  const resolved = status === "RESOLVED";
  const evidences = useMemo(
    () => (Array.isArray(dispute?.evidences) ? dispute.evidences : []),
    [dispute]
  );

  const evidenceGroups = useMemo(
    () => groupEvidenceSubmissions(evidences),
    [evidences]
  );

  const loadDispute = async ({ preserveMessage = false } = {}) => {
    try {
      setLoading(true);
      setError("");

      if (!preserveMessage) {
        setMessage("");
      }

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
    setEvidenceModalError("");
    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setEvidenceForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEvidenceImageChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    setError("");
    setMessage("");
    setEvidenceModalError("");

    const invalidImage = selectedFiles.find(
      (file) => !String(file.type || "").startsWith("image/")
    );

    if (invalidImage) {
      setFieldErrors((prev) => ({
        ...prev,
        images: `Only image files are allowed: ${invalidImage.name}`,
      }));
      event.target.value = "";
      return;
    }

    setEvidenceForm((prev) => {
      const existingKeys = new Set(
        prev.images.map(
          (file) => `${file.name}-${file.size}-${file.lastModified}`
        )
      );

      const uniqueNewFiles = selectedFiles.filter(
        (file) =>
          !existingKeys.has(
            `${file.name}-${file.size}-${file.lastModified}`
          )
      );

      const combined = [...prev.images, ...uniqueNewFiles];

      if (combined.length > 10) {
        setFieldErrors((current) => ({
          ...current,
          images: "You can upload up to 10 images per submission.",
        }));
        return prev;
      }

      const totalSize = combined.reduce(
        (sum, file) => sum + Number(file.size || 0),
        0
      );

      if (totalSize > 60 * 1024 * 1024) {
        setFieldErrors((current) => ({
          ...current,
          images: "The total image size cannot exceed 60 MB.",
        }));
        return prev;
      }

      setFieldErrors((current) => ({
        ...current,
        images: "",
      }));

      return {
        ...prev,
        images: combined,
      };
    });

    event.target.value = "";
  };

  const removeEvidenceImage = (indexToRemove) => {
    setEvidenceModalError("");

    setEvidenceForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove),
    }));

    setFieldErrors((prev) => ({
      ...prev,
      images: "",
    }));
  };

  const validateEvidence = () => {
    const nextErrors = {};

    const evidenceText = evidenceForm.evidenceText.trim();
    const fileUrl = evidenceForm.fileUrl.trim();
    const images = evidenceForm.images;

    const hasText = Boolean(evidenceText);
    const hasFileUrl = Boolean(fileUrl);
    const hasImages = images.length > 0;

    if (!hasText && !hasFileUrl && !hasImages) {
      nextErrors.general =
        "Please add an evidence description, a supporting file URL, or at least one image.";
    }

    if (hasFileUrl && !isValidHttpUrl(fileUrl)) {
      nextErrors.fileUrl =
        "Supporting file URL must start with http:// or https://.";
    }

    if (hasFileUrl && hasImages) {
      nextErrors.general =
        "Submit uploaded images and a supporting file URL separately. The current backend accepts one evidence type per submission.";
    }

    if (images.length > 10) {
      nextErrors.images = "You can upload up to 10 images.";
    }

    const invalidImage = images.find(
      (file) => !String(file.type || "").startsWith("image/")
    );

    if (invalidImage) {
      nextErrors.images = `Only image files are allowed: ${invalidImage.name}`;
    }

    const totalSize = images.reduce(
      (sum, file) => sum + Number(file.size || 0),
      0
    );

    if (totalSize > 60 * 1024 * 1024) {
      nextErrors.images = "The total image size cannot exceed 60 MB.";
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const openEvidenceModal = () => {
    setError("");
    setMessage("");
    setEvidenceModalError("");
    setFieldErrors({});
    setShowEvidenceModal(true);
  };

  const closeEvidenceModal = () => {
    if (submittingEvidence) return;

    setShowEvidenceModal(false);
    setShowEvidenceConfirm(false);
    setEvidenceForm({ ...emptyEvidenceForm });
    setEvidenceModalError("");
    setFieldErrors({});
  };

  const handleSubmitEvidence = (event) => {
    event.preventDefault();

    if (resolved) {
      setError("This dispute is resolved. New evidence can no longer be added.");
      return;
    }

    if (!validateEvidence()) {
      setEvidenceModalError("");
      return;
    }

    setError("");
    setEvidenceModalError("");
    setShowEvidenceConfirm(true);
  };

  const confirmSubmitEvidence = async () => {
    if (submittingEvidence) return;

    const evidenceText = evidenceForm.evidenceText.trim();
    const fileUrl = evidenceForm.fileUrl.trim();
    const images = evidenceForm.images;
    const hasImages = images.length > 0;

    const previousEvidenceCount = Array.isArray(dispute?.evidences)
      ? dispute.evidences.length
      : 0;

    try {
      setSubmittingEvidence(true);
      setError("");
      setMessage("");
      setEvidenceModalError("");

      /*
       * Backend exposes two separate endpoints:
       * 1. multipart images: EvidenceText + Images[]
       * 2. JSON evidence: EvidenceText + FileUrl/ImageUrl
       *
       * Send exactly one POST per user submission.
       */
      const updatedDispute = hasImages
        ? await disputeService.addDisputeImageEvidence(disputeId, {
            evidenceText,
            images,
          })
        : await disputeService.addDisputeEvidence(disputeId, {
            evidenceText,
            fileUrl,
            imageUrl: "",
          });

      /*
       * Backend already returns the complete updated dispute.
       * Use it directly instead of waiting for another GET request.
       */
      if (updatedDispute) {
        setDispute(updatedDispute);
      }

      setShowEvidenceConfirm(false);
      setShowEvidenceModal(false);
      setEvidenceForm({ ...emptyEvidenceForm });
      setEvidenceModalError("");
      setFieldErrors({});
      setMessage("Evidence submitted successfully.");
    } catch (err) {
      console.error("ADD EVIDENCE ERROR:", err?.response?.data || err);
      setShowEvidenceConfirm(false);

      /*
       * The backend saves evidence before creating notifications.
       * If a later notification step fails, the API may return an error
       * even though the evidence was already persisted. Verify once.
       */
      try {
        const refreshed = await disputeService.getDisputeById(disputeId);
        const refreshedEvidenceCount = Array.isArray(refreshed?.evidences)
          ? refreshed.evidences.length
          : 0;

        if (refreshedEvidenceCount > previousEvidenceCount) {
          setDispute(refreshed);
          setShowEvidenceModal(false);
          setEvidenceForm({ ...emptyEvidenceForm });
          setEvidenceModalError("");
          setFieldErrors({});
          setMessage("Evidence submitted successfully.");
          return;
        }
      } catch (refreshError) {
        console.error(
          "VERIFY EVIDENCE SUBMISSION ERROR:",
          refreshError?.response?.data || refreshError
        );
      }

      setEvidenceModalError(
        getFriendlyError(
          err,
          "Evidence could not be submitted. Please try again."
        )
      );
    } finally {
      setSubmittingEvidence(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="rounded-2xl border border-white/10 bg-[#151a22] px-7 py-6 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-300" />
            <p className="text-sm font-semibold text-gray-300">
              Loading dispute...
            </p>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  if (!dispute) {
    return (
      <ExpertLayout>
        <div className="px-4 py-8 md:px-6">
          <div className="mx-auto max-w-4xl">
            <Alert
              type="danger"
              title="Dispute not found"
              message={error || "Cannot load dispute detail."}
            />

            <button
              type="button"
              onClick={() => navigate("/expert/disputes")}
              className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Back to Disputes
            </button>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="overflow-x-hidden px-4 py-5 md:px-6">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => navigate("/expert/disputes")}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            <span className="material-symbols-outlined text-[17px]">
              arrow_back
            </span>
            Back to disputes
          </button>

          <section className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-[#151a22] shadow-[0_14px_40px_rgba(0,0,0,0.24)]">
            <div className="relative overflow-hidden p-4 md:p-5">
              <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute bottom-0 right-24 h-32 w-32 rounded-full bg-purple-400/10 blur-3xl" />

              <div className="relative flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                      Dispute Workspace
                    </p>
                    <StatusBadge status={status} />
                  </div>

                  <h1 className="break-words text-xl font-black leading-tight text-white md:text-2xl">
                    {dispute.projectTitle || "Project Dispute"}
                  </h1>

                  <p className="mt-2 break-words text-sm leading-6 text-gray-400">
                    Opened by{" "}
                    <span className="font-semibold text-gray-200">
                      {dispute.openedByName || "User"}
                    </span>
                    {" · "}
                    Respondent{" "}
                    <span className="font-semibold text-gray-200">
                      {dispute.respondentName || "Respondent"}
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {dispute.projectId && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/expert/projects/${dispute.projectId}`)
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-300 transition hover:border-white/20 hover:text-white"
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
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-300 transition hover:border-white/20 hover:text-white"
                    >
                      View Milestone
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => loadDispute()}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      refresh
                    </span>
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <HeroInfo
                label="Disputed Amount"
                value={formatMoney(dispute.disputedAmount)}
              />
              <HeroInfo
                label="Milestone"
                value={
                  dispute.milestoneId
                    ? dispute.milestoneTitle || "Milestone"
                    : "Whole project"
                }
              />
              <HeroInfo
                label="Opened"
                value={formatDate(dispute.createdAt)}
              />
            </div>
          </section>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Dispute error" message={error} />
          )}

          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <main className="min-w-0 space-y-4">
              <Card title="Reason" icon="report_problem">
                <ReadableText>
                  {dispute.reason || "No reason provided."}
                </ReadableText>
              </Card>

              <Card title="Initial Evidence" icon="fact_check">
                <ReadableText>
                  {dispute.evidenceText || "No initial evidence description."}
                </ReadableText>

                {dispute.fileUrl && (
                  <div className="mt-3">
                    <ExternalLink
                      href={dispute.fileUrl}
                      label="Open Supporting File"
                      icon="open_in_new"
                    />
                  </div>
                )}

                {dispute.imageUrl && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/20 p-3">
                    <img
                      src={dispute.imageUrl}
                      alt="Initial evidence"
                      className="max-h-[280px] w-full rounded-lg object-contain"
                    />
                  </div>
                )}
              </Card>

              <Card
                title="Evidence Timeline"
                icon="history"
                action={
                  <span className="text-xs font-semibold text-gray-500">
                    {evidenceGroups.length} submission{evidenceGroups.length === 1 ? "" : "s"}
                  </span>
                }
              >
                {evidenceGroups.length === 0 ? (
                  <EmptyState
                    icon="folder_open"
                    title="No additional evidence"
                    description="New evidence from either party will appear here."
                  />
                ) : (
                  <div className="space-y-3">
                    {evidenceGroups.map((group, index) => (
                      <EvidenceSubmission
                        key={group.groupKey}
                        submission={group}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </Card>

              {dispute.adminDecision && (
                <Card title="Admin Decision" icon="gavel">
                  <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4">
                    <ReadableText className="text-green-100">
                      {dispute.adminDecision}
                    </ReadableText>
                  </div>
                </Card>
              )}
            </main>

            <aside className="min-w-0 space-y-4">
              <Card title="Summary" icon="summarize">
                <Info
                  label="Status"
                  value={DISPUTE_STATUS_LABEL[status] || status}
                />
                <Info
                  label="Project"
                  value={dispute.projectTitle || "Project"}
                />
                <Info
                  label="Dispute at"
                  value={
                    dispute.milestoneId
                      ? dispute.milestoneTitle || "Milestone"
                      : "Whole project"
                  }
                />
                <Info
                  label="Amount"
                  value={formatMoney(dispute.disputedAmount)}
                />
                <Info label="Created" value={formatDate(dispute.createdAt)} />

                {resolved && (
                  <Info
                    label="Resolved"
                    value={formatDate(dispute.resolvedAt)}
                  />
                )}
              </Card>

              {dispute.resolutionType && (
                <Card title="Resolution" icon="verified">
                  <Info
                    label="Result"
                    value={
                      RESOLUTION_TYPE_LABEL[dispute.resolutionType] ||
                      formatStatusLabel(dispute.resolutionType)
                    }
                  />
                </Card>
              )}

              <Card
                title={resolved ? "Evidence Closed" : "Evidence Actions"}
                icon={resolved ? "lock" : "add_circle"}
              >
                {resolved ? (
                  <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-sm leading-6 text-green-100">
                    This dispute has been resolved. New evidence can no longer be
                    added.
                  </div>
                ) : (
                  <div>
                    <p className="text-sm leading-6 text-gray-400">
                      Add screenshots, supporting links, or a short explanation
                      without leaving this page.
                    </p>

                    <button
                      type="button"
                      onClick={openEvidenceModal}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-black transition hover:bg-cyan-300"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        add_circle
                      </span>
                      Add Evidence
                    </button>
                  </div>
                )}
              </Card>
            </aside>
          </div>
        </div>
      </div>

      {showEvidenceModal && !resolved && (
        <EvidenceModal
          formData={evidenceForm}
          fieldErrors={fieldErrors}
          modalError={evidenceModalError}
          submitting={submittingEvidence}
          onClose={closeEvidenceModal}
          onChange={updateEvidenceField}
          onImageChange={handleEvidenceImageChange}
          onRemoveImage={removeEvidenceImage}
          onSubmit={handleSubmitEvidence}
        />
      )}

      {showEvidenceConfirm && (
        <ConfirmDialog
          title="Submit this evidence?"
          message="This evidence will be added to the dispute timeline and shared with the other party and the admin reviewer."
          confirmLabel="Confirm Submission"
          loading={submittingEvidence}
          onCancel={() =>
            !submittingEvidence && setShowEvidenceConfirm(false)
          }
          onConfirm={confirmSubmitEvidence}
        />
      )}
    </ExpertLayout>
  );
}

function EvidenceModal({
  formData,
  fieldErrors,
  modalError,
  submitting,
  onClose,
  onChange,
  onImageChange,
  onRemoveImage,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#151a22] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.65)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              Add Evidence
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Support your dispute
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-400 transition hover:text-white disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[19px]">close</span>
          </button>
        </div>

        {modalError && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-red-300">
                error
              </span>

              <div>
                <p className="text-sm font-bold text-red-300">
                  Evidence submission failed
                </p>
                <p className="mt-1 text-xs leading-5 text-red-100/80">
                  {modalError}
                </p>
              </div>
            </div>
          </div>
        )}

        {fieldErrors.general && (
          <div className="mb-4">
            <InlineError message={fieldErrors.general} />
          </div>
        )}

        <div className="space-y-4">
          <Field label="Evidence Description (optional)">
            <textarea
              rows={4}
              value={formData.evidenceText}
              disabled={submitting}
              onChange={(event) =>
                onChange("evidenceText", event.target.value)
              }
              placeholder="Explain what this evidence shows..."
              className="w-full resize-none rounded-xl border border-white/10 bg-[#0f141d] px-3 py-2.5 text-sm leading-6 text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </Field>

          <Field label="Supporting File URL (optional)" error={fieldErrors.fileUrl}>
            <input
              type="url"
              value={formData.fileUrl}
              disabled={submitting || formData.images.length > 0}
              onChange={(event) => onChange("fileUrl", event.target.value)}
              placeholder="https://drive.google.com/..."
              className={`w-full rounded-xl border bg-[#0f141d] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 ${
                fieldErrors.fileUrl
                  ? "border-red-400/60"
                  : "border-white/10"
              }`}
            />

            {formData.images.length > 0 && (
              <p className="mt-2 text-xs leading-5 text-yellow-200/80">
                Remove the selected images to submit a supporting file URL.
              </p>
            )}
          </Field>

          <Field label="Images" error={fieldErrors.images}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                Up to 10 images · 60 MB total
              </span>
              <span className="text-xs font-bold text-cyan-300">
                {formData.images.length}/10
              </span>
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-400/30 bg-cyan-400/[0.05] px-3 py-3 text-sm font-bold text-cyan-300 transition hover:border-cyan-400/60 hover:bg-cyan-400/10">
              <span className="material-symbols-outlined text-[18px]">
                add_photo_alternate
              </span>
              {formData.images.length > 0
                ? "Add More Images"
                : "Choose Images"}

              <input
                type="file"
                accept="image/*"
                multiple
                disabled={submitting || Boolean(formData.fileUrl.trim())}
                onChange={onImageChange}
                className="hidden"
              />
            </label>

            {formData.fileUrl.trim() && (
              <p className="mt-2 text-xs leading-5 text-yellow-200/80">
                Clear the supporting file URL before selecting images.
              </p>
            )}

            {formData.images.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.images.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-gray-300">
                        {file.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-600">
                        {formatFileSize(file.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveImage(index)}
                      disabled={submitting}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-red-300 transition hover:bg-red-400/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#151a22] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <span className="material-symbols-outlined">fact_check</span>
        </div>

        <h3 className="text-lg font-black text-white">{title}</h3>

        <p className="mt-2 text-sm leading-6 text-gray-400">{message}</p>

        <div className="mt-5 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.07] p-3">
          <p className="text-xs leading-5 text-yellow-100">
            Please make sure your files and description are correct before
            continuing.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Submitting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EvidenceSubmission({ submission, index }) {
  const images = Array.isArray(submission.images) ? submission.images : [];
  const files = Array.isArray(submission.files) ? submission.files : [];

  return (
    <article className="min-w-0 rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-bold text-cyan-300">
              Evidence Submission {index + 1}
            </span>

            {submission.uploadedByName && (
              <span className="text-xs text-gray-500">
                by {submission.uploadedByName}
              </span>
            )}
          </div>

          <p className="mt-2 text-[11px] text-gray-600">
            {images.length} image{images.length === 1 ? "" : "s"}
            {files.length > 0
              ? ` · ${files.length} supporting file${files.length === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>

        <span className="shrink-0 text-xs text-gray-600">
          {formatDate(submission.createdAt)}
        </span>
      </div>

      {submission.evidenceText ? (
        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
            Description
          </p>
          <ReadableText>{submission.evidenceText}</ReadableText>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 bg-black/10 p-3 text-sm text-gray-500">
          No description was provided for this evidence submission.
        </p>
      )}

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((fileUrl, fileIndex) => (
            <ExternalLink
              key={`${fileUrl}-${fileIndex}`}
              href={fileUrl}
              label={`Open Supporting File${files.length > 1 ? ` ${fileIndex + 1}` : ""}`}
              icon="open_in_new"
            />
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div
          className={`mt-3 grid gap-3 ${
            images.length === 1
              ? "grid-cols-1"
              : "grid-cols-1 sm:grid-cols-2"
          }`}
        >
          {images.map((imageUrl, imageIndex) => (
            <a
              key={`${imageUrl}-${imageIndex}`}
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="group overflow-hidden rounded-xl border border-white/10 bg-black/20 p-2 transition hover:border-cyan-400/40"
            >
              <img
                src={imageUrl}
                alt={`Evidence submission ${index + 1}, image ${imageIndex + 1}`}
                className="h-48 w-full rounded-lg object-contain"
              />

              <div className="mt-2 flex items-center justify-between gap-2 px-1 pb-1">
                <span className="text-xs font-semibold text-gray-400">
                  Image {imageIndex + 1}
                </span>
                <span className="material-symbols-outlined text-[15px] text-cyan-300 opacity-0 transition group-hover:opacity-100">
                  open_in_new
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

function groupEvidenceSubmissions(evidences = []) {
  const sorted = [...evidences].sort((a, b) => {
    const timeA = new Date(a?.createdAt || 0).getTime();
    const timeB = new Date(b?.createdAt || 0).getTime();
    return timeA - timeB;
  });

  const groups = [];
  const MAX_GROUP_GAP_MS = 2 * 60 * 1000;

  sorted.forEach((evidence, index) => {
    const evidenceText = String(evidence?.evidenceText || "").trim();
    const uploadedByUserId = String(evidence?.uploadedByUserId || "");
    const uploadedByName = String(evidence?.uploadedByName || "User").trim();
    const createdTime = new Date(evidence?.createdAt || 0).getTime();

    const lastGroup = groups[groups.length - 1];
    const lastTime = lastGroup
      ? new Date(lastGroup.lastCreatedAt || 0).getTime()
      : Number.NaN;

    const sameDescription =
      lastGroup &&
      String(lastGroup.evidenceText || "").trim() === evidenceText;

    const sameUploader =
      lastGroup &&
      String(lastGroup.uploadedByUserId || "") === uploadedByUserId &&
      String(lastGroup.uploadedByName || "").trim() === uploadedByName;

    const closeInTime =
      lastGroup &&
      Number.isFinite(createdTime) &&
      Number.isFinite(lastTime) &&
      Math.abs(createdTime - lastTime) <= MAX_GROUP_GAP_MS;

    /*
     * Backend currently creates one evidence row per uploaded image.
     * Rows created in the same submission share description, uploader,
     * and nearly identical timestamps, so combine them into one UI group.
     */
    if (sameDescription && sameUploader && closeInTime) {
      if (evidence?.imageUrl && !lastGroup.images.includes(evidence.imageUrl)) {
        lastGroup.images.push(evidence.imageUrl);
      }

      if (evidence?.fileUrl && !lastGroup.files.includes(evidence.fileUrl)) {
        lastGroup.files.push(evidence.fileUrl);
      }

      lastGroup.lastCreatedAt = evidence?.createdAt || lastGroup.lastCreatedAt;
      lastGroup.evidenceIds.push(evidence?.evidenceId || evidence?.id || index);
      return;
    }

    groups.push({
      groupKey: [
        evidence?.evidenceId || evidence?.id || index,
        uploadedByUserId || uploadedByName,
        createdTime || index,
      ].join("-"),
      evidenceText,
      uploadedByUserId,
      uploadedByName,
      createdAt: evidence?.createdAt || "",
      lastCreatedAt: evidence?.createdAt || "",
      images: evidence?.imageUrl ? [evidence.imageUrl] : [],
      files: evidence?.fileUrl ? [evidence.fileUrl] : [],
      evidenceIds: [evidence?.evidenceId || evidence?.id || index],
    });
  });

  return groups.reverse();
}

function Card({ title, icon, action, children }) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-[#151a22] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.16)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <span className="material-symbols-outlined text-[18px] text-cyan-300">
                {icon}
              </span>
            </div>
          )}

          <h2 className="truncate text-base font-extrabold text-white">
            {title}
          </h2>
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </label>
      {children}
      {error && <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.025] p-3 last:mb-0">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words [overflow-wrap:anywhere] text-sm font-bold text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function HeroInfo({ label, value }) {
  return (
    <div className="min-w-0 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words [overflow-wrap:anywhere] text-sm font-black text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function ReadableText({ children, className = "" }) {
  return (
    <p
      className={`max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-gray-300 ${className}`}
    >
      {children}
    </p>
  );
}

function ExternalLink({ href, label, icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
    >
      {label}
      <span className="material-symbols-outlined text-[15px]">{icon}</span>
    </a>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
      <span className="material-symbols-outlined mb-2 block text-4xl text-gray-600">
        {icon}
      </span>
      <p className="font-bold text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
    </div>
  );
}

function InlineError({ message }) {
  return (
    <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-xs leading-5 text-red-200">
      {message}
    </div>
  );
}

function StatusBadge({ status }) {
  const resolved = status === "RESOLVED";

  const style = resolved
    ? "border-green-400/30 bg-green-400/10 text-green-300"
    : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${style}`}
    >
      {DISPUTE_STATUS_LABEL[status] || formatStatusLabel(status)}
    </span>
  );
}

function Alert({ type, title, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${style}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1 break-words [overflow-wrap:anywhere]">{message}</p>
    </div>
  );
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatFileSize(size) {
  const bytes = Number(size || 0);

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatStatusLabel(status) {
  return String(status || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data?.errors && typeof data.errors === "object") {
    const validationMessages = Object.values(data.errors)
      .flat()
      .filter(Boolean)
      .map((item) => String(item).trim())
      .filter(Boolean);

    if (validationMessages.length > 0) {
      return validationMessages.join(" ");
    }
  }

  return (
    data?.message ||
    data?.detail ||
    data?.title ||
    err?.message ||
    fallback
  );
}