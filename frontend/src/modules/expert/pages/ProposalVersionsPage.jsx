import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService from "../../../services/proposal.service";

export default function ProposalVersionsPage() {
  const { proposalId } = useParams();
  const navigate = useNavigate();

  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadVersions();
  }, [proposalId]);

  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => {
      const versionA = Number(a.version || 0);
      const versionB = Number(b.version || 0);

      if (versionA !== versionB) return versionB - versionA;

      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();

      return dateB - dateA;
    });
  }, [versions]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await proposalService.getProposalVersions(proposalId);

      setVersions(data);
    } catch (err) {
      console.error("LOAD PROPOSAL VERSIONS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load proposal versions."));
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

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
            Back to proposal detail
          </button>

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Proposal Versions
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Version history
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Review all submitted and resubmitted versions of this proposal,
                including price, timeline, outputs, approach, milestone plan,
                and detailed milestones.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(`/expert/proposals/${proposalId}/resubmit`)
              }
              className="rounded-xl border border-yellow-400/50 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
            >
              Resubmit Proposal
            </button>
          </div>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Proposal versions error" message={error} />
          )}

          {loading && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center text-gray-400">
              Loading proposal versions...
            </div>
          )}

          {!loading && sortedVersions.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center">
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                history
              </span>

              <h2 className="text-xl font-bold text-white">
                No versions found
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Backend did not return any version history for this proposal.
              </p>

              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={loadVersions}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
                >
                  Try Again
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/expert/proposals/${proposalId}`)}
                  className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  Back to Detail
                </button>
              </div>
            </div>
          )}

          {!loading && sortedVersions.length > 0 && (
            <div className="space-y-6">
              {sortedVersions.map((version, index) => (
                <VersionCard
                  key={
                    version.proposalVersionId ||
                    `${version.proposalId}-${version.version}-${index}`
                  }
                  version={version}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function VersionCard({ version, index }) {
  const milestones = Array.isArray(version.milestones)
    ? version.milestones
    : [];

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-purple-300">
              Version {version.version || index + 1}
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-gray-400">
              Created {formatDate(version.createdAt)}
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-white">
            Proposal Version {version.version || index + 1}
          </h2>

          {version.changeNote && (
            <div className="mt-4 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-yellow-100">
              <p className="text-xs font-bold uppercase tracking-wider">
                Resubmit Note
              </p>

              <p className="mt-2 whitespace-pre-line text-sm leading-6">
                {version.changeNote}
              </p>
            </div>
          )}
        </div>

        <div className="grid w-full grid-cols-1 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:w-80">
          <Info label="Price" value={formatMoney(version.proposedPrice)} />

          <Info
            label="Timeline"
            value={`${version.proposedTimelineDays || 0} days`}
          />

          <Info label="Milestones" value={`${milestones.length}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Cover Letter">
          <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
            {version.coverLetter || "No cover letter."}
          </p>
        </Card>

        <Card title="Expected Outputs">
          <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
            {version.expectedOutputs || "No expected outputs."}
          </p>
        </Card>

        <Card title="Working Approach">
          <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
            {version.workingApproach || "No working approach."}
          </p>
        </Card>

        <Card title="Preliminary Milestone Plan">
          <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
            {version.preliminaryMilestonePlan ||
              "No preliminary milestone plan."}
          </p>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`Milestones (${milestones.length})`}>
          {milestones.length === 0 ? (
            <p className="text-sm text-gray-500">
              No milestone data returned for this version.
            </p>
          ) : (
            <div className="space-y-4">
              {milestones.map((milestone, milestoneIndex) => (
                <MilestoneCard
                  key={milestone.milestoneId || milestoneIndex}
                  milestone={milestone}
                  index={milestoneIndex}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </article>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-3 text-lg font-bold text-white">{title}</h3>
      {children}
    </section>
  );
}

function MilestoneCard({ milestone, index }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
            Milestone {milestone.orderIndex || index + 1}
          </p>

          <h4 className="mt-2 text-lg font-bold text-white">
            {milestone.title || "Untitled Milestone"}
          </h4>
        </div>

        {milestone.status && (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase text-gray-300">
            {milestone.status}
          </span>
        )}
      </div>

      <p className="whitespace-pre-line text-sm leading-7 text-gray-400">
        {milestone.description || "No description."}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Info
          label="Expected Deliverable"
          value={milestone.expectedDeliverable || "N/A"}
        />

        <Info
          label="Acceptance Criteria"
          value={milestone.acceptanceCriteria || "N/A"}
        />

        <Info label="Amount" value={formatMoney(milestone.amount)} />

        <Info
          label="Deadline Offset"
          value={
            milestone.deadlineOffsetDays
              ? `${milestone.deadlineOffsetDays} days`
              : "N/A"
          }
        />

        <Info
          label="Revision Limit"
          value={
            milestone.revisionLimit !== undefined &&
            milestone.revisionLimit !== null
              ? `${milestone.revisionLimit}`
              : "N/A"
          }
        />
      </div>
    </div>
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