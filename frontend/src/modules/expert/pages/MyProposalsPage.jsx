import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService from "../../../services/proposal.service";

export default function MyProposalsPage() {
    const navigate = useNavigate();

    const [proposals, setProposals] = useState([]);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [searchText, setSearchText] = useState("");

    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadMyProposals();
    }, []);

    const loadMyProposals = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await proposalService.getMyProposals();
            setProposals(data);
        } catch (err) {
            console.error(err);
            setError("Cannot load your proposals. Please check backend API.");
            setProposals([]);
        } finally {
            setLoading(false);
        }
    };

    const getProposalId = (proposal) => {
        return proposal.id || proposal.proposalId || proposal.proposalID;
    };

    const getJobId = (proposal) => {
        return (
            proposal.jobId ||
            proposal.job?.id ||
            proposal.job?.jobId ||
            proposal.projectId
        );
    };

    const getJobTitle = (proposal) => {
        return (
            proposal.jobTitle ||
            proposal.job?.title ||
            proposal.job?.jobTitle ||
            proposal.title ||
            "Untitled Job"
        );
    };

    const getCoverLetter = (proposal) => {
        return proposal.coverLetter || proposal.message || proposal.description || "";
    };

    const getWorkPlan = (proposal) => {
        return proposal.workPlan || proposal.plan || "";
    };

    const getBudget = (proposal) => {
        return (
            proposal.proposedBudget ||
            proposal.budget ||
            proposal.price ||
            proposal.amount ||
            0
        );
    };

    const getDuration = (proposal) => {
        return (
            proposal.estimatedDurationDays ||
            proposal.durationDays ||
            proposal.estimateDays ||
            0
        );
    };

    const getStatus = (proposal) => {
        return proposal.status || "PENDING";
    };

    const getCreatedAt = (proposal) => {
        return proposal.createdAt || proposal.submittedAt || proposal.createdDate;
    };

    const formatDate = (value) => {
        if (!value) return "No date";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "No date";

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    };

    const getStatusClass = (status) => {
        const value = String(status).toUpperCase();

        if (value === "ACCEPTED" || value === "APPROVED") {
            return "border-green-400/30 bg-green-400/10 text-green-300";
        }

        if (value === "REJECTED" || value === "DECLINED") {
            return "border-red-400/30 bg-red-400/10 text-red-300";
        }

        if (value === "WITHDRAWN" || value === "CANCELLED") {
            return "border-gray-400/30 bg-gray-400/10 text-gray-300";
        }

        return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
    };

    const filteredProposals = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();

        return proposals.filter((proposal) => {
            const status = String(getStatus(proposal)).toUpperCase();
            const title = getJobTitle(proposal).toLowerCase();
            const coverLetter = getCoverLetter(proposal).toLowerCase();

            const matchStatus =
                statusFilter === "ALL" || status === statusFilter.toUpperCase();

            const matchSearch =
                !keyword ||
                title.includes(keyword) ||
                coverLetter.includes(keyword);

            return matchStatus && matchSearch;
        });
    }, [proposals, statusFilter, searchText]);

    const handleWithdraw = async (proposalId) => {
        const confirmWithdraw = window.confirm(
            "Are you sure you want to withdraw this proposal?"
        );

        if (!confirmWithdraw) return;

        try {
            setActionLoadingId(proposalId);
            setError("");
            setMessage("");

            await proposalService.withdrawProposal(proposalId);

            setMessage("Proposal withdrawn successfully.");
            await loadMyProposals();
        } catch (err) {
            console.error(err);
            setError("Cannot withdraw proposal. Please check backend API.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const cardStyle =
        "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

    return (
        <ExpertLayout>
            <div className="px-5 py-10 md:px-8">
                <div className="mx-auto max-w-7xl">
                    {/* Header */}
                    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                                Expert Proposals
                            </p>

                            <h1 className="text-3xl font-bold text-white md:text-4xl">
                                My proposals
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                                Track proposals you submitted to clients and follow their
                                status.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={loadMyProposals}
                            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                        >
                            Refresh
                        </button>
                    </div>

                    {/* Filter */}
                    <div className={`${cardStyle} mb-6 p-6`}>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px_160px]">
                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                                    Search Proposal
                                </label>

                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                                        search
                                    </span>

                                    <input
                                        type="text"
                                        value={searchText}
                                        onChange={(event) => setSearchText(event.target.value)}
                                        placeholder="Search by job title or cover letter..."
                                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                                    Status
                                </label>

                                <select
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                                >
                                    <option value="ALL">All</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="ACCEPTED">Accepted</option>
                                    <option value="REJECTED">Rejected</option>
                                    <option value="WITHDRAWN">Withdrawn</option>
                                </select>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                                <p className="text-xs uppercase tracking-wider text-gray-500">
                                    Total
                                </p>
                                <p className="mt-1 text-2xl font-bold text-white">
                                    {filteredProposals.length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Message */}
                    {message && (
                        <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-300">
                            {message}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className={`${cardStyle} p-12 text-center text-gray-400`}>
                            <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                                hourglass_empty
                            </span>
                            Loading proposals...
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && filteredProposals.length === 0 && (
                        <div className={`${cardStyle} p-12 text-center`}>
                            <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                                description
                            </span>

                            <h2 className="text-xl font-bold text-white">
                                No proposals found
                            </h2>

                            <p className="mt-2 text-sm text-gray-400">
                                Browse jobs and send your first proposal.
                            </p>

                            <button
                                type="button"
                                onClick={() => navigate("/expert/jobs")}
                                className="mt-6 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                            >
                                Browse Jobs
                            </button>
                        </div>
                    )}

                    {/* Proposal list */}
                    {!loading && filteredProposals.length > 0 && (
                        <div className="grid grid-cols-1 gap-5">
                            {filteredProposals.map((proposal) => {
                                const proposalId = getProposalId(proposal);
                                const jobId = getJobId(proposal);
                                const status = getStatus(proposal);

                                return (
                                    <article
                                        key={proposalId}
                                        className={`${cardStyle} p-6 transition hover:border-cyan-400/40 hover:shadow-[0_0_35px_rgba(0,240,255,0.08)]`}
                                    >
                                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="flex-1">
                                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                                                            status
                                                        )}`}
                                                    >
                                                        {status}
                                                    </span>

                                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                                                        Submitted {formatDate(getCreatedAt(proposal))}
                                                    </span>
                                                </div>

                                                <h2 className="text-xl font-bold text-white">
                                                    {getJobTitle(proposal)}
                                                </h2>

                                                <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                                                    {getCoverLetter(proposal) ||
                                                        "No cover letter provided."}
                                                </p>

                                                {getWorkPlan(proposal) && (
                                                    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                                        <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">
                                                            Work Plan
                                                        </p>

                                                        <p className="line-clamp-3 text-sm leading-6 text-gray-400">
                                                            {getWorkPlan(proposal)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-72">
                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-wider text-gray-500">
                                                            Proposed Budget
                                                        </p>
                                                        <p className="mt-1 text-xl font-bold text-white">
                                                            ${getBudget(proposal)}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs uppercase tracking-wider text-gray-500">
                                                            Duration
                                                        </p>
                                                        <p className="mt-1 text-sm font-semibold text-gray-300">
                                                            {getDuration(proposal)} days
                                                        </p>
                                                    </div>

                                                    <div className="flex gap-2 pt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                navigate(`/expert/jobs/${jobId}`)
                                                            }
                                                            className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
                                                        >
                                                            Job
                                                        </button>

                                                        {String(status).toUpperCase() === "PENDING" && (
                                                            <button
                                                                type="button"
                                                                disabled={actionLoadingId === proposalId}
                                                                onClick={() => handleWithdraw(proposalId)}
                                                                className="flex-1 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {actionLoadingId === proposalId
                                                                    ? "..."
                                                                    : "Withdraw"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </ExpertLayout>
    );
}