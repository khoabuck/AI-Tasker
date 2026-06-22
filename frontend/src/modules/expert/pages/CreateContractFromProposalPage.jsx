import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService from "../../../services/proposal.service";
import contractService from "../../../services/contract.service";

const emptyContractForm = {
  proposalId: "",
  projectScope: "",
  finalPrice: "",
  finalTimelineDays: "",
  deliverables: "",
  acceptanceCriteria: "",
  revisionLimit: 2,
  paymentTerms: "",
};

const defaultMilestone = {
  title: "",
  description: "",
  expectedDeliverable: "",
  acceptanceCriteria: "",
  amount: "",
  orderIndex: 1,
  deadlineOffsetDays: 7,
  revisionLimit: 1,
};

export default function CreateContractFromProposalPage() {
  const { proposalId } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [existingContract, setExistingContract] = useState(null);

  const [formData, setFormData] = useState(emptyContractForm);
  const [milestones, setMilestones] = useState([
    { ...defaultMilestone, orderIndex: 1 },
  ]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totalMilestoneAmount = useMemo(() => {
    return milestones.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [milestones]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const proposalData = await proposalService.getProposalById(proposalId);

      setProposal(proposalData);

      setFormData({
        proposalId: proposalData.proposalId,
        projectScope: buildDefaultScope(proposalData),
        finalPrice: proposalData.proposedPrice || "",
        finalTimelineDays: proposalData.proposedTimelineDays || "",
        deliverables: proposalData.expectedOutputs || "",
        acceptanceCriteria:
          "Client will review and approve deliverables based on the agreed scope, quality requirements, and acceptance criteria.",
        revisionLimit: 2,
        paymentTerms:
          "Payment will be released through the platform after milestone approval.",
      });

      try {
        const contractData = await contractService.getContractByProposalId(
          proposalId
        );

        if (contractData?.contractId) {
          setExistingContract(contractData);
        }
      } catch {
        setExistingContract(null);
      }
    } catch (err) {
      console.error("LOAD CREATE CONTRACT ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load proposal."));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (name, value) => {
    setError("");
    setMessage("");

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateMilestone = (index, name, value) => {
    setError("");
    setMessage("");

    setMilestones((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [name]: value } : item
      )
    );
  };

  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      {
        ...defaultMilestone,
        orderIndex: prev.length + 1,
        deadlineOffsetDays: (prev.length + 1) * 7,
      },
    ]);
  };

  const removeMilestone = (index) => {
    setMilestones((prev) =>
      prev
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({
          ...item,
          orderIndex: itemIndex + 1,
        }))
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const validationError = validateContractForm(formData, milestones);

    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);

      const contract = await contractService.createDraftContract(formData);

      if (!contract?.contractId) {
        throw new Error("Backend did not return contractId.");
      }

      await contractService.replaceContractMilestoneDrafts(
        contract.contractId,
        milestones
      );

      setMessage("Contract draft created successfully.");

      setTimeout(() => {
        navigate(`/expert/contracts/${contract.contractId}`, { replace: true });
      }, 800);
    } catch (err) {
      console.error("CREATE CONTRACT ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot create contract."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading contract workspace...
        </div>
      </ExpertLayout>
    );
  }

  if (!proposal) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <Alert
            type="danger"
            title="Cannot create contract"
            message={error || "Proposal not found."}
          />

          <button
            type="button"
            onClick={() => navigate("/expert/proposals")}
            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
          >
            Back to Proposals
          </button>
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
            onClick={() => navigate(`/expert/proposals/${proposalId}`)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to proposal
          </button>

          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Create Contract
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Create contract from accepted proposal
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
              Build the final contract based on the agreement between you and
              the client.
            </p>
          </div>

          {error && <Alert type="danger" title="Contract error" message={error} />}
          {message && <Alert type="success" title="Success" message={message} />}

          {status !== "ACCEPTED" && (
            <Alert
              type="danger"
              title="Proposal is not accepted"
              message="Contract can only be created after the client accepts your proposal."
            />
          )}

          {existingContract && (
            <section className="mb-6 rounded-2xl border border-green-400/30 bg-green-400/10 p-6 text-green-100">
              <h2 className="text-lg font-bold">Contract already exists</h2>

              <p className="mt-2 text-sm leading-6">
                This proposal already has a contract. You can view the existing
                contract instead of creating another one.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(`/expert/contracts/${existingContract.contractId}`)
                }
                className="mt-5 rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
              >
                View Contract
              </button>
            </section>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card title="Proposal Summary">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Info label="Project" value={proposal.jobTitle} />
                <Info label="Client" value={proposal.clientName} />
                <Info label="Proposal Price" value={formatMoney(proposal.proposedPrice)} />
              </div>
            </Card>

            <Card title="Contract Terms">
              <div className="space-y-5">
                <Textarea
                  label="Project Scope"
                  value={formData.projectScope}
                  onChange={(value) => updateField("projectScope", value)}
                  rows={6}
                />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <Input
                    label="Final Price"
                    type="number"
                    min="1"
                    value={formData.finalPrice}
                    onChange={(value) => updateField("finalPrice", value)}
                  />

                  <Input
                    label="Final Timeline Days"
                    type="number"
                    min="1"
                    value={formData.finalTimelineDays}
                    onChange={(value) =>
                      updateField("finalTimelineDays", value)
                    }
                  />

                  <Input
                    label="Revision Limit"
                    type="number"
                    min="0"
                    value={formData.revisionLimit}
                    onChange={(value) => updateField("revisionLimit", value)}
                  />
                </div>

                <Textarea
                  label="Deliverables"
                  value={formData.deliverables}
                  onChange={(value) => updateField("deliverables", value)}
                  rows={4}
                />

                <Textarea
                  label="Acceptance Criteria"
                  value={formData.acceptanceCriteria}
                  onChange={(value) =>
                    updateField("acceptanceCriteria", value)
                  }
                  rows={4}
                />

                <Textarea
                  label="Payment Terms"
                  value={formData.paymentTerms}
                  onChange={(value) => updateField("paymentTerms", value)}
                  rows={4}
                />
              </div>
            </Card>

            <Card title="Milestone Drafts">
              <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Total Milestone Amount
                </p>

                <p className="mt-1 text-xl font-extrabold text-white">
                  {formatMoney(totalMilestoneAmount)}
                </p>
              </div>

              <div className="space-y-5">
                {milestones.map((milestone, index) => (
                  <MilestoneForm
                    key={index}
                    index={index}
                    milestone={milestone}
                    canRemove={milestones.length > 1}
                    onChange={updateMilestone}
                    onRemove={removeMilestone}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={addMilestone}
                className="mt-5 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Add Milestone
              </button>
            </Card>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(`/expert/proposals/${proposalId}`)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || status !== "ACCEPTED" || existingContract}
                className="rounded-xl border border-green-400/60 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Contract Draft"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ExpertLayout>
  );
}

function MilestoneForm({ index, milestone, canRemove, onChange, onRemove }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white">
          Milestone {index + 1}
        </h3>

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
          >
            Remove
          </button>
        )}
      </div>

      <div className="space-y-4">
        <Input
          label="Title"
          value={milestone.title}
          onChange={(value) => onChange(index, "title", value)}
        />

        <Textarea
          label="Description"
          value={milestone.description}
          onChange={(value) => onChange(index, "description", value)}
          rows={3}
        />

        <Textarea
          label="Expected Deliverable"
          value={milestone.expectedDeliverable}
          onChange={(value) => onChange(index, "expectedDeliverable", value)}
          rows={3}
        />

        <Textarea
          label="Acceptance Criteria"
          value={milestone.acceptanceCriteria}
          onChange={(value) => onChange(index, "acceptanceCriteria", value)}
          rows={3}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input
            label="Amount"
            type="number"
            min="1"
            value={milestone.amount}
            onChange={(value) => onChange(index, "amount", value)}
          />

          <Input
            label="Order"
            type="number"
            min="1"
            value={milestone.orderIndex}
            onChange={(value) => onChange(index, "orderIndex", value)}
          />

          <Input
            label="Deadline Offset Days"
            type="number"
            min="1"
            value={milestone.deadlineOffsetDays}
            onChange={(value) => onChange(index, "deadlineOffsetDays", value)}
          />

          <Input
            label="Revision Limit"
            type="number"
            min="0"
            value={milestone.revisionLimit}
            onChange={(value) => onChange(index, "revisionLimit", value)}
          />
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6 md:p-8">
      <h2 className="mb-6 text-xl font-extrabold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", min }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>

      <input
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 4 }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>

      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-[#00F0FF]"
      />
    </label>
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

function buildDefaultScope(proposal) {
  const parts = [
    proposal.coverLetter,
    proposal.workingApproach,
    proposal.preliminaryMilestonePlan,
  ].filter(Boolean);

  return parts.join("\n\n");
}

function validateContractForm(formData, milestones) {
  if (!formData.projectScope?.trim()) return "Project scope is required.";
  if (formData.projectScope.trim().length < 30) {
    return "Project scope must be at least 30 characters.";
  }

  if (Number(formData.finalPrice) <= 0) {
    return "Final price must be greater than 0.";
  }

  if (Number(formData.finalTimelineDays) <= 0) {
    return "Final timeline days must be greater than 0.";
  }

  if (!formData.deliverables?.trim()) return "Deliverables are required.";
  if (!formData.acceptanceCriteria?.trim()) {
    return "Acceptance criteria are required.";
  }
  if (!formData.paymentTerms?.trim()) return "Payment terms are required.";

  if (!Array.isArray(milestones) || milestones.length === 0) {
    return "At least one milestone is required.";
  }

  for (let index = 0; index < milestones.length; index += 1) {
    const milestone = milestones[index];

    if (!milestone.title?.trim()) {
      return `Milestone ${index + 1}: title is required.`;
    }

    if (!milestone.description?.trim()) {
      return `Milestone ${index + 1}: description is required.`;
    }

    if (!milestone.expectedDeliverable?.trim()) {
      return `Milestone ${index + 1}: expected deliverable is required.`;
    }

    if (!milestone.acceptanceCriteria?.trim()) {
      return `Milestone ${index + 1}: acceptance criteria is required.`;
    }

    if (Number(milestone.amount) <= 0) {
      return `Milestone ${index + 1}: amount must be greater than 0.`;
    }

    if (Number(milestone.deadlineOffsetDays) <= 0) {
      return `Milestone ${index + 1}: deadline offset days must be greater than 0.`;
    }
  }

  return "";
}

function formatMoney(value) {
  const number = Number(value || 0);

  if (!number) return "$0";

  return `$${number.toLocaleString()}`;
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