import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService, {
  getFriendlyProposalError,
} from "../../../services/proposal.service";

export default function ProposalVersionsPage() {
  const { proposalId } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => {
      return Number(getVersionNumber(b) || 0) - Number(getVersionNumber(a) || 0);
    });
  }, [versions]);

  useEffect(() => {
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError("");

      const [proposalResult, versionsResult] = await Promise.allSettled([
        proposalService.getProposalById(proposalId),
        proposalService.getProposalVersions(proposalId),
      ]);

      if (proposalResult.status === "fulfilled") {
        setProposal(proposalResult.value);
      }

      if (versionsResult.status === "fulfilled") {
        setVersions(Array.isArray(versionsResult.value) ? versionsResult.value : []);
      } else {
        throw versionsResult.reason;
      }
    } catch (err) {
      console.error("LOAD PROPOSAL VERSIONS ERROR:", err?.response?.data || err);
      setError(getFriendlyProposalError(err, "Cannot load proposal versions."));
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading proposal versions...
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-8 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate(`/expert/proposals/${proposalId}`)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to proposal detail
          </button>

          <section className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                  Proposal Versions
                </p>

                <h1 className="text-2xl font-bold text-white md:text-3xl">
                  {formatDisplayValue(
                    proposal?.jobTitle ||
                      proposal?.JobTitle ||
                      proposal?.projectTitle ||
                      proposal?.ProjectTitle ||
                      "Proposal version history"
                  )}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                  Review all versions you submitted for this proposal.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/expert/proposals/${proposalId}`)}
                  className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  Detail
                </button>

                {canResubmitProposal(getProposalStatusGroup(getProposalStatus(proposal))) && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/expert/proposals/${proposalId}/resubmit`)
                    }
                    className="rounded-xl border border-yellow-400/50 bg-yellow-400/10 px-4 py-2.5 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
                  >
                    Resubmit
                  </button>
                )}
              </div>
            </div>
          </section>

          {error && (
            <Alert type="danger" title="Proposal versions error" message={error} />
          )}

          {!error && sortedVersions.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-10 text-center">
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                history
              </span>

              <h2 className="text-xl font-bold text-white">No versions found</h2>

              <p className="mt-2 text-sm text-gray-400">
                This proposal has no version history yet.
              </p>
            </div>
          )}

          {sortedVersions.length > 0 && (
            <div className="space-y-4">
              {sortedVersions.map((version, index) => (
                <VersionCard
                  key={getVersionKey(version, index)}
                  version={version}
                  index={index}
                  isLatest={index === 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function VersionCard({ version, index, isLatest }) {
  const milestones = getVersionMilestones(version);

  const milestoneTotal = milestones.reduce((total, milestone) => {
    const amount = Number(milestone?.amount || 0);
    return total + (Number.isNaN(amount) ? 0 : amount);
  }, 0);

  const milestoneDuration = milestones.reduce((total, milestone) => {
    const durationDays = Number(milestone?.durationDays || 0);
    return total + (Number.isNaN(durationDays) ? 0 : durationDays);
  }, 0);

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22] p-5 transition hover:border-cyan-400/40">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-bold text-purple-300">
              Version {formatDisplayValue(getVersionNumber(version) || index + 1)}
            </span>

            {isLatest && (
              <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-bold text-green-300">
                Latest
              </span>
            )}

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
              {formatDate(version?.createdAt || version?.CreatedAt)}
            </span>
          </div>

          <h2 className="text-lg font-bold text-white">
            Submitted by{" "}
            {formatDisplayValue(
              version?.createdByName ||
                version?.CreatedByName ||
                version?.expertName ||
                version?.ExpertName ||
                "Expert"
            )}
          </h2>

          {(version?.resubmitNote ||
            version?.ResubmitNote ||
            version?.changeNote ||
            version?.ChangeNote) && (
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-yellow-200">
              {formatDisplayValue(
                version?.resubmitNote ||
                  version?.ResubmitNote ||
                  version?.changeNote ||
                  version?.ChangeNote
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 md:min-w-[320px]">
          <MiniInfo
            label="Price"
            value={formatMoney(
              version?.proposedPrice ||
                version?.ProposedPrice ||
                version?.bidAmount ||
                version?.BidAmount
            )}
          />

          <MiniInfo
            label="Timeline"
            value={`${formatNumber(
              version?.proposedTimelineDays ||
                version?.ProposedTimelineDays ||
                version?.estimatedDurationDays ||
                version?.EstimatedDurationDays ||
                0
            )} days`}
          />

          <MiniInfo label="Milestones" value={`${milestones.length}`} />
          <MiniInfo label="Total" value={formatMoney(milestoneTotal)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Cover Letter">
          {formatDisplayValue(version?.coverLetter || version?.CoverLetter)}
        </Section>

        <Section title="Expected Outputs">
          {formatDisplayValue(version?.expectedOutputs || version?.ExpectedOutputs)}
        </Section>

        <Section title="Working Approach">
          {formatDisplayValue(version?.workingApproach || version?.WorkingApproach)}
        </Section>

        <Section title="Milestone Plan">
          {formatDisplayValue(
            version?.preliminaryMilestonePlan ||
              version?.PreliminaryMilestonePlan ||
              version?.milestonePlan ||
              version?.MilestonePlan
          )}
        </Section>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-bold text-white">Milestones</p>

          <span className="text-xs text-gray-500">
            {milestoneDuration} days total
          </span>
        </div>

        {milestones.length === 0 ? (
          <p className="text-sm text-gray-500">No milestones found.</p>
        ) : (
          <div className="space-y-2">
            {milestones.map((milestone, milestoneIndex) => (
              <MilestoneRow
                key={milestone?.id || milestoneIndex}
                milestone={milestone}
                index={milestoneIndex}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
        {title}
      </p>

      <p className="line-clamp-5 whitespace-pre-line text-sm leading-6 text-gray-300">
        {children}
      </p>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-white">
        {formatDisplayValue(value)}
      </p>
    </div>
  );
}

function MilestoneRow({ milestone, index }) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_120px_120px]">
      <p className="text-sm font-bold text-white">
        {formatDisplayValue(milestone?.title || `Milestone ${index + 1}`)}
      </p>

      <p className="text-sm text-gray-300">{formatMoney(milestone?.amount)}</p>

      <p className="text-sm text-gray-300">
        {formatNumber(milestone?.durationDays)} days
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
    <div className={`mb-5 rounded-xl border px-5 py-4 text-sm ${style}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1">{formatDisplayValue(message)}</p>
    </div>
  );
}

function getVersionKey(version, index) {
  return (
    version?.proposalVersionId ||
    version?.ProposalVersionId ||
    version?.versionId ||
    version?.VersionId ||
    `${getVersionNumber(version)}-${index}`
  );
}

function getVersionNumber(version) {
  return (
    version?.versionNumber ||
    version?.VersionNumber ||
    version?.version ||
    version?.Version ||
    version?.proposalVersionId ||
    version?.ProposalVersionId ||
    ""
  );
}

function getVersionMilestones(version) {
  const raw = version?.raw || version?.Raw || version || {};

  const direct =
    version?.milestones ||
    version?.Milestones ||
    version?.proposalMilestones ||
    version?.ProposalMilestones ||
    version?.milestoneDrafts ||
    version?.MilestoneDrafts ||
    raw?.milestones ||
    raw?.Milestones ||
    raw?.proposalMilestones ||
    raw?.ProposalMilestones ||
    raw?.milestoneDrafts ||
    raw?.MilestoneDrafts;

  if (Array.isArray(direct)) return normalizeVersionMilestones(direct);

  const json =
    version?.milestonePlanJson ||
    version?.MilestonePlanJson ||
    version?.milestonesJson ||
    version?.MilestonesJson ||
    version?.milestoneDraftsJson ||
    version?.MilestoneDraftsJson ||
    raw?.milestonePlanJson ||
    raw?.MilestonePlanJson ||
    raw?.milestonesJson ||
    raw?.MilestonesJson ||
    raw?.milestoneDraftsJson ||
    raw?.MilestoneDraftsJson ||
    "";

  return normalizeVersionMilestones(parseMilestoneJson(json));
}

function parseMilestoneJson(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "object") {
    return extractMilestoneArray(value);
  }

  try {
    const parsed = JSON.parse(String(value));

    if (typeof parsed === "string") {
      return parseMilestoneJson(parsed);
    }

    return extractMilestoneArray(parsed);
  } catch {
    return [];
  }
}

function extractMilestoneArray(value) {
  if (Array.isArray(value)) return value;

  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value.milestones)) return value.milestones;
  if (Array.isArray(value.Milestones)) return value.Milestones;

  if (Array.isArray(value.milestoneDrafts)) return value.milestoneDrafts;
  if (Array.isArray(value.MilestoneDrafts)) return value.MilestoneDrafts;

  if (Array.isArray(value.proposalMilestones)) return value.proposalMilestones;
  if (Array.isArray(value.ProposalMilestones)) return value.ProposalMilestones;

  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.Items)) return value.Items;

  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.Data)) return value.Data;

  return [];
}

function normalizeVersionMilestones(milestones) {
  if (!Array.isArray(milestones)) return [];

  return milestones
    .map((item, index) => ({
      id:
        item?.id ||
        item?.Id ||
        item?.proposalMilestoneId ||
        item?.ProposalMilestoneId ||
        item?.proposalMilestoneDraftId ||
        item?.ProposalMilestoneDraftId ||
        index,

      title:
        item?.title ||
        item?.Title ||
        item?.name ||
        item?.Name ||
        `Milestone ${index + 1}`,

      amount: Number(item?.amount ?? item?.Amount ?? 0),

      durationDays: Number(
        item?.durationDays ??
          item?.DurationDays ??
          item?.deadlineOffsetDays ??
          item?.DeadlineOffsetDays ??
          0
      ),
    }))
    .filter((item) => item.title || item.amount > 0 || item.durationDays > 0);
}

function getProposalStatus(proposal) {
  const raw = proposal?.raw || proposal?.Raw || proposal || {};

  return String(
    proposal?.status || proposal?.Status || raw?.status || raw?.Status || "SUBMITTED"
  )
    .trim()
    .toUpperCase();
}

function getProposalStatusGroup(status) {
  const value = String(status || "").trim().toUpperCase();

  if (
    [
      "SUBMITTED",
      "PENDING",
      "REVISION_REQUESTED",
      "NEEDS_REVISION",
      "RESUBMISSION_REQUESTED",
    ].includes(value)
  ) {
    return "SUBMITTED";
  }

  if (["REJECTED", "NOT_SELECTED"].includes(value)) return "REJECTED";
  if (value === "ACCEPTED") return "ACCEPTED";

  if (["WITHDRAWN", "CANCELLED", "CANCELED"].includes(value)) {
    return "CANCELLED";
  }

  return "SUBMITTED";
}

function canResubmitProposal(statusGroup) {
  return statusGroup === "SUBMITTED";
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
  const number = Number(value || 0);
  return Number.isNaN(number) ? 0 : number;
}

function formatDate(value) {
  if (!value) return "N/A";

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatDisplayValue(value) {
  if (value === undefined || value === null || value === "") return "N/A";

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatDisplayValue).join(", ") : "N/A";
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.Name ||
      value.title ||
      value.Title ||
      value.label ||
      value.Label ||
      value.status ||
      value.Status ||
      value.versionNumber ||
      value.VersionNumber ||
      value.message ||
      value.Message ||
      "N/A"
    );
  }

  return String(value);
}