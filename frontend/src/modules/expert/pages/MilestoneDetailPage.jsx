import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import milestoneService from "../../../services/milestone.service";
import deliverableService from "../../../services/deliverable.service";
import disputeService from "../../../services/dispute.service";
import projectService from "../../../services/project.service";

import { compareDateDesc, formatDateTime } from "../../../utils/dateTime.utils";
const emptySubmissionForm = {
  fileUrl: "",
  demoUrl: "",
  demoInstructions: "",
  testResultUrl: "",
  testSummary: "",
  description: "",
  handoverNotes: "",
};

const emptyDisputeForm = {
  reason: "",
  evidenceText: "",
  evidenceFileUrl: "",
  images: [],
};

export default function MilestoneDetailPage() {
  const { milestoneId } = useParams();
  const navigate = useNavigate();

  const [milestone, setMilestone] = useState(null);
  const [project, setProject] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [activeDispute, setActiveDispute] = useState(null);
  const [submissionForm, setSubmissionForm] = useState(emptySubmissionForm);

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeForm, setDisputeForm] = useState(emptyDisputeForm);
  const [creatingDispute, setCreatingDispute] = useState(false);
  const [disputeError, setDisputeError] = useState("");
  const [disputeFieldErrors, setDisputeFieldErrors] = useState({});
  const [showDisputeConfirm, setShowDisputeConfirm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionFieldErrors, setSubmissionFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showSubmissionConfirm, setShowSubmissionConfirm] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

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
      const projectId = getProjectIdFromMilestone(data);

      if (projectId) {
        try {
          const projectData = await projectService.getProjectById(projectId);
          setProject(projectData);
        } catch (projectError) {
          console.warn(
            "LOAD PROJECT STATUS ERROR:",
            projectError?.response?.data || projectError
          );
          setProject(null);
        }
      } else {
        setProject(null);
      }

      if (projectId && realMilestoneId) {
        await loadActiveDispute(projectId, realMilestoneId);
      } else {
        setActiveDispute(null);
      }

      if (realMilestoneId) {
        await loadSubmissions(realMilestoneId);
      }
    } catch (err) {
      console.error("LOAD MILESTONE DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load milestone."));
      setMilestone(null);
      setProject(null);
      setActiveDispute(null);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveDispute = async (projectId, realMilestoneId) => {
    try {
      const disputes = await disputeService.getMyDisputes();

      const found = Array.isArray(disputes)
        ? disputes.find((item) => {
            const status = String(item.status || "")
              .trim()
              .toUpperCase();

            const isActive = status === "OPEN";

            const disputeProjectId =
              item?.projectId ||
              item?.ProjectId ||
              item?.raw?.projectId ||
              item?.raw?.ProjectId ||
              "";

            const disputeMilestoneId =
              item?.milestoneId ||
              item?.MilestoneId ||
              item?.raw?.milestoneId ||
              item?.raw?.MilestoneId ||
              "";

            const sameProject =
              String(disputeProjectId) === String(projectId);

            /*
             * Chỉ xem dispute là của milestone hiện tại khi Backend trả đúng
             * milestoneId. Project-level dispute không được tự động khóa tất
             * cả milestone trong cùng project.
             */
            const sameMilestone =
              Boolean(disputeMilestoneId) &&
              String(disputeMilestoneId) === String(realMilestoneId);

            return isActive && sameProject && sameMilestone;
          })
        : null;

      setActiveDispute(found || null);
    } catch (err) {
      console.warn("LOAD ACTIVE DISPUTE ERROR:", err?.response?.data || err);
      setActiveDispute(null);
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
    setSubmissionFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setSubmissionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateDisputeField = (name, value) => {
    setDisputeError("");
    setDisputeFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setDisputeForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDisputeImageChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    setDisputeError("");

    setDisputeForm((prev) => {
      const existingKeys = new Set(
        prev.images.map(
          (file) => `${file.name}-${file.size}-${file.lastModified}`
        )
      );

      const uniqueNewFiles = selectedFiles.filter((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        return !existingKeys.has(key);
      });

      const mergedImages = [...prev.images, ...uniqueNewFiles];
      const limitedImages = mergedImages.slice(0, 10);

      setDisputeFieldErrors((current) => ({
        ...current,
        images:
          mergedImages.length > 10
            ? "You can upload up to 10 images. Extra images were not added."
            : "",
      }));

      return {
        ...prev,
        images: limitedImages,
      };
    });

    event.target.value = "";
  };

  const removeDisputeImage = (indexToRemove) => {
    setDisputeForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove),
    }));
  };

  const resetSubmissionForm = () => {
    setMessage("");
    setError("");
    setSubmissionError("");
    setSubmissionFieldErrors({});
    setSubmissionForm({ ...emptySubmissionForm });
  };

  const openDisputeModal = () => {
    const activeDisputeId = getDisputeId(activeDispute);

    if (isProjectCompletedStatus(getProjectStatus(project, milestone))) {
      if (activeDisputeId) {
        navigate(`/expert/disputes/${activeDisputeId}`);
      } else {
        setError(
          "This project is completed. You cannot open a new dispute for this milestone."
        );
      }
      return;
    }

    if (activeDisputeId) {
      navigate(`/expert/disputes/${activeDisputeId}`);
      return;
    }

    setDisputeError("");
    setDisputeFieldErrors({});
    setDisputeForm({
      ...emptyDisputeForm,
      reason: buildDefaultDisputeReason(milestone),
    });
    setShowDisputeModal(true);
  };

  const closeDisputeModal = () => {
    if (creatingDispute) return;

    setShowDisputeModal(false);
    setShowDisputeConfirm(false);
    setDisputeError("");
    setDisputeFieldErrors({});
    setDisputeForm({ ...emptyDisputeForm });
  };

  const validateSubmission = () => {
    const fieldErrors = {};
    const fileUrl = submissionForm.fileUrl.trim();
    const demoUrl = submissionForm.demoUrl.trim();
    const demoInstructions = submissionForm.demoInstructions.trim();
    const testResultUrl = submissionForm.testResultUrl.trim();
    const testSummary = submissionForm.testSummary.trim();
    const description = submissionForm.description.trim();
    const handoverNotes = submissionForm.handoverNotes.trim();

    if (!fileUrl) {
      fieldErrors.fileUrl =
        "A public file or repository URL is required for the client to review your work.";
    } else if (!isValidHttpUrl(fileUrl)) {
      fieldErrors.fileUrl = "Enter a valid HTTP or HTTPS file URL.";
    }

    if (demoUrl && !isValidHttpUrl(demoUrl)) {
      fieldErrors.demoUrl = "Enter a valid HTTP or HTTPS demo URL.";
    }

    if (demoInstructions.length > 2000) {
      fieldErrors.demoInstructions =
        "Demo instructions cannot exceed 2,000 characters.";
    }

    if (testResultUrl && !isValidHttpUrl(testResultUrl)) {
      fieldErrors.testResultUrl =
        "Enter a valid HTTP or HTTPS test result URL.";
    }

    if (testResultUrl && !testSummary) {
      fieldErrors.testSummary =
        "Add a short test summary when a test result URL is provided.";
    }

    if (testSummary.length > 2000) {
      fieldErrors.testSummary =
        "Test summary cannot exceed 2,000 characters.";
    }

    if (!description) {
      fieldErrors.description = "Please describe what you delivered.";
    } else if (description.length < 20) {
      fieldErrors.description =
        "Description must be at least 20 characters.";
    } else if (description.length > 4000) {
      fieldErrors.description =
        "Description cannot exceed 4,000 characters.";
    }

    if (handoverNotes.length > 4000) {
      fieldErrors.handoverNotes =
        "Handover cannot exceed 4,000 characters.";
    }

    setSubmissionFieldErrors(fieldErrors);

    return Object.values(fieldErrors)[0] || "";
  };

  const validateDispute = () => {
    const fieldErrors = {};

    if (!disputeForm.reason.trim()) {
      fieldErrors.reason = "Reason is required.";
    } else if (disputeForm.reason.trim().length < 10) {
      fieldErrors.reason = "Reason must be at least 10 characters.";
    }

    if (
      disputeForm.evidenceFileUrl.trim() &&
      !isValidHttpUrl(disputeForm.evidenceFileUrl)
    ) {
      fieldErrors.evidenceFileUrl =
        "Evidence file URL must be a valid HTTP or HTTPS URL.";
    }

    if (disputeForm.images.length > 10) {
      fieldErrors.images = "You can upload up to 10 images.";
    }

    const invalidImage = disputeForm.images.find(
      (file) => !String(file.type || "").startsWith("image/")
    );

    if (invalidImage) {
      fieldErrors.images = `Only image files are allowed: ${invalidImage.name}`;
    }

    const totalSize = disputeForm.images.reduce(
      (sum, file) => sum + Number(file.size || 0),
      0
    );

    if (totalSize > 60 * 1024 * 1024) {
      fieldErrors.images = "The total image size cannot exceed 60 MB.";
    }

    setDisputeFieldErrors(fieldErrors);

    return Object.values(fieldErrors)[0] || "";
  };

  const handleSubmitWork = (event) => {
    event.preventDefault();

    if (isProjectCompletedStatus(getProjectStatus(project, milestone))) {
      setSubmissionError(
        "This project is completed. New milestone submissions and resubmissions are closed."
      );
      return;
    }

    const realMilestoneId = getMilestoneId(milestone) || milestoneId;
    const latestSubmission = getLatestSubmission(submissions);

    if (activeDispute) {
      setSubmissionError(
        "This milestone already has an active dispute. Please wait for admin resolution."
      );
      return;
    }

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

    setSubmissionError("");
    setShowSubmissionConfirm(true);
  };

  const confirmSubmitWork = async () => {
    const realMilestoneId = getMilestoneId(milestone) || milestoneId;
    const latestSubmission = getLatestSubmission(submissions);

    const isResubmission =
      Boolean(latestSubmission) &&
      (isChangeRequested(latestSubmission.status) ||
        isChangeRequested(milestone?.status));

    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      setSubmissionError("");

      await deliverableService.submitDeliverable(
        realMilestoneId,
        submissionForm
      );

      setShowSubmissionConfirm(false);
      setMessage(
        isResubmission
          ? "Your updated work has been resubmitted successfully."
          : "Your work has been submitted successfully."
      );

      setSubmissionForm({ ...emptySubmissionForm });
      setSubmissionFieldErrors({});

      await loadSubmissions(realMilestoneId);
    } catch (err) {
      console.error("SUBMIT WORK ERROR:", err?.response?.data || err);
      setShowSubmissionConfirm(false);
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

  const handleCreateDispute = (event) => {
    event.preventDefault();

    if (isProjectCompletedStatus(getProjectStatus(project, milestone))) {
      setDisputeError(
        "This project is completed. You cannot open a new dispute for this milestone."
      );
      return;
    }

    const activeDisputeId = getDisputeId(activeDispute);

    if (activeDisputeId) {
      navigate(`/expert/disputes/${activeDisputeId}`);
      return;
    }

    const projectId = getProjectIdFromMilestone(milestone);
    const realMilestoneId = getMilestoneId(milestone) || milestoneId;
    const disputedAmount = getMilestoneDisputableAmount(milestone);

    if (!projectId || !realMilestoneId) {
      setDisputeError("Cannot identify the current project or milestone.");
      return;
    }

    if (!disputedAmount || disputedAmount <= 0) {
      setDisputeError("Locked escrow amount is unavailable for this milestone.");
      return;
    }

    const validationError = validateDispute();

    if (validationError) {
      setDisputeError(validationError);
      return;
    }

    setDisputeError("");
    setShowDisputeConfirm(true);
  };

  const confirmCreateDispute = async () => {
    const projectId = getProjectIdFromMilestone(milestone);
    const realMilestoneId = getMilestoneId(milestone) || milestoneId;
    const disputedAmount = getMilestoneDisputableAmount(milestone);

    try {
      setCreatingDispute(true);
      setDisputeError("");

      const createdDispute = await disputeService.createDispute(projectId, {
        milestoneId: realMilestoneId,
        disputedAmount,
        reason: disputeForm.reason,
        evidenceText: disputeForm.evidenceText,
        evidenceFileUrl: disputeForm.evidenceFileUrl,
        images: disputeForm.images,
      });

      const disputeId = getDisputeId(createdDispute);

      setShowDisputeConfirm(false);

      if (disputeId) {
        navigate(`/expert/disputes/${disputeId}`, { replace: true });
        return;
      }

      /*
       * Một số response chỉ trả message mà không trả disputeId.
       * Tải lại danh sách để tìm dispute vừa tạo rồi điều hướng thẳng tới detail.
       */
      const latestDisputes = await disputeService.getMyDisputes();
      const createdItem = Array.isArray(latestDisputes)
        ? latestDisputes.find((item) => {
            const itemStatus = String(item?.status || "")
              .trim()
              .toUpperCase();

            return (
              itemStatus === "OPEN" &&
              String(item?.projectId || "") === String(projectId) &&
              String(item?.milestoneId || "") === String(realMilestoneId)
            );
          })
        : null;

      const createdItemId = getDisputeId(createdItem);

      if (createdItemId) {
        navigate(`/expert/disputes/${createdItemId}`, { replace: true });
        return;
      }

      navigate("/expert/disputes", {
        replace: true,
        state: {
          message: "Dispute opened successfully.",
        },
      });
    } catch (err) {
      console.error("CREATE DISPUTE ERROR:", err?.response?.data || err);
      setShowDisputeConfirm(false);
      setDisputeError(getFriendlyError(err, "Cannot open dispute."));
    } finally {
      setCreatingDispute(false);
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
        <PageSkeleton rows={5} />
      </ExpertLayout>
    );
  }

  if (!milestone) {
    return (
      <ExpertLayout>
        <div className="px-5 py-8 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert
              type="danger"
              title="Milestone not found"
              message={error || "Cannot load this milestone."}
            />

            <button
              type="button"
              onClick={() => navigate("/expert/projects")}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              Back to Projects
            </button>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  const realMilestoneId = getMilestoneId(milestone) || milestoneId;
  const milestoneStatus = String(milestone.status || "PENDING").toUpperCase();
  const projectStatus = getProjectStatus(project, milestone);
  const projectCompleted = isProjectCompletedStatus(projectStatus);

  const latestSubmission = getLatestSubmission(submissions);
  const hasSubmission = Boolean(getSubmissionId(latestSubmission));
  const activeDisputeId = getDisputeId(activeDispute);

  const needsResubmission =
    hasSubmission &&
    (isChangeRequested(latestSubmission?.status) ||
      isChangeRequested(milestoneStatus));

  const canSubmit =
    !projectCompleted &&
    !activeDisputeId &&
    canSubmitWorkForMilestone(milestoneStatus) &&
    (!hasSubmission || needsResubmission) &&
    !submissionLoading;

  const milestoneUi = getMilestoneUiStatus({
    milestoneStatus,
    latestSubmission,
    hasSubmission,
    needsResubmission,
    activeDisputeId,
  });

  const formTitle = projectCompleted
    ? "Milestone Closed"
    : needsResubmission
    ? "Resubmit delivery"
    : "Submit delivery";

  const formDescription = projectCompleted
    ? "This project is completed. You can review previous submissions, but no new work or dispute can be submitted."
    : needsResubmission
    ? "Update the delivery based on client feedback."
    : "Send completed work to the client.";

  const latestClientFeedback = getClientFeedback(latestSubmission);
  const canOpenDispute =
    !projectCompleted &&
    canOpenMilestoneDispute(milestoneStatus, latestSubmission);

  const shouldShowOpenDispute = canOpenDispute && !activeDisputeId;
  const shouldShowViewDispute = Boolean(activeDisputeId);

  return (
    <ExpertLayout>
      <div className="px-4 py-5 md:px-6">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={goBackToProject}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Back to project
          </button>

          {activeDisputeId && (
            <Alert
              type="danger"
              title="Active dispute found"
              message="This milestone already has an active dispute. You can view the current dispute detail instead of opening a new one."
            />
          )}

          <section className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-[#151a22] shadow-[0_12px_35px_rgba(0,0,0,0.24)]">
            <div className="relative overflow-hidden border-b border-white/10 p-4 md:p-5">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute bottom-0 right-28 h-36 w-36 rounded-full bg-purple-400/10 blur-3xl" />

              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-[#00F0FF]">
                    Milestone
                  </p>

                  <h1 className="max-w-4xl text-xl font-black leading-tight text-white md:text-3xl">
                    {milestone.title || "Untitled Milestone"}
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                    {projectCompleted
                      ? "Review the completed milestone, previous submissions, and any existing dispute."
                      : "Review the brief, submit work, and manage client feedback."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <FriendlyStatusBadge ui={milestoneUi} />

                    {shouldShowOpenDispute && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-bold text-red-300">
                        <span className="material-symbols-outlined text-sm">
                          gavel
                        </span>
                        Dispute Available
                      </span>
                    )}

                    {shouldShowViewDispute && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-bold text-red-300">
                        <span className="material-symbols-outlined text-sm">
                          report_problem
                        </span>
                        Active Dispute
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  {shouldShowOpenDispute && (
                    <button
                      type="button"
                      onClick={openDisputeModal}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/50 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        gavel
                      </span>
                      Open Dispute
                    </button>
                  )}

                  {shouldShowViewDispute && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/expert/disputes/${activeDisputeId}`)
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/50 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        visibility
                      </span>
                      View Dispute
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={loadMilestone}
                    disabled={submissionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      refresh
                    </span>
                    {submissionLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
              <HeroInfo
                icon="calendar_month"
                label="Due Date"
                value={formatDate(milestone.dueDate)}
              />

              <HeroInfo
                icon="payments"
                label="Price"
                value={formatMoney(getMilestoneAmount(milestone))}
              />

              <HeroInfo
                icon="assignment"
                label="Submissions"
                value={submissions.length}
              />
            </div>
          </section>

          {message && <SuccessToast message={message} onClose={() => setMessage("")} />}

          {error && (
            <Alert type="danger" title="Milestone error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
            <main className="min-w-0 space-y-5">
              <Card
                title="Milestone brief"
                subtitle=""
                icon="task_alt"
              >
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="whitespace-pre-line text-sm leading-6 text-gray-300">
                    {milestone.description || "No description provided."}
                  </p>
                </div>

                {milestone.acceptanceCriteria && (
                  <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                    <div className="mb-2 flex items-center gap-2 text-cyan-300">
                      <span className="material-symbols-outlined text-[18px]">
                        checklist
                      </span>
                      <p className="text-xs font-black uppercase tracking-[0.18em]">
                        Acceptance Criteria
                      </p>
                    </div>

                    <p className="whitespace-pre-line text-sm leading-6 text-gray-300">
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

                {projectCompleted && (
                  <div className="mb-4 rounded-2xl border border-green-400/30 bg-green-400/10 p-4 text-sm leading-6 text-green-100">
                    This project is complete. Previous submissions remain available.
                  </div>
                )}

                {activeDisputeId && (
                  <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
                    This milestone is currently in dispute.
                  </div>
                )}

                {!projectCompleted && !canSubmitWorkForMilestone(milestoneStatus) && (
                  <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100">
                    This milestone is currently closed for submission.
                  </div>
                )}

                {hasSubmission && !needsResubmission && (
                  <SubmittedNotice
                    submission={latestSubmission}
                    onOpen={() => openSubmissionDetail(latestSubmission)}
                  />
                )}

                {!projectCompleted && needsResubmission && (
                  <div className="mb-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100">
                    <div className="flex gap-3">
                      <span className="material-symbols-outlined text-yellow-300">
                        edit_note
                      </span>

                      <div>
                        <p className="font-bold text-white">
                          Changes requested by client
                        </p>

                        <p className="mt-1">
                          Please update the milestone submission below. If you
                          disagree with the client feedback, you can open a
                          dispute.
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

                    {shouldShowOpenDispute && (
                      <button
                        type="button"
                        onClick={openDisputeModal}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-400/50 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          gavel
                        </span>
                        Open Dispute
                      </button>
                    )}

                    {shouldShowViewDispute && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/expert/disputes/${activeDisputeId}`)
                        }
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-400/50 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          visibility
                        </span>
                        View Dispute
                      </button>
                    )}
                  </div>
                )}

                {canSubmit && (
                  <form
                    id="milestone-submission-form"
                    onSubmit={handleSubmitWork}
                    className="space-y-5"
                  >
                    <div className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.09] via-white/[0.025] to-cyan-400/[0.05]">
                      <div className="grid gap-0 md:grid-cols-[1fr_auto]">
                        <div className="p-5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
                              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                            </span>
                            <p className="text-sm font-black text-white">Delivery package</p>
                          </div>
                          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                            Add the main delivery link and any supporting review details.
                          </p>
                        </div>
                        <div className="flex items-center border-t border-white/10 bg-black/10 px-5 py-4 md:border-l md:border-t-0">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Milestone value</p>
                            <p className="mt-1 text-lg font-black text-emerald-300">{formatMoney(getMilestoneAmount(milestone))}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <SubmissionSection
                      number="1"
                      title="Delivery package"
                    >
                      <SubmitWorkInput
                        label="File or Repository URL"
                        required
                        value={submissionForm.fileUrl}
                        disabled={submitting}
                        error={submissionFieldErrors.fileUrl}
                        onChange={(value) =>
                          updateSubmissionField("fileUrl", value)
                        }
                        placeholder="https://github.com/your-name/project"
                      />

                      <SubmitWorkTextArea
                        label="What did you deliver?"
                        required
                        value={submissionForm.description}
                        disabled={submitting}
                        error={submissionFieldErrors.description}
                        maxLength={4000}
                        onChange={(value) =>
                          updateSubmissionField("description", value)
                        }
                        placeholder="Example: Completed the dashboard, authentication flow, API integration, and responsive layout required for milestone 1..."
                        rows={4}
                      />
                    </SubmissionSection>

                    <SubmissionSection
                      number="2"
                      title="Demo details"
                      optional
                    >
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <SubmitWorkInput
                          label="Demo URL"
                          value={submissionForm.demoUrl}
                          disabled={submitting}
                          error={submissionFieldErrors.demoUrl}
                          onChange={(value) =>
                            updateSubmissionField("demoUrl", value)
                          }
                          placeholder="https://your-demo.vercel.app"
                        />

                        <SubmitWorkTextArea
                          label="Demo Instructions"
                          value={submissionForm.demoInstructions}
                          disabled={submitting}
                          error={submissionFieldErrors.demoInstructions}
                          maxLength={2000}
                          onChange={(value) =>
                            updateSubmissionField("demoInstructions", value)
                          }
                          placeholder="Example: Open the demo, sign in with the provided test account, then navigate to Projects..."
                          rows={4}
                        />
                      </div>
                    </SubmissionSection>

                    <SubmissionSection
                      number="3"
                      title="Test results"
                      optional
                    >
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <SubmitWorkInput
                          label="Test Result URL"
                          value={submissionForm.testResultUrl}
                          disabled={submitting}
                          error={submissionFieldErrors.testResultUrl}
                          onChange={(value) =>
                            updateSubmissionField("testResultUrl", value)
                          }
                          placeholder="https://github.com/.../actions/runs/..."
                        />

                        <SubmitWorkTextArea
                          label="Test Summary"
                          required={Boolean(
                            submissionForm.testResultUrl.trim()
                          )}
                          value={submissionForm.testSummary}
                          disabled={submitting}
                          error={submissionFieldErrors.testSummary}
                          maxLength={2000}
                          onChange={(value) =>
                            updateSubmissionField("testSummary", value)
                          }
                          placeholder="Example: 18 automated tests passed. Core user flows were verified with no critical issues..."
                          rows={4}
                        />
                      </div>
                    </SubmissionSection>

                    <SubmissionSection
                      number="4"
                      title="Handover"
                      optional
                    >
                      <SubmitWorkTextArea
                        label="Notes for Client"
                        value={submissionForm.handoverNotes}
                        disabled={submitting}
                        error={submissionFieldErrors.handoverNotes}
                        maxLength={4000}
                        onChange={(value) =>
                          updateSubmissionField("handoverNotes", value)
                        }
                        placeholder="Example: Run npm install and npm run dev. The demo account is included in the project README..."
                        rows={3}
                      />
                    </SubmissionSection>

                    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-2 text-xs leading-5 text-gray-500">
                        <span className="material-symbols-outlined mt-0.5 text-[17px] text-cyan-300">
                          verified_user
                        </span>
                      </div>

                      <div className="flex shrink-0 flex-wrap justify-end gap-3">
                        <button
                          type="button"
                          onClick={resetSubmissionForm}
                          disabled={submitting}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-gray-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Clear Form
                        </button>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            send
                          </span>

                          {submitting
                            ? "Submitting..."
                            : needsResubmission
                            ? "Review and Resubmit"
                            : "Review and Submit"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}              </Card>

              <Card
                title="Submission History"
                subtitle="Track previous submissions and client review status."
                icon="history"
              >
                {submissionLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-400">
                    Loading submissions...
                  </div>
                ) : submissions.length === 0 ? (
                  <EmptyState
                    icon="assignment"
                    title="No submission yet"
                    description="Your submitted work will appear here after you send it to the client."
                  />
                ) : (
                  <div className="space-y-3">
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

            <aside className="space-y-4 xl:sticky xl:top-20">
              <MarketplaceSidebar
                milestone={milestone}
                project={project}
                milestoneUi={milestoneUi}
                submissions={submissions}
                canSubmit={canSubmit}
                needsResubmission={needsResubmission}
                activeDisputeId={activeDisputeId}
                onSubmitFocus={() =>
                  document
                    .getElementById("milestone-submission-form")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                onViewDispute={() =>
                  activeDisputeId &&
                  navigate(`/expert/disputes/${activeDisputeId}`)
                }
              />
            </aside>
          </div>
        </div>
      </div>

      {showDisputeModal && !projectCompleted && (
        <DisputeModal
          formData={disputeForm}
          milestone={milestone}
          error={disputeError}
          fieldErrors={disputeFieldErrors}
          creating={creatingDispute}
          onClose={closeDisputeModal}
          onChange={updateDisputeField}
          onImageChange={handleDisputeImageChange}
          onRemoveImage={removeDisputeImage}
          onSubmit={handleCreateDispute}
        />
      )}

      {showSubmissionConfirm && (
        <ConfirmDialog
          title={needsResubmission ? "Resubmit this milestone?" : "Submit this milestone?"}
          message={
            needsResubmission
              ? "Your updated work will be sent to the client for another review. Please confirm that all links and notes are correct."
              : "Your work will be sent to the client for review. Please confirm that all links and delivery details are correct."
          }
          confirmLabel={needsResubmission ? "Confirm Resubmission" : "Confirm Submission"}
          loading={submitting}
          onCancel={() => !submitting && setShowSubmissionConfirm(false)}
          onConfirm={confirmSubmitWork}
        />
      )}

      {showDisputeConfirm && (
        <ConfirmDialog
          title="Open this dispute?"
          message={`The milestone will enter dispute review for ${formatMoney(
            getMilestoneDisputableAmount(milestone)
          )}. You can continue adding evidence while the dispute is open.`}
          confirmLabel="Confirm Open Dispute"
          danger
          loading={creatingDispute}
          onCancel={() => !creatingDispute && setShowDisputeConfirm(false)}
          onConfirm={confirmCreateDispute}
        />
      )}
    </ExpertLayout>
  );
}

function PageSkeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 h-5 w-36 rounded-full bg-white/10" />
        <div className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-6 md:p-8">
          <div className="h-4 w-28 rounded bg-cyan-400/10" />
          <div className="mt-4 h-9 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/[0.07]" />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-20 rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="h-32 rounded-2xl border border-white/10 bg-[#151a22]"
              />
            ))}
          </div>
          <div className="h-72 rounded-2xl border border-white/10 bg-[#151a22]" />
        </div>
      </div>
    </div>
  );
}



function SuccessToast({ message, onClose }) {
  return (
    <div className="fixed right-4 top-4 z-[1200] w-[min(92vw,380px)] animate-[fadeIn_.2s_ease-out]">
      <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-[#111a16] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-green-400/30 bg-green-400/10 text-green-300">
          <span className="material-symbols-outlined">check_circle</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Action completed</p>
          <p className="mt-1 text-sm leading-5 text-green-100/75">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 transition hover:text-white"
          aria-label="Close notification"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
}


function DisputeModal({
  formData,
  milestone,
  error,
  fieldErrors,
  creating,
  onClose,
  onChange,
  onImageChange,
  onRemoveImage,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden bg-black/70 px-4 py-5 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="max-h-[82vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#151a22] p-4 shadow-2xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-red-300">
              Open Dispute
            </p>

            <h2 className="text-xl font-black text-white">
              Milestone dispute
            </h2>

            <p className="mt-1.5 text-sm leading-5 text-gray-400">
              Enter the required reason. Evidence can be added now or later.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-gray-400 transition hover:text-white disabled:opacity-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Milestone
          </p>
          <p className="mt-1 font-bold text-white">
            {milestone?.title || "Untitled Milestone"}
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Disputed amount:{" "}
            {formatMoney(getMilestoneDisputableAmount(milestone))}
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-3 py-2.5 text-xs leading-5 text-yellow-100">
          Fields marked <span className="font-black text-red-300">*</span> are required.
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <ModalTextArea
            label="Reason"
            value={formData.reason}
            disabled={creating}
            required
            error={fieldErrors?.reason}
            rows={3}
            placeholder="Explain why you disagree with the client decision..."
            onChange={(value) => onChange("reason", value)}
          />

          <ModalTextArea
            label="Evidence Description"
            value={formData.evidenceText}
            disabled={creating}
            rows={3}
            placeholder="Describe evidence, timeline, messages, or submitted work..."
            onChange={(value) => onChange("evidenceText", value)}
          />

          <ModalInput
            label="Evidence File URL"
            value={formData.evidenceFileUrl}
            disabled={creating}
            placeholder="https://drive.google.com/..."
            error={fieldErrors?.evidenceFileUrl}
            onChange={(value) => onChange("evidenceFileUrl", value)}
          />

          <div className="block">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                Upload Images
              </span>

              <span className="text-xs font-semibold text-gray-500">
                {formData.images.length}/10 selected
              </span>
            </div>

            <label
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-red-400/[0.05] px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400/10 ${
                fieldErrors?.images
                  ? "border-red-400/70"
                  : "border-red-400/30 hover:border-red-400/60"
              } ${creating ? "cursor-not-allowed opacity-60" : ""}`}
            >
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
                disabled={creating}
                onChange={onImageChange}
                className="hidden"
              />
            </label>

            <p className="mt-1.5 text-xs leading-5 text-gray-500">
              You can choose images multiple times. New images will be added to
              the current list. Maximum 10 images and 60 MB total.
            </p>

            {fieldErrors?.images && (
              <p className="mt-1.5 text-xs font-semibold text-red-300">
                {fieldErrors.images}
              </p>
            )}

            {formData.images.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.images.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-xs text-gray-300">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveImage(index)}
                      disabled={creating}
                      className="text-xs font-bold text-red-300 hover:text-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={creating}
            className="rounded-xl border border-red-400/50 bg-red-400/10 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "Opening..." : "Open Dispute"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ModalInput({ label, value, disabled, placeholder, error, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-gray-400">
        {label}
      </span>

      <input
        type="url"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-[#0f141d] px-3 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-gray-600 focus:bg-[#111823] disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? "border-red-400/70 focus:border-red-400" : "border-white/10 focus:border-red-400"
        }`}
      />

      {error && (
        <span className="mt-1.5 block text-xs font-semibold text-red-300">
          {error}
        </span>
      )}
    </label>
  );
}

function ModalTextArea({
  label,
  value,
  disabled,
  required,
  error,
  rows,
  placeholder,
  onChange,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-gray-400">
        {label} {required && <span className="text-red-300">*</span>}
      </span>

      <textarea
        rows={rows}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full resize-none rounded-xl border bg-[#0f141d] px-3 py-2.5 text-sm leading-5 text-white outline-none transition placeholder:text-gray-600 focus:bg-[#111823] disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? "border-red-400/70 focus:border-red-400" : "border-white/10 focus:border-red-400"
        }`}
      />

      {error && (
        <span className="mt-1.5 block text-xs font-semibold text-red-300">
          {error}
        </span>
      )}
    </label>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  loading,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151a22] p-5 shadow-2xl">
        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${danger ? "bg-red-400/10 text-red-300" : "bg-cyan-400/10 text-cyan-300"}`}>
          <span className="material-symbols-outlined">{danger ? "gavel" : "help"}</span>
        </div>
        <h3 className="text-xl font-black text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-gray-400">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-4 py-2.5 text-sm font-black transition disabled:opacity-50 ${danger ? "bg-red-400 text-black hover:bg-red-300" : "bg-cyan-400 text-black hover:bg-cyan-300"}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmissionSection({
  number,
  title,
  description,
  optional = false,
  children,
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#10151d] p-4 transition hover:border-white/15 md:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-xs font-black text-cyan-300">
          {number}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-extrabold text-white">{title}</h3>

            {optional && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Optional
              </span>
            )}
          </div>

          <p className="mt-1 text-sm leading-5 text-gray-500">
            {description}
          </p>
        </div>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SubmitWorkInput({
  label,
  required = false,
  value,
  disabled,
  error,
  helper,
  onChange,
  placeholder,
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
        {label}
        {required && <span className="text-red-300">*</span>}
      </span>

      <input
        type="url"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-[#0f141d] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-gray-600 focus:bg-[#111823] disabled:cursor-not-allowed disabled:opacity-60 ${
          error
            ? "border-red-400/70 focus:border-red-400"
            : "border-white/10 focus:border-cyan-400"
        }`}
      />

      {helper && !error && (
        <span className="mt-1.5 block text-xs leading-5 text-gray-500">
          {helper}
        </span>
      )}

      {error && (
        <span className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold leading-5 text-red-300">
          <span className="material-symbols-outlined mt-0.5 text-[15px]">
            error
          </span>
          {error}
        </span>
      )}
    </label>
  );
}

function SubmitWorkTextArea({
  label,
  required = false,
  value,
  disabled,
  error,
  helper,
  maxLength,
  onChange,
  placeholder,
  rows = 4,
}) {
  const currentLength = String(value || "").length;

  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
        {label}
        {required && <span className="text-red-300">*</span>}
      </span>

      <textarea
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`w-full resize-none rounded-xl border bg-[#0f141d] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-gray-600 focus:bg-[#111823] disabled:cursor-not-allowed disabled:opacity-60 ${
          error
            ? "border-red-400/70 focus:border-red-400"
            : "border-white/10 focus:border-cyan-400"
        }`}
      />

      <div className="mt-1.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {helper && !error && (
            <span className="block text-xs leading-5 text-gray-500">
              {helper}
            </span>
          )}

          {error && (
            <span className="flex items-start gap-1.5 text-xs font-semibold leading-5 text-red-300">
              <span className="material-symbols-outlined mt-0.5 text-[15px]">
                error
              </span>
              {error}
            </span>
          )}
        </div>

        {maxLength && (
          <span className="shrink-0 text-[11px] font-semibold text-gray-600">
            {currentLength}/{maxLength}
          </span>
        )}
      </div>
    </label>
  );
}

function SubmittedNotice({ submission, onOpen }) {
  const ui = getSubmissionUiStatus(submission?.status);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <FriendlyStatusBadge ui={ui} small />

          <h3 className="mt-3 text-base font-bold text-white">
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
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/40 hover:bg-white/[0.05]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FriendlyStatusBadge ui={ui} small />

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

          <div className="mt-3 flex flex-wrap gap-2">
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
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#151a22] shadow-[0_16px_45px_rgba(0,0,0,0.22)]">
      <div className="flex items-start gap-3 border-b border-white/10 bg-white/[0.018] px-5 py-4">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
            <span className="material-symbols-outlined text-lg text-cyan-300">
              {icon}
            </span>
          </div>
        )}

        <div>
          <h2 className="text-base font-extrabold text-white">{title}</h2>

          {subtitle && (
            <p className="mt-1 text-sm leading-5 text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function MarketplaceSidebar({
  milestone,
  project,
  milestoneUi,
  submissions,
  canSubmit,
  needsResubmission,
  activeDisputeId,
  onSubmitFocus,
  onViewDispute,
}) {
  const dueDate = milestone?.dueDate;
  const projectTitle =
    project?.title || project?.projectTitle || milestone?.projectTitle || "Current project";

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#151a22] shadow-[0_16px_45px_rgba(0,0,0,0.22)]">
        <div className="border-b border-white/10 bg-gradient-to-br from-cyan-400/[0.08] to-transparent p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Order summary</p>
          <h3 className="mt-2 line-clamp-2 text-base font-black text-white">{projectTitle}</h3>
          <div className="mt-4">
            <FriendlyStatusBadge ui={milestoneUi} small />
          </div>
        </div>

        <div className="divide-y divide-white/10">
          <SidebarRow icon="payments" label="Milestone value" value={formatMoney(getMilestoneAmount(milestone))} accent />
          <SidebarRow icon="calendar_month" label="Delivery due" value={formatDate(dueDate)} />
          <SidebarRow icon="history" label="Submissions" value={String(submissions.length)} />
        </div>

        <div className="p-4">
          {activeDisputeId ? (
            <button
              type="button"
              onClick={onViewDispute}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-400 hover:text-black"
            >
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              View Active Dispute
            </button>
          ) : canSubmit ? (
            <button
              type="button"
              onClick={onSubmitFocus}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
            >
              <span className="material-symbols-outlined text-[18px]">{needsResubmission ? "published_with_changes" : "upload"}</span>
              {needsResubmission ? "Update Delivery" : "Submit Delivery"}
            </button>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs leading-5 text-gray-400">
              Submission actions are unavailable for the current milestone status.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#151a22] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[19px] text-emerald-300">verified</span>
          <h3 className="text-sm font-black text-white">Delivery checklist</h3>
        </div>
        <div className="mt-4 space-y-3">
          <ChecklistItem text="Main link opens without requesting access" />
          <ChecklistItem text="Description matches the completed scope" />
          <ChecklistItem text="Demo and test steps are easy to follow" />
          <ChecklistItem text="No production passwords are included" />
        </div>
      </section>
    </>
  );
}

function SidebarRow({ icon, label, value, accent = false }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-400">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">{label}</p>
        <p className={`mt-1 truncate text-sm font-black ${accent ? "text-emerald-300" : "text-white"}`}>{value}</p>
      </div>
    </div>
  );
}

function ChecklistItem({ text }) {
  return (
    <div className="flex items-start gap-2.5 text-xs leading-5 text-gray-400">
      <span className="material-symbols-outlined mt-0.5 text-[16px] text-emerald-300">check_circle</span>
      <span>{text}</span>
    </div>
  );
}

function HeroInfo({ icon, label, value }) {
  return (
    <div className="p-3">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined text-lg">{icon}</span>
      </div>

      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">
        {formatInfoValue(value)}
      </p>
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
    <div className="mb-4 flex gap-3 last:mb-0">
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

        <p className="mt-1 text-sm leading-5 text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function FriendlyStatusBadge({ ui, small = false }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-bold ${ui.className} ${
        small ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-xs"
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
      className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
    >
      {label}
    </a>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-center">
      <span className="material-symbols-outlined mb-3 block text-3xl text-gray-500">
        {icon}
      </span>

      <h2 className="text-base font-bold text-white">{title}</h2>

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
    demoInstructions:
      submission?.demoInstructions ||
      submission?.raw?.demoInstructions ||
      "",
    testResultUrl:
      submission?.testResultUrl || submission?.raw?.testResultUrl || "",
    testSummary:
      submission?.testSummary || submission?.raw?.testSummary || "",
    description: submission?.description || submission?.raw?.description || "",
    handoverNotes:
      submission?.handoverNotes || submission?.raw?.handoverNotes || "",
  };
}

function buildDefaultDisputeReason(milestone) {
  const title = milestone?.title || "this milestone";
  return `I disagree with the client's rejection or revision request for ${title}.`;
}

function getDisputeId(dispute) {
  return (
    dispute?.disputeId ||
    dispute?.DisputeId ||
    dispute?.id ||
    dispute?.Id ||
    dispute?.raw?.disputeId ||
    dispute?.raw?.DisputeId ||
    dispute?.raw?.id ||
    dispute?.raw?.Id ||
    ""
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

function getProjectStatus(project, milestone) {
  return String(
    project?.status ||
      project?.Status ||
      project?.raw?.status ||
      project?.raw?.Status ||
      milestone?.projectStatus ||
      milestone?.ProjectStatus ||
      milestone?.raw?.projectStatus ||
      milestone?.raw?.ProjectStatus ||
      ""
  )
    .trim()
    .toUpperCase();
}

function isProjectCompletedStatus(status) {
  return ["COMPLETED", "DONE", "FINISHED", "CLOSED"].includes(
    String(status || "").trim().toUpperCase()
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
    const bySubmittedTime = compareDateDesc(
      a?.submittedAt || a?.createdAt,
      b?.submittedAt || b?.createdAt
    );

    if (bySubmittedTime !== 0) return bySubmittedTime;

    return Number(b?.versionNumber || 0) - Number(a?.versionNumber || 0);
  })[0];
}

function getMilestoneDisputableAmount(milestone) {
  return firstPositiveNumber(
    milestone?.lockedEscrowAmount,
    milestone?.escrowLockedAmount,
    milestone?.escrowAmount,
    milestone?.lockedAmount,
    milestone?.amount,
    milestone?.price,
    milestone?.budget,
    milestone?.raw?.lockedEscrowAmount,
    milestone?.raw?.escrowLockedAmount,
    milestone?.raw?.escrowAmount,
    milestone?.raw?.lockedAmount,
    milestone?.raw?.amount,
    milestone?.raw?.price,
    milestone?.raw?.budget
  );
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const number = Number(value);

    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }

  return 0;
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
    "CLIENT_REQUESTED_REVISION",
  ].includes(value);
}

function canOpenMilestoneDispute(milestoneStatus, latestSubmission) {
  return (
    isChangeRequested(milestoneStatus) ||
    isChangeRequested(latestSubmission?.status)
  );
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
  activeDisputeId,
}) {
  if (activeDisputeId) {
    return {
      label: "In Dispute",
      icon: "gavel",
      className: "border-red-400/30 bg-red-400/10 text-red-300",
    };
  }

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

function getExpertFeeRate(entity) {
  return firstPositiveNumber(
    entity?.expertFeeRate,
    entity?.ExpertFeeRate,
    entity?.contract?.expertFeeRate,
    entity?.Contract?.ExpertFeeRate,
    entity?.project?.expertFeeRate,
    entity?.Project?.ExpertFeeRate,
    entity?.raw?.expertFeeRate,
    entity?.raw?.ExpertFeeRate,
    0
  );
}

function getMilestoneAmount(milestone) {
  return firstPositiveNumber(
    milestone?.amount,
    milestone?.Amount,
    milestone?.lockedEscrowAmount,
    milestone?.escrowAmount,
    milestone?.raw?.amount,
    milestone?.raw?.Amount,
    0
  );
}

function getMilestoneServiceFee(milestone) {
  const direct = firstPositiveNumber(
    milestone?.expertFeeAmount,
    milestone?.ExpertFeeAmount,
    milestone?.expertServiceFeeAmount,
    milestone?.ExpertServiceFeeAmount,
    milestone?.raw?.expertFeeAmount,
    milestone?.raw?.ExpertFeeAmount,
    0
  );

  if (direct > 0) return direct;

  const rate = getExpertFeeRate(milestone);
  return rate > 0 ? (getMilestoneAmount(milestone) * rate) / 100 : 0;
}

function getMilestoneNetEarning(milestone) {
  const direct = firstPositiveNumber(
    milestone?.expertNetAmount,
    milestone?.ExpertNetAmount,
    milestone?.netAmount,
    milestone?.NetAmount,
    milestone?.expertReceivableAmount,
    milestone?.ExpertReceivableAmount,
    milestone?.raw?.expertNetAmount,
    milestone?.raw?.ExpertNetAmount,
    0
  );

  if (direct > 0) return direct;

  return Math.max(getMilestoneAmount(milestone) - getMilestoneServiceFee(milestone), 0);
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

  return (
    data?.message ||
    data?.title ||
    data?.detail ||
    err?.message ||
    fallback
  );
}