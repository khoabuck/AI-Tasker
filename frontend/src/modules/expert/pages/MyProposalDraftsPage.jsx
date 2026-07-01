import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService, {
    getFriendlyProposalError,
} from "../../../services/proposal.service";
import proposalCreditPackageService from "../../../services/proposalCreditPackage.service";
import expertWalletService from "../../../services/expertWallet.service";

export default function MyProposalDraftsPage() {
    const navigate = useNavigate();

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

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const submissionsLeft = useMemo(() => {
        return (
            getAvailableProposalCredits(proposalCredits) +
            getFreeSubmitRemaining(proposalCredits)
        );
    }, [proposalCredits]);

    useEffect(() => {
        loadPage();
    }, []);

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

    const editDraft = (draft) => {
        const jobId = getDraftJobId(draft);

        if (!jobId) {
            setError("This draft is missing job information.");
            return;
        }

        navigate(`/expert/jobs/${jobId}/proposal?draftId=${draft.proposalId}`);
    };

    const deleteDraft = async (draft) => {
        const proposalId = draft?.proposalId;

        if (!proposalId) {
            setError("Invalid draft.");
            return;
        }

        const confirmed = window.confirm(
            `Delete draft for "${draft.jobTitle || "this job"}"?`
        );

        if (!confirmed) return;

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

    const submitDraft = async (draft) => {
        const proposalId = draft?.proposalId;

        if (!proposalId) {
            setError("Invalid draft.");
            return;
        }

        if (submissionsLeft <= 0 || getCanSubmitNewProposal(proposalCredits) === false) {
            setSelectedDraft(draft);
            setShowUpgradeModal(true);
            return;
        }

        const confirmed = window.confirm(
            `Submit draft for "${draft.jobTitle || "this job"}"?`
        );

        if (!confirmed) return;

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
                    returnTo: "/expert/proposals/drafts",
                    reason: "BUY_PROPOSAL_CREDITS",
                    packageId,
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

    if (loading) {
        return (
            <ExpertLayout>
                <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
                    Loading proposal drafts...
                </div>
            </ExpertLayout>
        );
    }

    return (
        <ExpertLayout>
            <div className="px-5 py-10 md:px-8">
                <div className="mx-auto max-w-7xl">
                    <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-[#00F0FF]">
                                Proposal Drafts
                            </p>

                            <h1 className="text-3xl font-black text-white md:text-4xl">
                                My Draft Proposals
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                                Continue editing saved proposals, delete old drafts, or submit
                                them when ready.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => navigate("/expert/proposal-credit-packages")}
                                className="rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                            >
                                Buy Credits
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate("/expert/jobs")}
                                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-300"
                            >
                                Browse Jobs
                            </button>
                        </div>
                    </section>

                    {message && <Alert type="success" message={message} />}
                    {error && <Alert type="danger" message={error} />}

                    <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <SummaryCard
                            label="Drafts"
                            value={formatNumber(drafts.length)}
                            icon="draft"
                        />

                        <SummaryCard
                            label="Submissions Left"
                            value={formatNumber(submissionsLeft)}
                            icon="workspace_premium"
                        />
                    </section>

                    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#151a22] shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
                        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
                            <div>
                                <h2 className="text-xl font-black text-white">Draft List</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    {drafts.length} draft(s)
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
                                        onSubmit={() => submitDraft(draft)}
                                        onDelete={() => deleteDraft(draft)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>

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
                                returnTo: "/expert/proposals/drafts",
                                reason: "BUY_PROPOSAL_CREDITS",
                                packageId: pkg?.packageId,
                            },
                        })
                    }
                    draft={selectedDraft}
                />
            )}
        </ExpertLayout>
    );
}

function DraftCard({
    draft,
    submitting,
    deleting,
    onEdit,
    onSubmit,
    onDelete,
}) {
    return (
        <article className="rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-6 transition hover:border-cyan-400/40 hover:bg-white/[0.05]">
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
                <Info label="Proposed Price" value={formatMoney(draft.proposedPrice)} />
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
                    className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                    Continue Editing
                </button>

                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={submitting || deleting}
                    className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {submitting ? "Submitting..." : "Submit Draft"}
                </button>

                <button
                    type="button"
                    onClick={onDelete}
                    disabled={submitting || deleting}
                    className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {deleting ? "Deleting..." : "Delete"}
                </button>
            </div>
        </article>
    );
}

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
            <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[#111823] shadow-[0_35px_120px_rgba(0,0,0,0.78)]">
                <div className="flex items-start justify-between gap-5 border-b border-white/10 px-7 py-6">
                    <div>
                        <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                            Upgrade Required
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
                        <p className="text-sm text-gray-400">Wallet Balance</p>

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
                                        className={`relative overflow-hidden rounded-[1.5rem] border p-5 ${isPopular
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
                                                disabled={
                                                    String(buyingPackageId) === String(pkg.packageId)
                                                }
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
                Browse Jobs
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
            raw.availableProposalSubmitCredits,
            raw.AvailableProposalSubmitCredits,
            raw.remainingCredits,
            raw.RemainingCredits,
            raw.availableCredits,
            raw.AvailableCredits,
            raw.proposalCredits,
            raw.ProposalCredits,
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
    }).format(number);
}

function formatNumber(value) {
    return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

function formatDate(value) {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleDateString("vi-VN");
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