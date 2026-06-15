import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import contractService from "../../../services/contract.service";
import {
  canConfirmContract,
  CONTRACT_STATUS_LABEL,
} from "../../../constants/contractStatus";

export default function ContractDetailPage() {
  const { contractId, proposalId } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadContract();
  }, [contractId, proposalId]);

  const loadContract = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      let data = null;

      if (contractId) {
        data = await contractService.getContractById(contractId);
      } else if (proposalId) {
        data = await contractService.getContractByProposalId(proposalId);
      }

      setContract(data);
    } catch (err) {
      console.error("LOAD CONTRACT ERROR:", err?.response?.data || err);

      if (err?.response?.status === 404) {
        setError(
          "Contract has not been created yet. The client may need to create or confirm the contract first."
        );
      } else {
        setError(getFriendlyError(err, "Cannot load contract detail."));
      }

      setContract(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmContract = async () => {
    if (!contract?.contractId) return;

    const ok = window.confirm("Are you sure you want to confirm this contract?");

    if (!ok) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const data = await contractService.confirmContract(contract.contractId);

      setContract(data);
      setMessage("Contract confirmed successfully.");
    } catch (err) {
      console.error("CONFIRM CONTRACT ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot confirm contract."));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading contract detail...
        </div>
      </ExpertLayout>
    );
  }

  if (!contract) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert
              type="danger"
              title="Cannot load contract"
              message={error || "Contract not found."}
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/expert/proposals")}
                className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Back to Proposals
              </button>

              <button
                type="button"
                onClick={loadContract}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  const status = String(contract.status || "").toUpperCase();

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
                Contract Detail
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                {contract.jobTitle || "Contract"}
              </h1>

              <p className="mt-2 text-sm text-gray-400">
                Contract ID: #{contract.contractId}
              </p>

              <div className="mt-4">
                <StatusBadge status={status} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {contract.proposalId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/expert/proposals/${contract.proposalId}`)
                  }
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
                >
                  View Proposal
                </button>
              )}

              {contract.projectId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/expert/projects/${contract.projectId}`)
                  }
                  className="rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
                >
                  View Project
                </button>
              )}

              {canConfirmContract(status) && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmContract}
                  className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading ? "Confirming..." : "Confirm Contract"}
                </button>
              )}
            </div>
          </div>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Contract error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="Scope of Work">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {contract.scopeOfWork || "No scope of work provided."}
                </p>
              </Card>

              <Card title="Contract Terms">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {contract.contractTerms || "No contract terms provided."}
                </p>
              </Card>

              <Card title="Payment Terms">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {contract.paymentTerms || "No payment terms provided."}
                </p>
              </Card>

              <Card title="Milestones">
                {contract.milestones.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No milestone data returned from backend.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {contract.milestones.map((milestone, index) => (
                      <MilestoneItem
                        key={
                          milestone.milestoneId ||
                          milestone.MilestoneId ||
                          index
                        }
                        milestone={milestone}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </main>

            <aside className="space-y-6">
              <Card title="Contract Summary">
                <Info label="Client" value={contract.clientName} />
                <Info label="Expert" value={contract.expertName} />
                <Info
                  label="Agreed Price"
                  value={formatMoney(contract.agreedPrice)}
                />
                <Info
                  label="Timeline"
                  value={
                    contract.agreedTimelineDays
                      ? `${contract.agreedTimelineDays} days`
                      : "N/A"
                  }
                />
                <Info
                  label="Status"
                  value={CONTRACT_STATUS_LABEL[status] || status}
                />
                <Info label="Created At" value={formatDate(contract.createdAt)} />
              </Card>

              <Card title="Confirmation">
                <Info
                  label="Client Confirmed At"
                  value={formatDate(contract.clientConfirmedAt)}
                />

                <Info
                  label="Expert Confirmed At"
                  value={formatDate(contract.expertConfirmedAt)}
                />

                <p className="mt-4 text-sm leading-6 text-gray-400">
                  When both sides confirm the contract, the project can be
                  initialized by backend flow.
                </p>
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
  const normalized = String(status || "").toUpperCase();

  const style =
    normalized === "CONFIRMED" ||
    normalized === "ACTIVE" ||
    normalized === "COMPLETED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : normalized === "CANCELLED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";

  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {CONTRACT_STATUS_LABEL[normalized] || normalized}
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

function MilestoneItem({ milestone, index }) {
  const title =
    milestone.title ||
    milestone.Title ||
    milestone.name ||
    milestone.Name ||
    `Milestone ${index + 1}`;

  const amount =
    milestone.amount ||
    milestone.Amount ||
    milestone.price ||
    milestone.Price ||
    milestone.budget ||
    milestone.Budget ||
    0;

  const dueDate =
    milestone.dueDate ||
    milestone.DueDate ||
    milestone.deadline ||
    milestone.Deadline ||
    "";

  const status = milestone.status || milestone.Status || "N/A";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-bold text-white">{title}</p>

          <p className="mt-1 text-sm text-gray-400">
            {milestone.description || milestone.Description || "No description"}
          </p>
        </div>

        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase text-cyan-300">
          {status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Info label="Amount" value={formatMoney(amount)} />
        <Info label="Due Date" value={formatDate(dueDate)} />
      </div>
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