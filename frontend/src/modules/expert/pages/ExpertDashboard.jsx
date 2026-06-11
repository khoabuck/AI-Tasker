import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import { useAuth } from "../../../context/AuthContext";
import expertProfileService from "../../../services/expertProfile.service";
import jobService from "../../../services/job.service";

export default function ExpertDashboard() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [openJobs, setOpenJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [jobsError, setJobsError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setProfileError("");
      setJobsError("");

      const [profileResult, jobsResult] = await Promise.allSettled([
        expertProfileService.getMyExpertProfile(),
        jobService.getOpenJobs(),
      ]);

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value);
      } else {
        console.error(
          "LOAD EXPERT PROFILE ERROR:",
          profileResult.reason?.response?.data || profileResult.reason
        );
        setProfileError("Your profile information could not be loaded.");
      }

      if (jobsResult.status === "fulfilled") {
        setOpenJobs(jobsResult.value || []);
      } else {
        console.error(
          "LOAD OPEN JOBS ERROR:",
          jobsResult.reason?.response?.data || jobsResult.reason
        );
        setJobsError("Open jobs could not be loaded.");
      }
    } finally {
      setLoading(false);
    }
  };

  const displayName =
    profile?.fullName ||
    profile?.displayName ||
    profile?.userFullName ||
    profile?.expertName ||
    profile?.name ||
    user?.fullName ||
    user?.displayName ||
    user?.name ||
    user?.userName ||
    user?.email ||
    "Expert";

  const profileStatus = String(
    profile?.status || profile?.profileStatus || user?.status || ""
  ).toUpperCase();

  const expertSkills = useMemo(() => {
    return toArray(profile?.skills).map((skill) => skill.toLowerCase());
  }, [profile]);

  const recommendedJobs = useMemo(() => {
    return openJobs
      .map((job) => ({
        ...job,
        matchScore: calculateMatchScore(job, profile, expertSkills),
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  }, [openJobs, profile, expertSkills]);

  const profileCompletion = useMemo(() => {
    return calculateProfileCompletion(profile);
  }, [profile]);

  const dashboardStats = {
    openJobs: openJobs.length,
    recommendedJobs: openJobs.filter(
      (job) => calculateMatchScore(job, profile, expertSkills) >= 60
    ).length,
    skills: expertSkills.length,
    profileCompletion,
  };

  const highBudgetJobs = openJobs.filter(
    (job) => Number(job.budgetMax || 0) >= 500
  ).length;

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          <div className="text-center">
            <span className="material-symbols-outlined mb-3 block text-5xl text-[#00F0FF]">
              dashboard
            </span>
            Loading expert dashboard...
          </div>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="relative p-6 md:p-8">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute bottom-0 left-20 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                    Expert Dashboard
                  </p>

                  <h1 className="text-3xl font-extrabold leading-tight text-white md:text-5xl">
                    Welcome back, {displayName}
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 md:text-base">
                    Manage your profile, discover suitable jobs, send proposals,
                    and track your expert work from one place.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <StatusBadge status={profileStatus} />

                    {profile?.availableForWork ? (
                      <span className="rounded-full border border-green-400/30 bg-green-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-green-300">
                        Available for work
                      </span>
                    ) : (
                      <span className="rounded-full border border-red-400/30 bg-red-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-300">
                        Not available
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/expert/jobs"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      search
                    </span>
                    Find Jobs
                  </Link>

                  <Link
                    to="/expert/recommended-jobs"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      auto_awesome
                    </span>
                    AI Jobs
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {(profileError || jobsError) && (
            <div className="mb-6 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-4 text-sm text-yellow-200">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-[22px]">
                  warning
                </span>

                <div>
                  <p className="font-bold">Some dashboard data is unavailable</p>
                  <p className="mt-1 leading-6">
                    {profileError || jobsError} You can still use the available
                    dashboard actions.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="work"
              label="Open Jobs"
              value={dashboardStats.openJobs}
              description="Jobs you can explore"
            />

            <StatCard
              icon="auto_awesome"
              label="AI Matches"
              value={dashboardStats.recommendedJobs}
              description="Jobs matched to your profile"
            />

            <StatCard
              icon="psychology"
              label="Your Skills"
              value={dashboardStats.skills}
              description="Skills used for matching"
            />

            <StatCard
              icon="verified"
              label="Profile"
              value={`${dashboardStats.profileCompletion}%`}
              description="Profile completion"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
            <main className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-white">
                      Recommended Jobs
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      Jobs ranked by skill match, budget fit, and preferred
                      duration.
                    </p>
                  </div>

                  <Link
                    to="/expert/recommended-jobs"
                    className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
                  >
                    View all
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </Link>
                </div>

                {recommendedJobs.length === 0 ? (
                  <EmptyPanel
                    icon="search_off"
                    title="No recommended jobs yet"
                    message="Update your skills in your profile or check open jobs manually."
                    actionText="Find Jobs"
                    actionPath="/expert/jobs"
                  />
                ) : (
                  <div className="space-y-4">
                    {recommendedJobs.map((job, index) => (
                      <RecommendedJobItem
                        key={job.id || `${job.title}-${index}`}
                        job={job}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                <div className="mb-5">
                  <h2 className="text-xl font-extrabold text-white">
                    Quick Actions
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Common actions for your expert workflow.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <QuickAction
                    icon="person"
                    title="Edit Profile"
                    description="Update your title, skills, certificates, and public links."
                    to="/expert/profile/edit"
                  />

                  <QuickAction
                    icon="search"
                    title="Find Jobs"
                    description="Search open jobs manually using filters."
                    to="/expert/jobs"
                  />

                  <QuickAction
                    icon="description"
                    title="My Proposals"
                    description="Track proposals you already submitted."
                    to="/expert/proposals"
                  />

                  <QuickAction
                    icon="folder_managed"
                    title="My Projects"
                    description="View active and completed expert projects."
                    to="/expert/projects"
                  />
                </div>
              </section>
            </main>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-white">
                    Profile Strength
                  </h2>

                  <span className="text-sm font-bold text-cyan-300">
                    {profileCompletion}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>

                <div className="mt-5 space-y-3">
                  <ChecklistItem
                    done={Boolean(profile?.avatarUrl)}
                    text="Profile avatar"
                  />
                  <ChecklistItem
                    done={Boolean(profile?.professionalTitle)}
                    text="Professional title"
                  />
                  <ChecklistItem
                    done={Boolean(profile?.bio)}
                    text="Bio introduction"
                  />
                  <ChecklistItem done={expertSkills.length > 0} text="Skills" />
                  <ChecklistItem
                    done={hasAnyPublicLink(profile)}
                    text="Public profile link"
                  />
                  <ChecklistItem
                    done={(profile?.certificates || []).length > 0}
                    text="Certificates"
                  />
                </div>

                <Link
                  to="/expert/profile/edit"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  Improve Profile
                </Link>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                <h2 className="text-lg font-extrabold text-white">
                  Market Snapshot
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Quick view of current open jobs.
                </p>

                <div className="mt-5 space-y-4">
                  <MiniMetric
                    icon="payments"
                    label="High budget jobs"
                    value={highBudgetJobs}
                  />

                  <MiniMetric
                    icon="bolt"
                    label="Short timeline jobs"
                    value={
                      openJobs.filter(
                        (job) =>
                          Number(job.durationDays || 0) > 0 &&
                          Number(job.durationDays || 0) <= 7
                      ).length
                    }
                  />

                  <MiniMetric
                    icon="category"
                    label="Categories"
                    value={
                      new Set(
                        openJobs
                          .map((job) => job.category)
                          .filter(Boolean)
                          .map((item) => String(item).toLowerCase())
                      ).size
                    }
                  />
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
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

function StatusBadge({ status }) {
  if (status === "NEEDS_CORRECTION") {
    return (
      <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-yellow-300">
        Needs correction
      </span>
    );
  }

  if (status === "PENDING_REVIEW" || status === "PENDING_PROFILE") {
    return (
      <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-yellow-300">
        Under review
      </span>
    );
  }

  if (status === "ACTIVE" || status === "APPROVED") {
    return (
      <span className="rounded-full border border-green-400/30 bg-green-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-green-300">
        Active
      </span>
    );
  }

  return (
    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
      Expert
    </span>
  );
}

function RecommendedJobItem({ job }) {
  return (
    <Link
      to={`/expert/jobs/${job.id}`}
      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/30 hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              {job.matchScore}% Match
            </span>

            <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-green-300">
              {job.status || "OPEN"}
            </span>
          </div>

          <h3 className="line-clamp-2 text-lg font-extrabold leading-snug text-white">
            {job.title}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
            {job.description}
          </p>
        </div>

        <span className="material-symbols-outlined text-cyan-300">
          arrow_forward
        </span>
      </div>
    </Link>
  );
}

function QuickAction({ icon, title, description, to }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/30 hover:bg-white/[0.06]"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined text-[26px]">{icon}</span>
      </div>

      <h3 className="font-extrabold text-white">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
    </Link>
  );
}

function ChecklistItem({ done, text }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`material-symbols-outlined text-[20px] ${
          done ? "text-green-300" : "text-gray-600"
        }`}
      >
        {done ? "check_circle" : "radio_button_unchecked"}
      </span>

      <span className={done ? "text-sm text-gray-300" : "text-sm text-gray-500"}>
        {text}
      </span>
    </div>
  );
}

function MiniMetric({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[20px] text-cyan-300">
          {icon}
        </span>

        <span className="text-sm text-gray-400">{label}</span>
      </div>

      <span className="font-extrabold text-white">{value}</span>
    </div>
  );
}

function EmptyPanel({ icon, title, message, actionText, actionPath }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-600">
        {icon}
      </span>

      <h3 className="font-extrabold text-white">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {message}
      </p>

      {actionText && actionPath && (
        <Link
          to={actionPath}
          className="mt-5 inline-flex rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          {actionText}
        </Link>
      )}
    </div>
  );
}

function calculateProfileCompletion(profile) {
  if (!profile) return 0;

  const checks = [
    Boolean(profile.avatarUrl),
    Boolean(profile.professionalTitle),
    Boolean(profile.bio),
    Boolean(profile.skills),
    Boolean(profile.yearsOfExperience || profile.yearsOfExperience === 0),
    Boolean(
      profile.expectedProjectBudgetMin ||
        profile.expectedProjectBudgetMin === 0
    ),
    Boolean(
      profile.expectedProjectBudgetMax ||
        profile.expectedProjectBudgetMax === 0
    ),
    Boolean(profile.preferredProjectDurationDays),
    hasAnyPublicLink(profile),
    Boolean((profile.certificates || []).length),
  ];

  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}

function hasAnyPublicLink(profile) {
  return Boolean(
    profile?.portfolioUrl || profile?.linkedInUrl || profile?.gitHubUrl
  );
}

function calculateMatchScore(job, profile, expertSkills) {
  if (!job) return 0;

  const jobSkills = toArray(job.skills).map((skill) => skill.toLowerCase());

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

  return Math.min(100, skillScore + budgetScore + durationScore);
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