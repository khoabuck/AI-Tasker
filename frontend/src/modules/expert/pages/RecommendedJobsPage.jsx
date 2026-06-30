import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertProfileService from "../../../services/expertProfile.service";
import jobService from "../../../services/job.service";
import { JobDetailModal } from "./JobDetailPage";

const MIN_RECOMMENDED_SCORE = 55;

export default function RecommendedJobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRecommendedJobs();
  }, []);

  const expertProfile = useMemo(() => normalizeProfile(profile), [profile]);

  const recommendedJobs = useMemo(() => {
    return jobs
      .map((job) => normalizeRecommendedJob(job, expertProfile))
      .filter((job) => job.id)
      .filter(isActiveJob)
      .filter(isSuitableJob)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [jobs, expertProfile]);

  const filteredJobs = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    if (!q) return recommendedJobs;

    return recommendedJobs.filter((job) => {
      return (
        job.title.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.category.toLowerCase().includes(q) ||
        job.skills.join(" ").toLowerCase().includes(q)
      );
    });
  }, [recommendedJobs, keyword]);

  const topMatch = recommendedJobs[0];
  const strongMatches = recommendedJobs.filter((job) => job.matchScore >= 75);

  const loadRecommendedJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const [jobsResult, profileResult] = await Promise.allSettled([
        loadJobsFromApi(),
        expertProfileService.getMyExpertProfile(),
      ]);

      if (jobsResult.status === "fulfilled") {
        setJobs(Array.isArray(jobsResult.value) ? jobsResult.value : []);
      } else {
        throw jobsResult.reason;
      }

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value);
      } else {
        console.warn(
          "LOAD PROFILE WARNING:",
          profileResult.reason?.response?.data || profileResult.reason
        );
        setProfile(null);
      }
    } catch (err) {
      console.error("LOAD RECOMMENDED JOBS ERROR:", err?.response?.data || err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Cannot load recommended jobs right now."
      );
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadJobsFromApi = async () => {
    if (typeof jobService.getRecommendedJobs === "function") {
      const data = await jobService.getRecommendedJobs(30);
      return Array.isArray(data) ? data : [];
    }

    const data = await jobService.getOpenJobs();
    return Array.isArray(data) ? data : [];
  };

  const handleViewDetail = (job) => {
    if (!job?.id) {
      setError("This job is unavailable right now. Please try another job.");
      return;
    }

    setSelectedJobId(job.id);
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-4 rounded-2xl border border-white/10 bg-[#151a22] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-purple-300">
                  AI Recommended Jobs
                </p>

                <h1 className="text-2xl font-extrabold text-white">
                  Best-fit projects for you
                </h1>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
                  Jobs are ranked by skills, profile match, budget, and timeline.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/expert/jobs")}
                  className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  Browse All
                </button>

                <button
                  type="button"
                  onClick={loadRecommendedJobs}
                  disabled={loading}
                  className="rounded-lg border border-purple-400/40 bg-purple-400/10 px-4 py-2 text-sm font-bold text-purple-300 transition hover:bg-purple-400 hover:text-black disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            </div>
          </section>

          <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat
              label="Recommended"
              value={recommendedJobs.length}
              tone="purple"
            />

            <MiniStat
              label="Top Match"
              value={topMatch ? `${Math.round(topMatch.matchScore)}%` : "N/A"}
              tone="green"
            />

            <MiniStat
              label="Strong"
              value={strongMatches.length}
              tone="cyan"
            />

            <MiniStat
              label="Showing"
              value={filteredJobs.length}
              tone="yellow"
            />
          </section>

          <section className="mb-4 rounded-2xl border border-white/10 bg-[#151a22] p-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-500">
                search
              </span>

              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search recommended jobs..."
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-purple-300"
              />
            </div>
          </section>

          {loading && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-10 text-center text-gray-400">
              Finding the best jobs for you...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
              <p className="font-bold">Cannot load recommendations</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && filteredJobs.length === 0 && (
            <EmptyState onBrowse={() => navigate("/expert/jobs")} />
          )}

          {!loading && !error && filteredJobs.length > 0 && (
            <div className="space-y-3">
              {filteredJobs.map((job, index) => (
                <RecommendedJobCard
                  key={job.id}
                  job={job}
                  rank={index + 1}
                  onViewDetail={() => handleViewDetail(job)}
                  onSubmit={() => navigate(`/expert/jobs/${job.id}/proposal`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedJobId && (
        <JobDetailModal
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </ExpertLayout>
  );
}

function RecommendedJobCard({ job, rank, onViewDetail, onSubmit }) {
  const visibleSkills = job.skills.slice(0, 5);
  const hiddenSkillCount = Math.max(job.skills.length - visibleSkills.length, 0);

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#151a22] transition hover:border-purple-400/40">
      <div className="grid grid-cols-1 lg:grid-cols-[128px_1fr_220px]">
        <div className="flex items-center gap-3 border-b border-white/10 bg-purple-400/10 p-4 lg:block lg:border-b-0 lg:border-r">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-purple-200">
              Rank #{rank}
            </p>

            <div className="mt-1 flex items-end gap-1">
              <p className="text-3xl font-black text-white">
                {Math.round(job.matchScore)}
              </p>
              <p className="mb-1 text-sm font-bold text-purple-200">%</p>
            </div>

            <p className="mt-1 text-xs font-bold text-purple-100">
              {getFitLabel(job.matchScore)}
            </p>
          </div>

          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/30 lg:mt-4 lg:w-full">
            <div
              className="h-full rounded-full bg-purple-300"
              style={{
                width: `${Math.max(0, Math.min(100, job.matchScore))}%`,
              }}
            />
          </div>
        </div>

        <div className="min-w-0 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge>{job.category}</Badge>
            <Badge tone="green">Open</Badge>
            {job.complexity && <Badge tone="purple">{job.complexity}</Badge>}
          </div>

          <h2 className="truncate text-base font-extrabold text-white">
            {job.title}
          </h2>

          <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-400">
            {job.description || "No description provided."}
          </p>

          <div className="mt-3 rounded-xl border border-purple-400/20 bg-purple-400/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-purple-200">
              <span className="material-symbols-outlined text-[16px]">
                auto_awesome
              </span>

              <p className="text-[11px] font-bold uppercase tracking-wider">
                Why recommended
              </p>
            </div>

            <p className="line-clamp-2 text-xs leading-5 text-purple-50">
              {job.matchReason}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {visibleSkills.length > 0 ? (
              <>
                {visibleSkills.map((skill) => {
                  const matched = job.matchedSkills
                    .map((item) => item.toLowerCase())
                    .includes(skill.toLowerCase());

                  return (
                    <span
                      key={skill}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        matched
                          ? "border-green-400/30 bg-green-400/10 text-green-300"
                          : "border-white/10 bg-white/[0.04] text-gray-300"
                      }`}
                    >
                      {matched ? "✓ " : ""}
                      {skill}
                    </span>
                  );
                })}

                {hiddenSkillCount > 0 && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-gray-500">
                    +{hiddenSkillCount} more
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-500">No skills listed</span>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 p-4 lg:border-l lg:border-t-0">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <InfoBox label="Budget" value={formatBudget(job.budgetMin, job.budgetMax)} />
            <InfoBox label="Timeline" value={formatDuration(job.durationDays)} />
            <InfoBox label="Deadline" value={formatDate(job.deadline)} />
          </div>

          <div className="mt-3 flex gap-2 lg:flex-col">
            <button
              type="button"
              onClick={onViewDetail}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-gray-300 transition hover:border-purple-400/50 hover:text-purple-300"
            >
              Detail
            </button>

            <button
              type="button"
              onClick={onSubmit}
              className="flex-1 rounded-lg border border-purple-400/60 bg-purple-400/10 px-3 py-2 text-sm font-bold text-purple-300 transition hover:bg-purple-400 hover:text-black"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function MiniStat({ label, value, tone = "purple" }) {
  const style =
    tone === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : tone === "cyan"
      ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
      : tone === "yellow"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : "border-purple-400/20 bg-purple-400/10 text-purple-300";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className={`mt-1 text-2xl font-black ${style.split(" ").at(-1)}`}>
        {value}
      </p>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function Badge({ children, tone = "cyan" }) {
  const style =
    tone === "green"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : tone === "purple"
      ? "border-purple-400/30 bg-purple-400/10 text-purple-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${style}`}
    >
      {children}
    </span>
  );
}

function EmptyState({ onBrowse }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-10 text-center">
      <span className="material-symbols-outlined mb-3 block text-4xl text-gray-500">
        manage_search
      </span>

      <h2 className="text-lg font-bold text-white">
        No recommended jobs found
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-400">
        We could not find strong matches right now. Try updating your profile or
        browse all active jobs.
      </p>

      <button
        type="button"
        onClick={onBrowse}
        className="mt-5 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
      >
        Browse All Jobs
      </button>
    </div>
  );
}

function normalizeProfile(profile) {
  return {
    skills: normalizeSkills(profile?.skills || profile?.Skills).map((item) =>
      item.toLowerCase()
    ),
    budgetMin: Number(
      profile?.expectedProjectBudgetMin ??
        profile?.ExpectedProjectBudgetMin ??
        0
    ),
    budgetMax: Number(
      profile?.expectedProjectBudgetMax ??
        profile?.ExpectedProjectBudgetMax ??
        0
    ),
    preferredDurationDays: Number(
      profile?.preferredProjectDurationDays ??
        profile?.PreferredProjectDurationDays ??
        0
    ),
  };
}

function normalizeRecommendedJob(job, profile) {
  const rawJob = job?.job || job?.Job || job;

  const normalized = {
    raw: job,
    id:
      rawJob?.id ||
      rawJob?.jobId ||
      rawJob?.JobId ||
      rawJob?.jobPostingId ||
      rawJob?.JobPostingId ||
      rawJob?.Id,
    title:
      rawJob?.title ||
      rawJob?.Title ||
      rawJob?.jobTitle ||
      rawJob?.JobTitle ||
      "Untitled Project",
    description:
      rawJob?.description ||
      rawJob?.Description ||
      rawJob?.jobDescription ||
      rawJob?.JobDescription ||
      "",
    category:
      rawJob?.projectType ||
      rawJob?.ProjectType ||
      rawJob?.category ||
      rawJob?.Category ||
      "General",
    status: String(rawJob?.status || rawJob?.Status || "OPEN").toUpperCase(),
    complexity: rawJob?.complexity || rawJob?.Complexity || "",
    skills: normalizeSkills(rawJob?.skills || rawJob?.Skills),
    budgetMin: Number(rawJob?.budgetMin ?? rawJob?.BudgetMin ?? 0),
    budgetMax: Number(rawJob?.budgetMax ?? rawJob?.BudgetMax ?? 0),
    durationDays: Number(
      rawJob?.durationDays ??
        rawJob?.DurationDays ??
        rawJob?.estimatedDurationDays ??
        rawJob?.EstimatedDurationDays ??
        0
    ),
    deadline: rawJob?.deadline || rawJob?.Deadline || null,
    createdAt: rawJob?.createdAt || rawJob?.CreatedAt || null,
  };

  const localMatch = calculateMatch(normalized, profile);

  const apiScore = normalizeApiScore(
    job?.matchScore ??
      job?.MatchScore ??
      job?.score ??
      job?.Score ??
      job?.matchingScore ??
      job?.MatchingScore
  );

  const apiReason =
    job?.matchReason ||
    job?.MatchReason ||
    job?.reason ||
    job?.Reason ||
    job?.recommendationReason ||
    job?.RecommendationReason ||
    "";

  const matchedSkills = normalizeSkills(
    job?.matchedSkills ||
      job?.MatchedSkills ||
      job?.matchingSkills ||
      job?.MatchingSkills
  );

  return {
    ...normalized,
    matchScore: apiScore > 0 ? apiScore : localMatch.score,
    matchReason: apiReason || localMatch.reason,
    matchedSkills: matchedSkills.length > 0 ? matchedSkills : localMatch.matchedSkills,
  };
}

function calculateMatch(job, profile) {
  const expertSkills = Array.isArray(profile?.skills) ? profile.skills : [];
  const jobSkills = job.skills.map((item) => item.toLowerCase());

  const matchedSkills = jobSkills.filter((skill) =>
    expertSkills.some(
      (expertSkill) =>
        expertSkill.includes(skill) || skill.includes(expertSkill)
    )
  );

  let score = 20;
  const reasons = [];

  if (jobSkills.length > 0 && matchedSkills.length > 0) {
    score += Math.min(
      60,
      Math.round((matchedSkills.length / jobSkills.length) * 60)
    );

    reasons.push(
      `Your profile matches ${matchedSkills.length} key skill${
        matchedSkills.length > 1 ? "s" : ""
      }: ${matchedSkills.slice(0, 4).join(", ")}.`
    );
  }

  if (jobSkills.length === 0) {
    score += 10;
    reasons.push("The client has not listed strict skill requirements.");
  }

  const budgetFits =
    profile?.budgetMin > 0 &&
    profile?.budgetMax > 0 &&
    job.budgetMax > 0 &&
    job.budgetMin <= profile.budgetMax &&
    job.budgetMax >= profile.budgetMin;

  if (budgetFits) {
    score += 12;
    reasons.push("The budget is close to your preferred project range.");
  }

  const durationFits =
    profile?.preferredDurationDays > 0 &&
    job.durationDays > 0 &&
    job.durationDays <= profile.preferredDurationDays;

  if (durationFits) {
    score += 8;
    reasons.push("The project timeline fits your preferred duration.");
  }

  if (reasons.length === 0) {
    reasons.push("This project may be relevant based on your profile.");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reason: reasons.join(" "),
    matchedSkills,
  };
}

function normalizeApiScore(value) {
  const number = Number(value || 0);

  if (Number.isNaN(number)) return 0;
  if (number > 0 && number <= 1) return Math.round(number * 100);

  return Math.max(0, Math.min(100, number));
}

function isSuitableJob(job) {
  return (
    Number(job.matchScore || 0) >= MIN_RECOMMENDED_SCORE ||
    (Array.isArray(job.matchedSkills) && job.matchedSkills.length > 0)
  );
}

function normalizeSkills(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.name || item?.Name || item?.skillName || item?.SkillName;
      })
      .filter(Boolean)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isActiveJob(job) {
  const status = String(job?.status || "").toUpperCase();

  return ["OPEN", "ACTIVE", "PUBLISHED", "AVAILABLE"].includes(status);
}

function getFitLabel(score) {
  const value = Number(score || 0);

  if (value >= 85) return "Excellent";
  if (value >= 70) return "Strong";
  if (value >= 55) return "Good fit";

  return "Possible";
}

function formatBudget(min, max) {
  const minNumber = Number(min || 0);
  const maxNumber = Number(max || 0);

  if (minNumber <= 0 && maxNumber <= 0) return "Negotiable";

  if (minNumber > 0 && maxNumber > 0) {
    return `${formatMoney(minNumber)} - ${formatMoney(maxNumber)}`;
  }

  if (maxNumber > 0) return `Up to ${formatMoney(maxNumber)}`;

  return `From ${formatMoney(minNumber)}`;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatDuration(days) {
  const number = Number(days || 0);

  if (!number || number <= 0) return "Flexible";
  if (number === 1) return "1 day";

  return `${number} days`;
}

function formatDate(value) {
  if (!value) return "Flexible";

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}