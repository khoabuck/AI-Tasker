import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService, {
  getFriendlyProposalError,
  mapProposalToForm,
} from "../../../services/proposal.service";
import { validateProposalForm } from "../../../utils/validateProposal";
import proposalCreditPackageService from "../../../services/proposalCreditPackage.service";
import expertWalletService from "../../../services/expertWallet.service";

import { formatDateTime } from "../../../utils/dateTime.utils";

// ===== Expert proposal drafts page: saved drafts, credit access, submit/delete =====
export default function MyProposalDraftsPage() {
  // ===== Routing =====
  const navigate = useNavigate();

  // ===== Drafts and credit data =====
  const [drafts, setDrafts] = useState([]);
  const [proposalCredits, setProposalCredits] = useState(null);
  const [creditPackages, setCreditPackages] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [submittingId, setSubmittingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [buyingPackageId, setBuyingPackageId] = useState("");

  const [selectedDraft, setSelectedDraft] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ===== Derived available submissions =====
  const submissionsLeft = useMemo(() => {
    return (
      getAvailableProposalCredits(proposalCredits) +
      getFreeSubmitRemaining(proposalCredits)
    );
  }, [proposalCredits]);

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    loadPage();
  }, []);

  // ===== API loading: drafts, credits, packages, and wallet balance =====
  const loadPage = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [draftResult, creditResult, packageResult, balanceResult] =
        await Promise.allSettled([
          proposalService.getMyDraftProposals(),
          proposalCreditPackageService.getMyProposalCredits(),
          proposalCreditPackageService.getAvailablePackages(),
          expertWalletService.getBalance(),
        ]);

      if (draftResult.status === "fulfilled") {
        setDrafts(Array.isArray(draftResult.value) ? draftResult.value : []);
      } else {
        throw draftResult.reason;
      }

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
      console.error("LOAD PROPOSAL DRAFTS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load proposal drafts."));
      setDrafts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ===== Draft actions =====
  const editDraft = (draft) => {
    const jobId = getDraftJobId(draft);

    if (!jobId) {
      setError("This draft is missing job information.");
      return;
    }

    navigate(`/expert/jobs/${jobId}/proposal?draftId=${draft.proposalId}`);
  };

  const executeDeleteDraft = async (draft) => {
    const proposalId = draft?.proposalId;

    if (!proposalId) {
      setError("Invalid draft.");
      return;
    }


    try {
      setDeletingId(String(proposalId));
      setError("");
      setMessage("");

      await proposalService.deleteDraftProposal(proposalId);

      setMessage("Draft deleted successfully.");
      await loadPage({ silent: true });
    } catch (err) {
      console.error("DELETE DRAFT ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot delete draft."));
    } finally {
      setDeletingId("");
    }
  };

  const executeSubmitDraft = async (draft) => {
    const proposalId = draft?.proposalId;

    if (!proposalId) {
      setError("Invalid draft.");
      return;
    }

    const draftForm = mapProposalToForm(draft);
    const validationErrors = validateProposalForm(draftForm, {
      checkMilestoneTotal: true,
      checkMilestoneDuration: true,
    });

    if (Object.keys(validationErrors).length > 0) {
      const jobId = getDraftJobId(draft);

      setError(
        "This draft is not ready to submit. Complete the highlighted fields, make the milestone total equal the proposed price, and keep the milestone duration within the proposed timeline."
      );

      if (jobId) {
        navigate(`/expert/jobs/${jobId}/proposal?draftId=${proposalId}`, {
          state: { reviewDraftBeforeSubmit: true },
        });
      }
      return;
    }

    const creditAccessKnown =
      proposalCredits !== null && proposalCredits !== undefined;

    if (
      creditAccessKnown &&
      (submissionsLeft <= 0 ||
        getCanSubmitNewProposal(proposalCredits) === false)
    ) {
      setSelectedDraft(draft);
      setShowUpgradeModal(true);
      return;
    }

    try {
      setSubmittingId(String(proposalId));
      setError("");
      setMessage("");

      const proposal = await proposalService.submitDraftProposal(proposalId);
      const submittedProposalId = proposal?.proposalId || proposal?.id || proposalId;

      setMessage("Draft submitted successfully.");
      await loadPage({ silent: true });

      setTimeout(() => {
        navigate(`/expert/proposals/${submittedProposalId}`, { replace: true });
      }, 600);
    } catch (err) {
      console.error("SUBMIT DRAFT ERROR:", err?.response?.data || err);

      const friendlyError = getFriendlyProposalError(
        err,
        "Cannot submit draft."
      );

      setError(friendlyError);

      if (isCreditError(friendlyError)) {
        await loadPage({ silent: true });
        setSelectedDraft(draft);
        setShowUpgradeModal(true);
      }
    } finally {
      setSubmittingId("");
    }
  };

  const requestDeleteDraft = (draft) => {
    setConfirmAction({
      type: "DELETE",
      draft,
      title: "Delete this draft?",
      message: `The saved proposal for "${draft?.jobTitle || "this job"}" will be permanently removed.`,
      confirmLabel: "Delete Draft",
      tone: "red",
    });
  };

  const requestSubmitDraft = (draft) => {
    setConfirmAction({
      type: "SUBMIT",
      draft,
      title: "Submit this draft?",
      message: `The proposal for "${draft?.jobTitle || "this job"}" will be sent to the client and one submission will be used.`,
      confirmLabel: "Submit",
      tone: "cyan",
    });
  };

  const handleConfirmAction = async () => {
    const action = confirmAction;
    setConfirmAction(null);

    if (action?.type === "DELETE") {
      await executeDeleteDraft(action.draft);
      return;
    }

    if (action?.type === "SUBMIT") {
      await executeSubmitDraft(action.draft);
    }
  };

  const buyPackage = async (pkg) => {
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
          returnTo: "/expert/proposal/drafts",
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
      await loadPage({ silent: true });

      setShowUpgradeModal(false);
      setMessage("Package purchased successfully. You can submit your draft now.");
    } catch (err) {
      console.error("BUY CREDIT PACKAGE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot buy this package."));
    } finally {
      setBuyingPackageId("");
    }
  };

  // ===== Main render =====
  if (loading) {
    return (
      <ExpertLayout>
        <PageSkeleton cards={4} />
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-7 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#00F0FF]">
                Saved proposals
              </p>

              <h1 className="text-3xl font-black text-white md:text-3xl">
                Your proposal drafts
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Continue editing private drafts, check available proposal
                credits, and submit only when the proposal is ready.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/expert/proposal-credit-packages")}
                className="rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Buy proposal credits
              </button>

              <button
                type="button"
                onClick={() => navigate("/expert/jobs")}
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-300"
              >
                Browse jobs
              </button>
            </div>
          </section>

          {message && <SuccessToast message={message} onClose={() => setMessage("")} />}
          {error && <Alert type="danger" message={error} />}

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard
              label="Drafts"
              value={formatNumber(drafts.length)}
              icon="draft"
            />

            <SummaryCard
              label="Proposal submissions left"
              value={formatNumber(submissionsLeft)}
              icon="workspace_premium"
            />

            <SummaryCard
              label="Available balance"
              value={formatMoney(walletBalance?.availableBalance || 0)}
              icon="account_balance_wallet"
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#151a22] shadow-[0_14px_42px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-white">Saved drafts</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {drafts.length} saved draft(s)
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadPage({ silent: true })}
                disabled={refreshing}
                className="text-xs font-black uppercase tracking-wider text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {drafts.length === 0 ? (
              <EmptyDrafts onBrowse={() => navigate("/expert/jobs")} />
            ) : (
              <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-2">
                {drafts.map((draft, index) => (
                  <DraftCard
                    key={draft.proposalId || index}
                    draft={draft}
                    submitting={String(submittingId) === String(draft.proposalId)}
                    deleting={String(deletingId) === String(draft.proposalId)}
                    onEdit={() => editDraft(draft)}
                    onSubmit={() => requestSubmitDraft(draft)}
                    onDelete={() => requestDeleteDraft(draft)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          tone={confirmAction.tone}
          busy={Boolean(submittingId || deletingId)}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
        />
      )}

      {showUpgradeModal && (
        <UpgradeDraftModal
          packages={creditPackages}
          walletBalance={walletBalance}
          buyingPackageId={buyingPackageId}
          onClose={() => setShowUpgradeModal(false)}
          onBuy={buyPackage}
          onGoWallet={(pkg) =>
            navigate("/expert/wallet", {
              state: {
                returnTo: "/expert/proposal/drafts",
                reason: "BUY_PROPOSAL_CREDITS",
                packageId: pkg?.packageId,
                depositAmount: Number(pkg?.price || 0),
                autoOpenDeposit: true,
              },
            })
          }
          draft={selectedDraft}
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
          <p className="text-sm font-black text-white">Updated</p>
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


// ===== Draft card with edit, submit, and delete actions =====
function DraftCard({
  draft,
  submitting,
  deleting,
  onEdit,
  onSubmit,
  onDelete,
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition hover:border-cyan-400/40 hover:bg-white/[0.05]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
            Draft
          </p>

          <h3 className="line-clamp-2 text-xl font-black text-white">
            {draft.jobTitle || "Untitled Job"}
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Updated {formatDate(draft.updatedAt || draft.createdAt)}
          </p>
        </div>

        <StatusBadge status={draft.status || "DRAFT"} />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Info label="Proposed price" value={formatMoney(draft.proposedPrice)} />
        <Info
          label="Timeline"
          value={
            draft.proposedTimelineDays
              ? `${draft.proposedTimelineDays} days`
              : "Not set"
          }
        />
      </div>

      <p className="mb-5 line-clamp-3 text-sm leading-6 text-gray-400">
        {draft.coverLetter || "No cover letter yet."}
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          Continue editing
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || deleting}
          className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit draft"}
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={submitting || deleting}
          className="rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete draft"}
        </button>
      </div>
    </article>
  );
}

// ===== Confirmation modal for draft submit/delete actions =====
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

// ===== Proposal credit upgrade modal for draft submission =====
function UpgradeDraftModal({
  packages,
  walletBalance,
  buyingPackageId,
  onClose,
  onBuy,
  onGoWallet,
  draft,
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
              Buy proposal credits to submit draft
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              You need proposal credits before submitting this draft
              {draft?.jobTitle ? ` for "${draft.jobTitle}"` : ""}.
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
            <p className="text-sm text-gray-400">Available balance</p>

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
                        Add Money
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onBuy(pkg)}
                        disabled={String(buyingPackageId) === String(pkg.packageId)}
                        className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {String(buyingPackageId) === String(pkg.packageId)
                          ? "Purchasing..."
                          : "Buy Now"}
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

// ===== Summary counter card =====
function SummaryCard({ label, value, icon }) {
  return (
    <article className="rounded-[1.4rem] border border-white/10 bg-[#151a22] p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}

// ===== Draft status badge =====
function StatusBadge({ status }) {
  const value = String(status || "DRAFT").toUpperCase();

  const style =
    value === "DRAFT"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : "border-green-400/20 bg-green-400/10 text-green-300";

  return (
    <span
      className={`rounded-lg border px-3 py-1 text-xs font-black uppercase tracking-wider ${style}`}
    >
      {formatStatus(value)}
    </span>
  );
}

function EmptyDrafts({ onBrowse }) {
  return (
    <div className="p-12 text-center">
      <span className="material-symbols-outlined mb-3 block text-6xl text-gray-600">
        draft
      </span>

      <h3 className="text-xl font-black text-white">No drafts yet</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
        Save a proposal as draft when you are not ready to submit it yet.
      </p>

      <button
        type="button"
        onClick={onBrowse}
        className="mt-6 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-300"
      >
        Browse jobs
      </button>
    </div>
  );
}

function Alert({ type, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm ${style}`}>
      {message}
    </div>
  );
}

function getDraftJobId(draft) {
  return (
    draft?.jobId ||
    draft?.jobPostingId ||
    draft?.raw?.jobId ||
    draft?.raw?.jobPostingId ||
    draft?.raw?.JobId ||
    draft?.raw?.JobPostingId ||
    ""
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
    return getAvailableProposalCredits(credits) + getFreeSubmitRemaining(credits) > 0;
  }

  return Boolean(value);
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

function getValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
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

function formatDate(value) {
  return formatDateTime(value, "N/A");
}

function formatStatus(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
