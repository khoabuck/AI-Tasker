import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import projectService from "../../../services/project.service";
import {
  MILESTONE_STATUS_LABEL,
  PROJECT_STATUS_LABEL,
} from "../../../constants/projectStatus";

export default function ProjectMilestonesPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [projectData, milestoneData] = await Promise.all([
        projectService.getProjectById(projectId),
        projectService.getProjectMilestones(projectId),
      ]);

      setProject(projectData);
      setMilestones(Array.isArray(milestoneData) ? milestoneData : []);
    } catch (err) {
      console.error("LOAD PROJECT MILESTONES ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load project milestones."));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading milestones...
        </div>
      </ExpertLayout>
    );
  }

  const projectStatus = String(project?.status || "").toUpperCase();

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate(`/expert/projects/${projectId}`)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to project detail
          </button>

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Project Milestones
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                {project?.title || "Project milestones"}
              </h1>

              <p className="mt-2 text-sm text-gray-400">
                Client: {project?.clientName || "Client"}
              </p>

              {project && (
                <div className="mt-4">
                  <ProjectStatusBadge status={projectStatus} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate(`/expert/projects/${projectId}`)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
              >
                Project Detail
              </button>

              <button
                type="button"
                onClick={loadData}
                className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Refresh
              </button>
            </div>
          </div>

          {error && <Alert title="Milestone error" message={error} />}

          {!error && milestones.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center">
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                flag
              </span>

              <h2 className="text-xl font-bold text-white">
                No milestones found
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Milestones will appear after the project is initialized.
              </p>
            </div>
          )}

          {milestones.length > 0 && (
            <div className="grid grid-cols-1 gap-5">
              {milestones.map((milestone, index) => {
                const milestoneId = getMilestoneId(milestone);

                return (
                  <MilestoneCard
                    key={milestoneId || index}
                    milestone={milestone}
                    index={index}
                    onDetail={() => navigate(`/expert/milestones/${milestoneId}`)}
                    onDeliverables={() =>
                      navigate(`/expert/milestones/${milestoneId}/deliverables`)
                    }
                    onDispute={() => navigate(`/expert/milestones/${milestoneId}`)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function MilestoneCard({
  milestone,
  index,
  onDetail,
  onDeliverables,
  onDispute,
}) {
  const status = String(milestone.status || "").toUpperCase();
  const canDispute = canOpenDisputeFromMilestoneStatus(status);

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22] p-6 transition hover:border-cyan-400/40">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase text-gray-400">
              Milestone {index + 1}
            </span>

            <MilestoneStatusBadge status={status} />

            {canDispute && (
              <span className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-300">
                Disputable
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-white">
            {milestone.title || "Untitled Milestone"}
          </h2>

          <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-400">
            {milestone.description || "No description."}
          </p>
        </div>

        <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-80">
          <div className="space-y-4">
            <Info label="Net Earning" value={formatMoney(getMilestoneNetEarning(milestone))} />
            <Info label="Due Date" value={formatDate(milestone.dueDate)} />
            <Info
              label="Status"
              value={MILESTONE_STATUS_LABEL[status] || formatStatusLabel(status)}
            />

            <div className="rounded-xl border border-green-400/20 bg-green-400/10 p-3">
              <p className="text-xs uppercase tracking-wider text-green-100/70">Payment Breakdown</p>
              <p className="mt-1 text-sm font-bold text-white">
                {formatMoney(getMilestoneAmount(milestone))}
              </p>
              <p className="mt-1 text-xs text-green-100/70">
                Fee -{formatMoney(getMilestoneServiceFee(milestone))} · You receive {formatMoney(getMilestoneNetEarning(milestone))}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={onDetail}
                className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Detail
              </button>

              <button
                type="button"
                onClick={onDeliverables}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
              >
                Deliverables
              </button>

              {canDispute && (
                <button
                  type="button"
                  onClick={onDispute}
                  className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400 hover:text-black"
                >
                  Dispute
                </button>
              )}
            </div>

            {canDispute && (
              <p className="text-xs leading-5 text-gray-500">
                Open this milestone to submit a dispute with reason and evidence.
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function ProjectStatusBadge({ status }) {
  const style =
    status === "COMPLETED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : status === "CANCELLED" || status === "DISPUTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {PROJECT_STATUS_LABEL[status] || formatStatusLabel(status)}
    </span>
  );
}

function MilestoneStatusBadge({ status }) {
  const style =
    status === "COMPLETED" || status === "APPROVED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : canOpenDisputeFromMilestoneStatus(status)
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : status === "CANCELLED" ||
        status === "CANCELED" ||
        status === "DISPUTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {MILESTONE_STATUS_LABEL[status] || formatStatusLabel(status)}
    </span>
  );
}

function Alert({ title, message }) {
  return (
    <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
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
    ""
  );
}

function canOpenDisputeFromMilestoneStatus(status) {
  const value = String(status || "").trim().toUpperCase();

  return [
    "REVISION_REQUESTED",
    "REVISION_REQUIRED",
    "NEEDS_REVISION",
    "CHANGES_REQUESTED",
    "REQUEST_REVISION",
    "RESUBMISSION_REQUESTED",
    "RESUBMIT_REQUESTED",
    "REWORK_REQUIRED",
    "REJECTED",
    "REJECTED_BY_CLIENT",
    "CLIENT_REQUESTED_REVISION",
  ].includes(value);
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
    milestone?.raw?.expertNetAmount,
    milestone?.raw?.ExpertNetAmount,
    0
  );

  if (direct > 0) return direct;

  return Math.max(getMilestoneAmount(milestone) - getMilestoneServiceFee(milestone), 0);
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
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
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("vi-VN");
}

function formatStatusLabel(status) {
  return String(status || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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