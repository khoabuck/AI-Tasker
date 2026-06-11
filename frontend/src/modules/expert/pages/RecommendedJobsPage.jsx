import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";
import expertProfileService from "../../../services/expertProfile.service";

export default function RecommendedJobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [matchFilter, setMatchFilter] = useState("all");
  const [sortBy, setSortBy] = useState("match-high");

  useEffect(() => {
    loadRecommendedJobs();
  }, []);

  const loadRecommendedJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const [profileData, openJobs] = await Promise.all([
        expertProfileService.getMyExpertProfile(),
        jobService.getOpenJobs(),
      ]);

      setProfile(profileData);
      setJobs(openJobs);
    } catch (err) {
      console.error("LOAD RECOMMENDED JOBS ERROR:", err?.response?.data || err);
      setError(
        "We could not load recommended jobs right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const expertSkills = useMemo(() => {
    return toArray(profile?.skills).map((skill) => skill.toLowerCase());
  }, [profile]);

  const recommendedJobs = useMemo(() => {
    let result = jobs.map((job) => calculateMatch(job, profile, expertSkills));

    if (matchFilter === "strong") {
      result = result.filter((item) => item.matchScore >= 70);
    }

    if (matchFilter === "medium") {
      result = result.filter(
        (item) => item.matchScore >= 40 && item.matchScore < 70
      );
    }

    if (matchFilter === "low") {
      result = result.filter((item) => item.matchScore < 40);
    }

    result = sortRecommendedJobs(result, sortBy);

    return result;
  }, [jobs, profile, expertSkills, matchFilter, sortBy]);

  const formatMoney = (value) => {
    const number = Number(value || 0);
    if (!number) return "Negotiable";
    return `$${number.toLocaleString("en-US")}`;
  };

  const formatBudgetRange = (job) => {
    const min = Number(job.budgetMin || 0);
    const max = Number(job.budgetMax || 0);

    if (!min && !max) return "Negotiable";
    if (min && !max) return `From ${formatMoney(min)}`;
    if (!min && max) return `Up to ${formatMoney(max)}`;

    return `${formatMoney(min)} - ${formatMoney(max)}`;
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          <div className="text-center">
            <span className="material-symbols-outlined mb-3 block text-5xl text-[#00F0FF]">
              auto_awesome
            </span>
            Finding recommended jobs...
          </div>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                AI Recommended Jobs
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Jobs matched to your profile
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                These recommendations are based on your skills, budget range,
                and preferred project duration.
              </p>
            </div>

            <button
              type="button"
              onClick={loadRecommendedJobs}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              <span className="material-symbols-outlined text-[18px]">
                refresh
              </span>
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!error && (
            <>
              <section className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Your matching profile
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      Skills used for matching:{" "}
                      {expertSkills.length > 0
                        ? expertSkills.join(", ")
                        : "No skills found in your profile."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/expert/profile/edit")}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                  >
                    Update Profile
                  </button>
                </div>
              </section>

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard
                  icon="auto_awesome"
                  label="Recommended"
                  value={recommendedJobs.length}
                  description="Matched jobs"
                />

                <StatCard
                  icon="star"
                  label="Strong Match"
                  value={
                    recommendedJobs.filter((job) => job.matchScore >= 70).length
                  }
                  description="70% match or higher"
                />

                <StatCard
                  icon="psychology"
                  label="Your Skills"
                  value={expertSkills.length}
                  description="Skills in your profile"
                />
              </div>

              <div className="mb-6 rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <select
                    value={matchFilter}
                    onChange={(event) => setMatchFilter(event.target.value)}
                    className="rounded-xl border border-white/10 bg-[#10151d] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                  >
                    <option value="all">All matches</option>
                    <option value="strong">Strong match: 70%+</option>
                    <option value="medium">Medium match: 40% - 69%</option>
                    <option value="low">Low match: below 40%</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="rounded-xl border border-white/10 bg-[#10151d] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                  >
                    <option value="match-high">Best match first</option>
                    <option value="budget-high">Budget high to low</option>
                    <option value="duration-short">Shortest duration</option>
                    <option value="newest">Newest first</option>
                  </select>
                </div>
              </div>

              {recommendedJobs.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                  <span className="material-symbols-outlined mb-4 block text-6xl text-gray-600">
                    search_off
                  </span>

                  <h2 className="text-xl font-bold text-white">
                    No recommended jobs found
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                    Try updating your expert profile skills or changing the
                    match filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {recommendedJobs.map((job) => (
                    <RecommendedJobCard
                      key={job.id}
                      job={job}
                      formatBudgetRange={formatBudgetRange}
                      onViewDetail={() => navigate(`/expert/jobs/${job.id}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function calculateMatch(job, profile, expertSkills) {
  const jobSkills = (job.skills || []).map((skill) =>
    String(skill).toLowerCase()
  );

  const matchedSkills = jobSkills.filter((skill) =>
    expertSkills.some(
      (expertSkill) =>
        expertSkill.includes(skill) || skill.includes(expertSkill)
    )
  );

  const skillScore =
    jobSkills.length > 0
      ? Math.round((matchedSkills.length / jobSkills.length) * 70)
      : 20;

  const budgetMin = Number(job.budgetMin || 0);
  const budgetMax = Number(job.budgetMax || 0);
  const expertMin = Number(profile?.expectedProjectBudgetMin || 0);
  const expertMax = Number(profile?.expectedProjectBudgetMax || 0);

  let budgetScore = 0;

  if (!budgetMin && !budgetMax) {
    budgetScore = 10;
  } else if (!expertMin && !expertMax) {
    budgetScore = 10;
  } else {
    const jobBudget = budgetMax || budgetMin;
    if (jobBudget >= expertMin && (!expertMax || jobBudget <= expertMax)) {
      budgetScore = 15;
    }
  }

  const jobDuration = Number(job.durationDays || 0);
  const expertDuration = Number(profile?.preferredProjectDurationDays || 0);

  let durationScore = 0;

  if (!jobDuration || !expertDuration) {
    durationScore = 8;
  } else if (jobDuration <= expertDuration) {
    durationScore = 15;
  } else if (jobDuration <= expertDuration * 1.5) {
    durationScore = 8;
  }

  const matchScore = Math.min(100, skillScore + budgetScore + durationScore);

  return {
    ...job,
    matchScore,
    matchedSkills,
    matchReason: buildMatchReason(matchScore, matchedSkills),
  };
}

function buildMatchReason(matchScore, matchedSkills) {
  if (matchScore >= 70) {
    return "Strong match based on your skills and preferences.";
  }

  if (matchedSkills.length > 0) {
    return "Some required skills match your expert profile.";
  }

  return "This job is available, but it has limited match with your current profile.";
}

function sortRecommendedJobs(jobs, sortBy) {
  const result = [...jobs];

  if (sortBy === "budget-high") {
    return result.sort(
      (a, b) => Number(b.budgetMax || 0) - Number(a.budgetMax || 0)
    );
  }

  if (sortBy === "duration-short") {
    return result.sort(
      (a, b) => Number(a.durationDays || 9999) - Number(b.durationDays || 9999)
    );
  }

  if (sortBy === "newest") {
    return result.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  return result.sort((a, b) => b.matchScore - a.matchScore);
}

function toArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function StatCard({ icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <span className="material-symbols-outlined text-[26px]">{icon}</span>
        </div>

        <div>
          <p className="text-2xl font-extrabold text-white">{value}</p>
          <p className="text-sm font-bold text-gray-300">{label}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function RecommendedJobCard({ job, formatBudgetRange, onViewDetail }) {
  return (
    <article className="group rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)] transition hover:border-cyan-400/30 hover:bg-[#171e29]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              {job.matchScore}% Match
            </span>

            <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-green-300">
              {job.status || "OPEN"}
            </span>
          </div>

          <h2 className="line-clamp-2 text-xl font-extrabold leading-snug text-white">
            {job.title}
          </h2>

          <p className="mt-2 text-sm text-gray-500">{job.matchReason}</p>
        </div>

        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <span className="text-lg font-extrabold">{job.matchScore}%</span>
        </div>
      </div>

      <p className="line-clamp-3 text-sm leading-6 text-gray-400">
        {job.description}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SmallInfo icon="payments" label="Budget" value={formatBudgetRange(job)} />

        <SmallInfo
          icon="calendar_month"
          label="Duration"
          value={job.durationDays ? `${job.durationDays} days` : "Flexible"}
        />
      </div>

      {job.matchedSkills.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Matched skills
          </p>

          <div className="flex flex-wrap gap-2">
            {job.matchedSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onViewDetail}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          <span className="material-symbols-outlined text-[18px]">
            visibility
          </span>
          View Detail
        </button>
      </div>
    </article>
  );
}

function SmallInfo({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-1 flex items-center gap-2 text-gray-500">
        <span className="material-symbols-outlined text-[17px]">{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}