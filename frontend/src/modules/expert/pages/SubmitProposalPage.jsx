import { useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";
import proposalService, {
  getFriendlyProposalError,
  mapProposalToForm,
} from "../../../services/proposal.service";
import proposalCreditPackageService from "../../../services/proposalCreditPackage.service";
import expertWalletService from "../../../services/expertWallet.service";
import { validateProposalForm } from "../../../utils/validateProposal";

import { formatDateTime, isExpired } from "../../../utils/dateTime.utils";

// ===== Proposal form defaults =====
const createEmptyMilestone = () => ({
  title: "",
  amount: "",
  durationDays: "",
});

const createEmptyForm = () => ({
  coverLetter: "",
  proposedPrice: "",
  proposedTimelineDays: "",
  expectedOutputs: "",
  workingApproach: "",
  preliminaryMilestonePlan: "",
  milestones: [createEmptyMilestone()],
});

// ===== Expert submit proposal page: draft, proposal form, credits, and submit flow =====
export default function SubmitProposalPage() {
  // ===== Route and query params =====
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const draftId = searchParams.get("draftId") || "";

  // ===== Job and proposal form state =====
  const [job, setJob] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);

  // ===== Draft and credit state =====
  const [currentDraftId, setCurrentDraftId] = useState(draftId);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingDraft, setSubmittingDraft] = useState(false);

  const [proposalCredits, setProposalCredits] = useState(null);
  const [creditPackages, setCreditPackages] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [buyingPackageId, setBuyingPackageId] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ===== Derived validation, milestone totals, and credit access =====
  const formErrors = useMemo(() => validateProposalForm(formData), [formData]);

  const milestoneTotal = useMemo(() => {
    return formData.milestones.reduce((total, milestone) => {
      const amount = Number(milestone.amount || 0);
      return total + (Number.isNaN(amount) ? 0 : amount);
    }, 0);
  }, [formData.milestones]);

  const milestoneDuration = useMemo(() => {
    return formData.milestones.reduce((total, milestone) => {
      const durationDays = Number(milestone.durationDays || 0);
      return total + (Number.isNaN(durationDays) ? 0 : durationDays);
    }, 0);
  }, [formData.milestones]);

  const priceDifference = Number(formData.proposedPrice || 0) - milestoneTotal;

  const paidCredits = getAvailableProposalCredits(proposalCredits);
  const freeSubmitRemaining = getFreeSubmitRemaining(proposalCredits);
  const canSubmitNewProposal = getCanSubmitNewProposal(proposalCredits);

  const hasFreeSubmit = freeSubmitRemaining > 0;
  const hasProposalCredit = paidCredits > 0;
  const submissionsLeft = paidCredits + freeSubmitRemaining;

  const shouldRequireUpgrade =
    proposalCredits &&
    canSubmitNewProposal === false &&
    !hasFreeSubmit &&
    !hasProposalCredit;

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, draftId]);

  // ===== API loading: job detail, proposal access, and optional draft =====
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      await Promise.all([loadJobDetailOnly(), loadSubmitAccess()]);

      if (draftId) {
        await loadDraftDetail(draftId);
      } else {
        setCurrentDraftId("");
        setFormData(createEmptyForm());
      }
    } finally {
      setLoading(false);
    }
  };

  const loadJobDetailOnly = async () => {
    try {
      const response = await jobService.getJobById(jobId);
      const data = unwrapData(response);

      setJob(data);
    } catch (err) {
      console.error("LOAD JOB DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load job detail."));
      setJob(null);
    }
  };

  const loadSubmitAccess = async () => {
    try {
      setAccessLoading(true);

      const [creditResult, packageResult, balanceResult] =
        await Promise.allSettled([
          proposalCreditPackageService.getMyProposalCredits(),
          proposalCreditPackageService.getAvailablePackages(),
          expertWalletService.getBalance(),
        ]);

      if (creditResult.status === "fulfilled") {
        setProposalCredits(creditResult.value);
      }

      if (packageResult.status === "fulfilled") {
        setCreditPackages(
          Array.isArray(packageResult.value) ? packageResult.value : []
        );
      }

      if (balanceResult.status === "fulfilled") {
        setWalletBalance(balanceResult.value);
      }
    } catch (err) {
      console.error("LOAD SUBMIT ACCESS ERROR:", err?.response?.data || err);
    } finally {
      setAccessLoading(false);
    }
  };

  const loadDraftDetail = async (proposalId) => {
    try {
      const draft = await proposalService.getDraftProposalById(proposalId);

      if (!draft) {
        setError("Draft not found.");
        return;
      }

      setCurrentDraftId(draft.proposalId || proposalId);
      setFormData(mapProposalToForm(draft));
    } catch (err) {
      console.error("LOAD DRAFT DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load draft detail."));
    }
  };

  // ===== Proposal form update helpers =====
  const updateField = (name, value) => {
    setMessage("");
    setError("");

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateMilestone = (index, name, value) => {
    setMessage("");
    setError("");

    setFormData((prev) => {
      const nextMilestones = [...prev.milestones];

      nextMilestones[index] = {
        ...nextMilestones[index],
        [name]: value,
      };

      return {
        ...prev,
        milestones: nextMilestones,
      };
    });
  };

  const addMilestone = () => {
    setFormData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, createEmptyMilestone()],
    }));
  };

  const removeMilestone = (index) => {
    setFormData((prev) => {
      const nextMilestones = prev.milestones.filter((_, i) => i !== index);

      return {
        ...prev,
        milestones:
          nextMilestones.length > 0 ? nextMilestones : [createEmptyMilestone()],
      };
    });
  };

  const syncFromMilestones = () => {
    setMessage("");
    setError("");

    setFormData((prev) => ({
      ...prev,
      proposedPrice: String(milestoneTotal || ""),
      proposedTimelineDays: String(milestoneDuration || ""),
    }));
  };

  const markTouched = (name) => {
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const markMilestoneTouched = (index, name) => {
    markTouched(`milestones.${index}.${name}`);
  };

  const getFieldError = (name) => {
    if (!submitted && !touched[name]) return "";
    return formErrors[name] || "";
  };

  const getMilestoneFieldError = (index, name) => {
    const key = `milestones.${index}.${name}`;

    if (!submitted && !touched[key]) return "";

    return formErrors?.milestones?.[index]?.[name] || "";
  };

  // ===== Draft and submit actions =====
  const handleSaveDraft = async () => {
    setSubmitted(true);

    if (!jobId) {
      setError("Job information is missing. Please go back and choose a job.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const errors = validateProposalForm(formData, {
      checkMilestoneTotal: true,
      checkMilestoneDuration: true,
    });

    if (Object.keys(errors).length > 0) {
      setError(
        "Please complete the highlighted fields before saving. Drafts use the same proposal rules as final submissions."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSavingDraft(true);
      setError("");
      setMessage("");

      const draft = currentDraftId
        ? await proposalService.updateDraftProposal(
            currentDraftId,
            jobId,
            formData
          )
        : await proposalService.createDraftProposal(jobId, formData);

      const savedDraftId = draft?.proposalId || draft?.id || currentDraftId;

      if (savedDraftId) {
        setCurrentDraftId(savedDraftId);
        setSearchParams({ draftId: String(savedDraftId) });
      }

      setMessage("Draft saved successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("SAVE DRAFT ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot save draft."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSavingDraft(false);
    }
  };

  const ensureCanSubmitProposal = async () => {
    try {
      setAccessLoading(true);

      const latestCredits =
        await proposalCreditPackageService.getMyProposalCredits();

      setProposalCredits(latestCredits);

      const latestPaidCredits = getAvailableProposalCredits(latestCredits);
      const latestFreeSubmit = getFreeSubmitRemaining(latestCredits);
      const latestCanSubmit = getCanSubmitNewProposal(latestCredits);

      const canSubmit =
        latestCanSubmit !== false &&
        latestPaidCredits + latestFreeSubmit > 0;

      if (!canSubmit) {
        setShowUpgradeModal(true);
        setError(
          "You need proposal credits before submitting. Please buy a credit package to continue."
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return false;
      }

      return true;
    } catch (err) {
      console.error("CHECK PROPOSAL CREDIT ERROR:", err?.response?.data || err);

      setShowUpgradeModal(true);
      setError(
        getFriendlyError(
          err,
          "Cannot verify your proposal credits right now. Please try again."
        )
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    } finally {
      setAccessLoading(false);
    }
  };

  const executeSubmitDraft = async () => {
    setSubmitted(true);
    setMessage("");
    setError("");

    const errors = validateProposalForm(formData, {
      checkMilestoneTotal: true,
      checkMilestoneDuration: true,
    });

    if (Object.keys(errors).length > 0) {
      setError("Please check the highlighted fields before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    let draftIdToSubmit = currentDraftId;

    if (!draftIdToSubmit) {
      if (!jobId) {
        setError("Job information is missing. Please go back and choose a job.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      try {
        setSavingDraft(true);
        const savedDraft = await proposalService.createDraftProposal(jobId, formData);
        draftIdToSubmit = savedDraft?.proposalId || savedDraft?.id || "";

        if (!draftIdToSubmit) {
          throw new Error("Draft was saved but its id was not returned.");
        }

        setCurrentDraftId(draftIdToSubmit);
        setSearchParams({ draftId: String(draftIdToSubmit) });
      } catch (err) {
        console.error("SAVE DRAFT BEFORE SUBMIT ERROR:", err?.response?.data || err);
        setError(getFriendlyError(err, "Cannot save draft before submitting."));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      } finally {
        setSavingDraft(false);
      }
    }

    if (shouldRequireUpgrade) {
      setShowUpgradeModal(true);
      return;
    }

    if (!(await ensureCanSubmitProposal())) {
      return;
    }

    try {
      setSubmittingDraft(true);

      await proposalService.updateDraftProposal(draftIdToSubmit, jobId, formData);

      const proposal = await proposalService.submitDraftProposal(draftIdToSubmit);
      const proposalId = proposal?.proposalId || proposal?.id || draftIdToSubmit;

      setMessage("Draft submitted successfully.");
      await loadSubmitAccess();

      setTimeout(() => {
        navigate(`/expert/proposals/${proposalId}`, { replace: true });
      }, 700);
    } catch (err) {
      console.error("SUBMIT DRAFT ERROR:", err?.response?.data || err);

      const friendlyError = getFriendlyProposalError(
        err,
        "Cannot submit draft."
      );

      setError(friendlyError);

      if (isCreditError(friendlyError)) {
        await loadSubmitAccess();
        setShowUpgradeModal(true);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmittingDraft(false);
    }
  };

  const requestSubmitDraft = () => {
    setConfirmAction({
      type: "SUBMIT_DRAFT",
      title: "Submit this proposal draft?",
      message:
        "Your draft will be sent to the client and one proposal submission will be used. Please confirm that the price, timeline, and milestones are final.",
      confirmLabel: "Submit draft",
      tone: "cyan",
    });
  };

  const requestSubmitProposal = (event) => {
    event.preventDefault();
    setConfirmAction({
      type: "SUBMIT_PROPOSAL",
      title: "Submit this proposal?",
      message:
        "Your proposal will be sent to the client and one proposal submission will be used. Please review the price, timeline, and milestones before continuing.",
      confirmLabel: "Submit proposal",
      tone: "cyan",
    });
  };

  const requestCancel = () => {
    setConfirmAction({
      type: "CANCEL",
      title: "Leave this proposal?",
      message:
        "Any changes that have not been saved as a draft will be lost.",
      confirmLabel: "Leave page",
      tone: "red",
    });
  };

  const handleConfirmAction = async () => {
    const action = confirmAction?.type;
    setConfirmAction(null);

    if (action === "SUBMIT_DRAFT") {
      await executeSubmitDraft();
      return;
    }

    if (action === "SUBMIT_PROPOSAL") {
      await executeSubmitProposal();
      return;
    }

    if (action === "CANCEL") {
      navigate(`/expert/jobs/${jobId}`);
    }
  };

  const handleBuyCreditPackage = async (pkg) => {
    const packageId = pkg?.packageId;

    if (!packageId) {
      setError("Invalid package.");
      return;
    }

    const balance = Number(walletBalance?.availableBalance || 0);
    const price = Number(pkg.price || 0);

    if (price > balance) {
      navigate("/expert/wallet", {
        state: {
          returnTo: window.location.pathname + window.location.search,
          reason: "BUY_PROPOSAL_CREDITS",
          packageId,
          depositAmount: price,
          autoOpenDeposit: true,
        },
      });

      return;
    }

    try {
      setBuyingPackageId(String(packageId));
      setError("");
      setMessage("");

      await proposalCreditPackageService.purchasePackage(packageId);
      await loadSubmitAccess();

      setShowUpgradeModal(false);
      setMessage("Package purchased successfully. You can submit now.");

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(
        "BUY PROPOSAL CREDIT PACKAGE ERROR:",
        err?.response?.data || err
      );

      const friendlyError = getFriendlyError(err, "Cannot buy this package.");
      setError(friendlyError);

      if (isWalletError(friendlyError)) {
        navigate("/expert/wallet", {
          state: {
            returnTo: window.location.pathname + window.location.search,
            reason: "BUY_PROPOSAL_CREDITS",
            packageId,
            depositAmount: Number(pkg.price || 0),
            autoOpenDeposit: true,
          },
        });
      }
    } finally {
      setBuyingPackageId("");
    }
  };

  const executeSubmitProposal = async () => {

    setSubmitted(true);
    setMessage("");
    setError("");

    const errors = validateProposalForm(formData, {
      checkMilestoneTotal: true,
      checkMilestoneDuration: true,
    });

    if (Object.keys(errors).length > 0) {
      setError("Please check the highlighted fields before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!jobId) {
      setError("Job information is missing. Please go back and choose a job.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (shouldRequireUpgrade) {
      setShowUpgradeModal(true);
      return;
    }

    if (!(await ensureCanSubmitProposal())) {
      return;
    }

    try {
      setSubmitting(true);

      const proposal = await proposalService.submitProposal(jobId, formData);
      const proposalId = proposal?.proposalId || proposal?.id;

      setMessage("Proposal submitted successfully.");
      await loadSubmitAccess();

      setTimeout(() => {
        if (proposalId) {
          navigate(`/expert/proposals/${proposalId}`, { replace: true });
          return;
        }

        navigate("/expert/proposals", { replace: true });
      }, 700);
    } catch (err) {
      console.error("SUBMIT PROPOSAL ERROR:", err?.response?.data || err);

      const friendlyError = getFriendlyProposalError
        ? getFriendlyProposalError(err, "Cannot submit proposal.")
        : getFriendlyError(err, "Cannot submit proposal.");

      setError(friendlyError);

      if (isCreditError(friendlyError)) {
        await loadSubmitAccess();
        setShowUpgradeModal(true);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  const isJobOpen = String(getJobStatus(job) || "").toUpperCase() === "OPEN";

  // ===== Main render =====
  if (loading) {
    return (
      <ExpertLayout>
        <PageSkeleton cards={5} />
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-7 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate(`/expert/jobs/${jobId}`)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to job detail
          </button>

          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#00F0FF]">
              {currentDraftId ? "Edit proposal draft" : "Submit proposal"}
            </p>

            <h1 className="text-3xl font-bold text-white md:text-3xl">
              {currentDraftId
                ? "Continue your draft"
                : "Send a professional proposal"}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              {currentDraftId
                ? "Update your saved draft, review pricing and milestones, then submit it when it is ready."
                : "Present your fit, delivery approach, price, timeline, and milestone plan clearly for the client."}
            </p>
          </div>

          {error && (
            <Alert type="danger" title="Please review your proposal" message={error} />
          )}

          {message && <SuccessToast message={message} onClose={() => setMessage("")} />}

          {!job && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-10 text-center">
              <p className="text-gray-400">Job not found.</p>

              <button
                type="button"
                onClick={() => navigate("/expert/jobs")}
                className="mt-5 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Back to jobs
              </button>
            </div>
          )}

          {job && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              <form onSubmit={requestSubmitProposal} className="space-y-6">
                {!isJobOpen && (
                  <Alert
                    type="warning"
                    title="Job is not open"
                    message="This job is not open for proposals right now."
                  />
                )}

                {currentDraftId && (
                  <section className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-cyan-200">
                          Editing saved draft
                        </p>

                        <p className="mt-1 text-sm leading-6 text-cyan-100/80">
                          Saving keeps this proposal private until you submit it.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate("/expert/proposal/drafts")}
                        className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                      >
                        My drafts
                      </button>
                    </div>
                  </section>
                )}

                {shouldRequireUpgrade && (
                  <section className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-yellow-200">
                          You need proposal credits to submit.
                        </p>

                        <p className="mt-1 text-sm leading-6 text-yellow-100/80">
                          Your free submission has been used. Buy credits to
                          continue applying for jobs.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowUpgradeModal(true)}
                        className="rounded-xl bg-yellow-300 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-200"
                      >
                        Get proposal credits
                      </button>
                    </div>
                  </section>
                )}

                <Card title="Client-facing cover letter" icon="description">
                  <TextArea
                    label="Cover letter"
                    required
                    value={formData.coverLetter}
                    onChange={(value) => updateField("coverLetter", value)}
                    onBlur={() => markTouched("coverLetter")}
                    error={getFieldError("coverLetter")}
                    placeholder="Introduce yourself and explain why you are suitable for this job..."
                    rows={6}
                  />
                </Card>

                <Card title="Price and timeline" icon="payments">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <NumberInput
                      label="Proposed price (VND)"
                      required
                      min="0"
                      value={formData.proposedPrice}
                      onChange={(value) => updateField("proposedPrice", value)}
                      onBlur={() => markTouched("proposedPrice")}
                      error={getFieldError("proposedPrice")}
                      placeholder="500000"
                    />

                    <NumberInput
                      label="Timeline (days)"
                      required
                      min="1"
                      value={formData.proposedTimelineDays}
                      onChange={(value) =>
                        updateField("proposedTimelineDays", value)
                      }
                      onBlur={() => markTouched("proposedTimelineDays")}
                      error={getFieldError("proposedTimelineDays")}
                      placeholder="14"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={syncFromMilestones}
                    className="mt-5 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                  >
                    Use milestone totals
                  </button>
                </Card>

                <Card title="Delivery plan" icon="task_alt">
                  <div className="space-y-5">
                    <TextArea
                      label="Deliverables"
                      required
                      value={formData.expectedOutputs}
                      onChange={(value) =>
                        updateField("expectedOutputs", value)
                      }
                      onBlur={() => markTouched("expectedOutputs")}
                      error={getFieldError("expectedOutputs")}
                      placeholder="List the final outputs you will deliver to the client..."
                      rows={5}
                    />

                    <TextArea
                      label="Working approach"
                      required
                      value={formData.workingApproach}
                      onChange={(value) =>
                        updateField("workingApproach", value)
                      }
                      onBlur={() => markTouched("workingApproach")}
                      error={getFieldError("workingApproach")}
                      placeholder="Explain your working method, communication plan, and implementation steps..."
                      rows={5}
                    />

                    <TextArea
                      label="Milestone overview"
                      value={formData.preliminaryMilestonePlan}
                      onChange={(value) =>
                        updateField("preliminaryMilestonePlan", value)
                      }
                      onBlur={() => markTouched("preliminaryMilestonePlan")}
                      error={getFieldError("preliminaryMilestonePlan")}
                      placeholder="Example: Milestone 1: analysis, Milestone 2: implementation, Milestone 3: testing..."
                      rows={4}
                    />
                  </div>
                </Card>

                <Card title="Milestones" icon="flag">
                  <div className="mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                    <p className="text-sm font-bold text-cyan-300">
                      Milestone breakdown
                    </p>

                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      Add a clear title, payment amount, and estimated duration
                      for each milestone.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {formData.milestones.map((milestone, index) => (
                      <MilestoneEditor
                        key={index}
                        index={index}
                        milestone={milestone}
                        canRemove={formData.milestones.length > 1}
                        onChange={updateMilestone}
                        onBlur={markMilestoneTouched}
                        onRemove={removeMilestone}
                        getError={getMilestoneFieldError}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={addMilestone}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        add
                      </span>
                      Add milestone
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Info
                      label="Proposed price"
                      value={formatMoney(formData.proposedPrice)}
                    />

                    <Info
                      label="Milestone total"
                      value={formatMoney(milestoneTotal)}
                    />

                    <Info
                      label="Difference"
                      value={formatMoney(priceDifference)}
                      tone={
                        Math.abs(priceDifference) < 0.01
                          ? "green"
                          : priceDifference > 0
                          ? "warning"
                          : "danger"
                      }
                    />
                  </div>
                </Card>

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={requestCancel}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={savingDraft || submitting || submittingDraft}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingDraft
                      ? "Saving..."
                      : currentDraftId
                      ? "Update Draft"
                      : "Save Draft"}
                  </button>

                  {currentDraftId ? (
                    <button
                      type="button"
                      onClick={requestSubmitDraft}
                      disabled={
                        submittingDraft ||
                        submitting ||
                        savingDraft ||
                        !isJobOpen ||
                        accessLoading
                      }
                      className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingDraft
                        ? "Submitting..."
                        : accessLoading
                        ? "Checking..."
                        : "Submit draft"}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        submittingDraft ||
                        savingDraft ||
                        !isJobOpen ||
                        accessLoading
                      }
                      className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting
                        ? "Submitting..."
                        : accessLoading
                        ? "Checking..."
                        : "Submit proposal"}
                    </button>
                  )}
                </div>
              </form>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#00F0FF]">
                    Proposal Access
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    <Info
                      label="Submissions left"
                      value={`${submissionsLeft || 0}`}
                      tone={submissionsLeft > 0 ? "green" : "warning"}
                    />
                    <Info
                      label="Free Submit"
                      value={
                        freeSubmitRemaining > 0
                          ? `${freeSubmitRemaining} left`
                          : "Used"
                      }
                    />
                  </div>

                  {submissionsLeft <= 0 && (
                    <button
                      type="button"
                      onClick={() => setShowUpgradeModal(true)}
                      className="mt-5 w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-300"
                    >
                      Buy proposal credits
                    </button>
                  )}
                </section>

                <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#00F0FF]">
                    Job Summary
                  </p>

                  <h2 className="text-xl font-bold text-white">
                    {getJobTitle(job)}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-gray-400">
                    {getJobDescription(job)}
                  </p>

                  <div className="mt-5 space-y-3">
                    <Info label="Client" value={getClientName(job)} />

                    <Info
                      label="Budget"
                      value={formatBudget(
                        getValue(job?.budgetMin, job?.BudgetMin),
                        getValue(job?.budgetMax, job?.BudgetMax)
                      )}
                    />

                    <Info
                      label="Application Deadline"
                      value={formatDeadline(getJobDeadline(job))}
                    />

                    <Info label="Status" value={getJobStatus(job) || "OPEN"} />
                  </div>
                </section>

                <section className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5 text-yellow-200">
                  <p className="font-bold">Before submitting</p>

                  <p className="mt-2 text-sm leading-6">
                    Make sure your milestone total matches your proposed price
                    and your timeline is realistic.
                  </p>
                </section>
              </aside>
            </div>
          )}
        </div>
      </div>

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          tone={confirmAction.tone}
          busy={submitting || submittingDraft}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
        />
      )}

      {showUpgradeModal && (
        <UpgradeProposalModal
          packages={creditPackages}
          walletBalance={walletBalance}
          buyingPackageId={buyingPackageId}
          onBuy={handleBuyCreditPackage}
          onClose={() => setShowUpgradeModal(false)}
          onGoWallet={(pkg) =>
            navigate("/expert/wallet", {
              state: {
                returnTo: window.location.pathname + window.location.search,
                reason: "BUY_PROPOSAL_CREDITS",
                packageId: pkg?.packageId,
                depositAmount: Number(pkg?.price || 0),
                autoOpenDeposit: true,
              },
            })
          }
        />
      )}
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



function SuccessToast({ message, onClose }) {
  return (
    <div className="fixed right-4 top-4 z-[1300] w-[min(92vw,390px)]">
      <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-[#111a16] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)]">
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


// ===== Confirmation modal for cancel/submit/buy actions =====
function ConfirmModal({
  title,
  message,
  confirmLabel,
  tone = "cyan",
  busy,
  onCancel,
  onConfirm,
}) {
  const confirmClass =
    tone === "red"
      ? "border-red-400/50 bg-red-400/10 text-red-300 hover:bg-red-400 hover:text-black"
      : "border-cyan-400/50 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-black";

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151a22] p-5 shadow-2xl">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <span className="material-symbols-outlined text-cyan-300">help</span>
        </div>

        <h2 className="text-xl font-black text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-xl border px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
          >
            {busy ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Proposal credit upgrade modal =====
function UpgradeProposalModal({
  packages,
  walletBalance,
  buyingPackageId,
  onBuy,
  onClose,
  onGoWallet,
}) {
  const activePackages = packages.filter((item) => item.isActive).slice(0, 4);
  const balance = Number(walletBalance?.availableBalance || 0);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#111823] shadow-[0_35px_120px_rgba(0,0,0,0.78)]">
        <div className="flex items-start justify-between gap-5 border-b border-white/10 px-7 py-6">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
              Credits required
            </p>

            <h2 className="text-2xl font-black text-white">
              Buy proposal credits to continue
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              Your free proposal submission has been used. Choose a package
              below to submit more proposals.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-white/[0.05] hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-7 py-6">
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-gray-400">Available wallet balance</p>

            <p className="mt-1 text-3xl font-black text-cyan-300">
              {formatMoney(balance)}
            </p>
          </div>

          {activePackages.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <p className="font-bold text-white">No packages available</p>

              <p className="mt-2 text-sm text-gray-400">
                Proposal credit packages are not available right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {activePackages.map((pkg, index) => {
                const notEnoughBalance = Number(pkg.price || 0) > balance;
                const isPopular = index === 1 || pkg.isPopular || pkg.popular;

                return (
                  <article
                    key={pkg.packageId || index}
                    className={`relative overflow-hidden rounded-[1.5rem] border p-5 ${
                      isPopular
                        ? "border-cyan-400/50 bg-cyan-400/10"
                        : "border-white/10 bg-white/[0.035]"
                    }`}
                  >
                    {isPopular && (
                      <span className="mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-300">
                        Popular
                      </span>
                    )}

                    <h3 className="text-lg font-black text-white">
                      {pkg.packageName}
                    </h3>

                    <p className="mt-2 min-h-[44px] text-sm leading-6 text-gray-400">
                      {pkg.description ||
                        "Add more proposal submissions to your account."}
                    </p>

                    <div className="my-5 rounded-2xl border border-white/10 bg-[#0f141d] p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Includes
                      </p>

                      <p className="mt-1 text-3xl font-black text-cyan-300">
                        {formatNumber(pkg.proposalCredits)}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        proposal submissions
                      </p>
                    </div>

                    <p className="mb-5 text-2xl font-black text-white">
                      {formatMoney(pkg.price)}
                    </p>

                    {notEnoughBalance ? (
                      <button
                        type="button"
                        onClick={() => onGoWallet(pkg)}
                        className="w-full rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
                      >
                        Deposit wallet
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onBuy(pkg)}
                        disabled={
                          String(buyingPackageId) === String(pkg.packageId)
                        }
                        className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {String(buyingPackageId) === String(pkg.packageId)
                          ? "Purchasing..."
                          : "Buy package"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Shared proposal form card =====
function Card({ title, icon, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)] md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
          <span className="material-symbols-outlined text-xl text-[#00F0FF]">
            {icon}
          </span>
        </div>

        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>

      {children}
    </section>
  );
}

// ===== Milestone editor row =====
function MilestoneEditor({
  index,
  milestone,
  canRemove,
  onChange,
  onBlur,
  onRemove,
  getError,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-white">
            Milestone {index + 1}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Define title, payment amount, and estimated duration.
          </p>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_180px_180px]">
        <TextInput
          label="Milestone title"
          required
          value={milestone.title}
          onChange={(value) => onChange(index, "title", value)}
          onBlur={() => onBlur(index, "title")}
          error={getError(index, "title")}
          placeholder="Milestone title"
        />

        <NumberInput
          label="Amount (VND)"
          required
          min="0"
          value={milestone.amount}
          onChange={(value) => onChange(index, "amount", value)}
          onBlur={() => onBlur(index, "amount")}
          error={getError(index, "amount")}
          placeholder="200000"
        />

        <NumberInput
          label="Duration (days)"
          required
          min="1"
          value={milestone.durationDays}
          onChange={(value) => onChange(index, "durationDays", value)}
          onBlur={() => onBlur(index, "durationDays")}
          error={getError(index, "durationDays")}
          placeholder="7"
        />
      </div>
    </div>
  );
}

// ===== Shared text input for proposal and milestone fields =====
function TextInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  error,
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`min-h-[52px] w-full rounded-xl border bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:ring-2 focus:ring-cyan-400/15 ${
          error ? "border-red-400/60" : "border-white/10"
        }`}
      />

      <FieldError message={error} />
    </div>
  );
}

// ===== Shared textarea for long proposal content =====
function TextArea({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  error,
  rows = 4,
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        rows={rows}
        placeholder={placeholder}
        className={`min-h-[132px] w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-4 text-sm leading-6 text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:ring-2 focus:ring-cyan-400/15 ${
          error ? "border-red-400/60" : "border-white/10"
        }`}
      />

      <FieldError message={error} />
    </div>
  );
}

// ===== Shared numeric input for price, timeline, and milestone values =====
function NumberInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  error,
  min = "0",
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <input
        type="number"
        min={min}
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`min-h-[52px] w-full rounded-xl border bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:ring-2 focus:ring-cyan-400/15 ${
          error ? "border-red-400/60" : "border-white/10"
        }`}
      />

      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;

  return <p className="mt-2 text-xs font-semibold text-red-300">{message}</p>;
}

function Info({ label, value, tone = "default" }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : tone === "warning"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-200"
      : tone === "danger"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-white/10 bg-white/[0.03] text-white";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function Alert({ type, title, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : type === "warning"
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 text-sm ${style}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function getCreditRaw(credits) {
  return credits?.raw || credits?.Raw || credits || {};
}

function getAvailableProposalCredits(credits) {
  if (typeof credits === "number") return credits;

  const raw = getCreditRaw(credits);

  return toNumber(
    getValue(
      credits?.availableProposalSubmitCredits,
      credits?.AvailableProposalSubmitCredits,
      credits?.remainingCredits,
      credits?.RemainingCredits,
      credits?.availableCredits,
      credits?.AvailableCredits,
      credits?.proposalCredits,
      credits?.ProposalCredits,
      credits?.credits,
      credits?.Credits,
      credits?.balance,
      credits?.Balance,
      raw.availableProposalSubmitCredits,
      raw.AvailableProposalSubmitCredits,
      raw.remainingCredits,
      raw.RemainingCredits,
      raw.availableCredits,
      raw.AvailableCredits,
      raw.proposalCredits,
      raw.ProposalCredits,
      raw.credits,
      raw.Credits,
      raw.balance,
      raw.Balance,
      0
    ),
    0
  );
}

function getFreeSubmitRemaining(credits) {
  if (!credits || typeof credits === "number") return 0;

  const raw = getCreditRaw(credits);

  return toNumber(
    getValue(
      credits?.freeSubmitRemaining,
      credits?.FreeSubmitRemaining,
      credits?.freeSubmitsRemaining,
      credits?.FreeSubmitsRemaining,
      raw.freeSubmitRemaining,
      raw.FreeSubmitRemaining,
      raw.freeSubmitsRemaining,
      raw.FreeSubmitsRemaining,
      0
    ),
    0
  );
}

function getCanSubmitNewProposal(credits) {
  if (!credits) return true;

  const raw = getCreditRaw(credits);

  const value = getValue(
    credits?.canSubmitNewProposal,
    credits?.CanSubmitNewProposal,
    raw.canSubmitNewProposal,
    raw.CanSubmitNewProposal,
    undefined
  );

  if (value === undefined) {
    return (
      getAvailableProposalCredits(credits) + getFreeSubmitRemaining(credits) >
      0
    );
  }

  return Boolean(value);
}

function formatBudget(min, max) {
  const minValue = Number(min || 0);
  const maxValue = Number(max || 0);

  if (minValue && maxValue) {
    return `${formatMoney(minValue)} - ${formatMoney(maxValue)}`;
  }

  if (minValue) return `From ${formatMoney(minValue)}`;
  if (maxValue) return `Up to ${formatMoney(maxValue)}`;

  return "Budget not set";
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

function unwrapData(response) {
  if (!response) return response;
  if (response.data?.data) return response.data.data;
  if (response.data) return response.data;
  return response;
}

function getValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
}

function getJobTitle(job) {
  return getValue(job?.title, job?.Title, job?.projectTitle, "Untitled Job");
}

function getJobDescription(job) {
  return getValue(
    job?.description,
    job?.Description,
    job?.projectDescription,
    "No description."
  );
}

function getClientName(job) {
  return getValue(
    job?.clientName,
    job?.ClientName,
    job?.client?.fullName,
    job?.Client?.FullName,
    "Client"
  );
}

function getJobStatus(job) {
  return getValue(job?.status, job?.Status, "OPEN");
}

function getJobDeadline(job) {
  return getValue(
    job?.deadline,
    job?.Deadline,
    job?.applicationDeadline,
    job?.ApplicationDeadline,
    job?.proposalDeadline,
    job?.ProposalDeadline,
    job?.expiredAt,
    job?.ExpiredAt,
    job?.expiresAt,
    job?.ExpiresAt,
    job?.endDate,
    job?.EndDate,
    job?.raw?.deadline,
    job?.raw?.Deadline,
    job?.raw?.applicationDeadline,
    job?.raw?.ApplicationDeadline,
    job?.raw?.proposalDeadline,
    job?.raw?.ProposalDeadline,
    job?.raw?.expiredAt,
    job?.raw?.ExpiredAt,
    job?.raw?.expiresAt,
    job?.raw?.ExpiresAt,
    ""
  );
}

function formatDeadline(value) {
  return formatDateTime(value, "Flexible");
}

function isWalletError(message) {
  const value = String(message || "").toLowerCase();

  return (
    value.includes("balance") ||
    value.includes("wallet") ||
    value.includes("insufficient") ||
    value.includes("not enough")
  );
}

function isCreditError(message) {
  const value = String(message || "").toLowerCase();

  return (
    value.includes("credit") ||
    value.includes("free submit") ||
    value.includes("proposal package") ||
    value.includes("purchase package") ||
    value.includes("not enough proposal") ||
    value.includes("insufficient proposal")
  );
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  if (data?.message) return data.message;
  if (data?.title) return data.title;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || fallback;
}