import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService from "../../../services/proposal.service";
import {
  canWithdrawProposal,
  PROPOSAL_STATUS_LABEL,
} from "../../../constants/proposalStatus";

export default function ProposalDetailPage() {
  const { proposalId } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProposal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await proposalService.getProposalById(proposalId);

      setProposal(data);
    } catch (err) {
      console.error("LOAD PROPOSAL DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load proposal detail."));
      setProposal(null);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const ok = window.confirm("Are you sure you want to withdraw this proposal?");

    if (!ok) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const data = await proposalService.withdrawProposal(proposalId);

      if (data?.proposalId) {
        setProposal(data);
      } else {
        await loadProposal();
      }

      setMessage("Proposal withdrawn successfully.");
    } catch (err) {
      console.error("WITHDRAW PROPOSAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot withdraw proposal."));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading proposal detail...
        </div>
      </ExpertLayout>
    );
  }

  if (!proposal) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert
              type="danger"
              title="Proposal not found"
              message={error || "Cannot load proposal detail."}
            />

            <button
              type="button"
              onClick={() => navigate("/expert/proposals")}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Back to Proposals
            </button>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  const status = String(proposal.status || "").toUpperCase();

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate("/expert/proposals")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to proposals
          </button>

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Proposal Detail
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                {proposal.jobTitle || "Untitled Job"}
              </h1>

              <p className="mt-2 text-sm text-gray-400">
                Client: {proposal.clientName || "Client"}
              </p>

              <div className="mt-4">
                <StatusBadge status={status} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {proposal.jobId && (
                <button
                  type="button"
                  onClick={() => navigate(`/expert/jobs/${proposal.jobId}`)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
                >
                  View Job
                </button>
              )}

              {proposal.contractId ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/expert/contracts/${proposal.contractId}`)
                  }
                  className="rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
                >
                  View Contract
                </button>
              ) : (
                status === "ACCEPTED" && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/expert/proposals/${proposal.proposalId}/contract`)
                    }
                    className="rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
                  >
                    View Contract
                  </button>
                )
              )}

              {canWithdrawProposal(status) && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleWithdraw}
                  className="rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading ? "Withdrawing..." : "Withdraw"}
                </button>
              )}
            </div>
          </div>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Proposal error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="Cover Letter">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {proposal.coverLetter || "No cover letter."}
                </p>
              </Card>

              <Card title="Expected Outputs">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {proposal.expectedOutputs || "No expected outputs."}
                </p>
              </Card>

              <Card title="Working Approach">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {proposal.workingApproach || "No working approach."}
                </p>
              </Card>

              <Card title="Preliminary Milestone Plan">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {proposal.preliminaryMilestonePlan ||
                    "No preliminary milestone plan."}
                </p>
              </Card>

              {proposal.counterMessage && (
                <Card title="Counter Offer From Client">
                  <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-yellow-100">
                    <p className="whitespace-pre-line text-sm leading-7">
                      {proposal.counterMessage}
                    </p>
                  </div>
                </Card>
              )}
            </main>

            <aside className="space-y-6">
              <Card title="Proposal Summary">
                <Info
                  label="Proposed Price"
                  value={formatMoney(proposal.proposedPrice)}
                />

                <Info
                  label="Timeline"
                  value={`${proposal.proposedTimelineDays || 0} days`}
                />

                <Info
                  label="Status"
                  value={PROPOSAL_STATUS_LABEL[status] || status}
                />

                <Info label="Created At" value={formatDate(proposal.createdAt)} />
              </Card>

              {proposal.counterPrice && (
                <Card title="Counter Summary">
                  <Info
                    label="Counter Price"
                    value={formatMoney(proposal.counterPrice)}
                  />

                  <Info
                    label="Counter Timeline"
                    value={`${proposal.counterTimelineDays} days`}
                  />
                </Card>
              )}

              {proposal.contractId && (
                <Card title="Contract">
                  <Info label="Contract ID" value={`#${proposal.contractId}`} />

                  <p className="mt-4 text-sm leading-6 text-gray-400">
                    Backend created a contract draft after this proposal was
                    accepted.
                  </p>
                </Card>
              )}
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
      <h2 className="mb-4 text-xl font-extrabold text-white">{title}</h2>
      {children}
    </section>
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
    status === "ACCEPTED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : status === "REJECTED" || status === "WITHDRAWN"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : status === "COUNTER_OFFER"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {PROPOSAL_STATUS_LABEL[status] || status}
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

  if (!number) return "$0";

  return `$${number.toLocaleString()}`;
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