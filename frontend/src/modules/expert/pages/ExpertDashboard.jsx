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
        updateLocalUserStatus(profileResult.value?.userStatus);
      } else {
        console.error(
          "LOAD EXPERT PROFILE ERROR:",
          profileResult.reason?.response?.data || profileResult.reason
        );

        setProfileError("Your profile information could not be loaded.");
      }

      if (jobsResult.status === "fulfilled") {
        setOpenJobs(Array.isArray(jobsResult.value) ? jobsResult.value : []);
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

  const reviewStatus = getReviewStatus(profile);
  const userStatus = String(
    profile?.userStatus || profile?.UserStatus || user?.status || ""
  ).toUpperCase();

  const isActive = userStatus === "ACTIVE" || reviewStatus === "APPROVED";

  const canResubmit =
    reviewStatus === "NEEDS_CORRECTION" || reviewStatus === "REJECTED";

  const displayName =
    profile?.fullName ||
    profile?.FullName ||
    user?.fullName ||
    user?.email ||
    "Expert";

  const professionalTitle =
    profile?.professionalTitle ||
    profile?.ProfessionalTitle ||
    "AI Expert";

  const expertSkills = useMemo(() => {
    return toArray(profile?.skills || profile?.Skills).map((skill) =>
      String(skill).toLowerCase()
    );
  }, [profile]);

  const recommendedJobs = useMemo(() => {
    return openJobs
      .map((job) => ({
        ...job,
        id: getJobId(job),
        title: getJobTitle(job),
        description: getJobDescription(job),
        skills: normalizeSkills(job?.skills || job?.Skills),
        matchScore: calculateMatchScore(job, profile, expertSkills),
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  }, [openJobs, profile, expertSkills]);

  const profileReadiness = useMemo(() => {
    return calculateProfileReadiness(profile);
  }, [profile]);

  const budgetRange = formatBudget(
    profile?.expectedProjectBudgetMin ?? profile?.ExpectedProjectBudgetMin,
    profile?.expectedProjectBudgetMax ?? profile?.ExpectedProjectBudgetMax
  );

  const availableForWork =
    profile?.availableForWork ?? profile?.AvailableForWork ?? false;

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading expert dashboard...
        </div>
      </ExpertLayout>
    );
  }

  if (!isActive) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <section className="rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-300">
                <span className="material-symbols-outlined text-3xl">
                  verified_user
                </span>
              </div>

              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
                Expert account is not active
              </p>

              <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-white md:text-4xl">
                Your profile must be approved before using the expert dashboard.
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-yellow-100/90">
                Current account status: <b>{userStatus || "UNKNOWN"}</b>.
                Review status: <b>{reviewStatus || "UNKNOWN"}</b>.
              </p>

              {profile?.profileReviewNote && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-yellow-50">
                  <p className="font-bold text-white">Review note</p>
                  <p className="mt-2">{profile.profileReviewNote}</p>
                </div>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                {canResubmit ? (
                  <Link
                    to="/expert/profile/edit"
                    className="rounded-xl border border-yellow-300/50 bg-yellow-300/10 px-5 py-3 text-sm font-bold text-yellow-200 transition hover:bg-yellow-300 hover:text-black"
                  >
                    Edit Profile Again
                  </Link>
                ) : (
                  <Link
                    to="/expert/setup-profile"
                    className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                  >
                    Setup Profile
                  </Link>
                )}

                <Link
                  to="/expert/profile"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                >
                  View Profile
                </Link>
              </div>
            </section>
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
              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute bottom-0 right-24 h-40 w-40 rounded-full bg-purple-400/10 blur-3xl" />

              <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1fr_330px] lg:items-center">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                    Expert Dashboard
                  </p>

                  <h1 className="max-w-4xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
                    Welcome back, {displayName}
                  </h1>

                  <p className="mt-3 text-base font-semibold text-cyan-200">
                    {professionalTitle}
                  </p>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400">
                    Manage your opportunities, proposals, active projects, and
                    profile readiness from one workspace.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <StatusBadge status={userStatus || "ACTIVE"} />
                    <StatusBadge status={reviewStatus || "APPROVED"} />

                    {availableForWork ? (
                      <StatusBadge status="AVAILABLE" />
                    ) : (
                      <StatusBadge status="NOT AVAILABLE" tone="yellow" />
                    )}
                  </div>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      to="/expert/jobs"
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        work
                      </span>
                      Browse Jobs
                    </Link>

                    <Link
                      to="/expert/recommended-jobs"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        auto_awesome
                      </span>
                      AI Recommended Jobs
                    </Link>

                    <Link
                      to="/expert/profile/update"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        manage_accounts
                      </span>
                      Improve Profile
                    </Link>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500">
                        Profile Readiness
                      </p>

                      <p className="mt-1 text-3xl font-extrabold text-white">
                        {profileReadiness}%
                      </p>
                    </div>

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                      <span className="material-symbols-outlined text-3xl">
                        monitoring
                      </span>
                    </div>
                  </div>

                  <ProgressBar value={profileReadiness} />

                  <div className="mt-5 grid grid-cols-1 gap-3">
                    <QuickProfileInfo
                      icon="payments"
                      label="Preferred Budget"
                      value={budgetRange}
                    />

                    <QuickProfileInfo
                      icon="schedule"
                      label="Preferred Duration"
                      value={
                        profile?.preferredProjectDurationDays
                          ? `${profile.preferredProjectDurationDays} days`
                          : "Flexible"
                      }
                    />

                    <QuickProfileInfo
                      icon="psychology"
                      label="Skills"
                      value={`${expertSkills.length} skill(s)`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {(profileError || jobsError) && (
            <div className="mb-6 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-4 text-sm text-yellow-200">
              {profileError || jobsError}
            </div>
          )}

          <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="work"
              label="Open Opportunities"
              value={openJobs.length}
              description="Jobs currently available"
              tone="cyan"
            />

            <StatCard
              icon="auto_awesome"
              label="Best Matches"
              value={recommendedJobs.length}
              description="Jobs matching your skills"
              tone="purple"
            />

            <StatCard
              icon="psychology"
              label="Skill Tags"
              value={expertSkills.length}
              description="Skills shown on profile"
              tone="green"
            />

            <StatCard
              icon="verified"
              label="Profile Readiness"
              value={`${profileReadiness}%`}
              description="Profile completion quality"
              tone="yellow"
            />
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
            <section className="rounded-3xl border border-white/10 bg-[#151a22] p-6">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-white">
                    Recommended Opportunities
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Jobs ranked by skill match with your expert profile.
                  </p>
                </div>

                <Link
                  to="/expert/recommended-jobs"
                  className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
                >
                  View all
                </Link>
              </div>

              {recommendedJobs.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {recommendedJobs.map((job) => (
                    <RecommendedJobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-[#151a22] p-6">
                <h2 className="text-xl font-extrabold text-white">
                  Quick Actions
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Common expert actions for faster workflow.
                </p>

                <div className="mt-5 space-y-3">
                  <QuickAction
                    to="/expert/proposals"
                    icon="description"
                    title="My Proposals"
                    description="Track submitted and accepted proposals"
                  />

                  <QuickAction
                    to="/expert/projects"
                    icon="folder_managed"
                    title="My Projects"
                    description="Manage current project work"
                  />

                  <QuickAction
                    to="/expert/wallet"
                    icon="account_balance_wallet"
                    title="Wallet"
                    description="View earnings and payout requests"
                  />

                  <QuickAction
                    to="/expert/reviews"
                    icon="reviews"
                    title="Reviews"
                    description="See client feedback and ratings"
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                  <span className="material-symbols-outlined text-3xl">
                    tips_and_updates
                  </span>
                </div>

                <h2 className="text-lg font-extrabold text-white">
                  Pro tip
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Keep your skills, portfolio, and certificates updated. A
                  complete profile improves your chance of matching with better
                  projects.
                </p>

                <Link
                  to="/expert/profile/update"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  Update Profile
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function StatCard({ icon, label, value, description, tone }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : tone === "yellow"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : tone === "purple"
      ? "border-purple-400/20 bg-purple-400/10 text-purple-300"
      : "border-cyan-400/20 bg-cyan-400/10 text-[#00F0FF]";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-5 transition hover:border-cyan-400/30">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${toneClass}`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>

      <p className="mt-2 text-xs leading-5 text-gray-500">{description}</p>
    </div>
  );
}

function StatusBadge({ status, tone }) {
  const value = String(status || "UNKNOWN").toUpperCase();

  const style =
    tone === "yellow"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : value === "ACTIVE" || value === "APPROVED" || value === "AVAILABLE"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {value}
    </span>
  );
}

function ProgressBar({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
      <div
        className="h-full rounded-full bg-cyan-400"
        style={{
          width: `${safeValue}%`,
        }}
      />
    </div>
  );
}

function QuickProfileInfo({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>

      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
        <p className="truncate text-sm font-bold text-white">{value || "N/A"}</p>
      </div>
    </div>
  );
}

function RecommendedJobCard({ job }) {
  return (
    <Link
      to={`/expert/jobs/${job.id}`}
      className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/40 hover:bg-white/[0.05]"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              Match {job.matchScore}%
            </span>

            {job.category && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {job.category}
              </span>
            )}
          </div>

          <h3 className="text-lg font-extrabold text-white group-hover:text-cyan-200">
            {job.title || "Untitled Job"}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
            {job.description || "No job description provided."}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Budget
          </p>

          <p className="mt-1 font-bold text-white">
            {formatBudget(job.budgetMin, job.budgetMax)}
          </p>
        </div>
      </div>

      {job.skills?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {job.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-gray-400"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

function QuickAction({ to, icon, title, description }) {
  return (
    <Link
      to={to}
      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/40 hover:bg-white/[0.05]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>

      <div>
        <p className="font-bold text-white">{title}</p>

        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        work_off
      </span>

      <h3 className="font-bold text-white">No recommended jobs yet</h3>

      <p className="mt-2 text-sm text-gray-500">
        New opportunities will appear here when open jobs match your skills.
      </p>
    </div>
  );
}

function getReviewStatus(profile) {
  return String(
    profile?.profileReviewStatus || profile?.ProfileReviewStatus || ""
  )
    .trim()
    .toUpperCase();
}

function updateLocalUserStatus(status) {
  if (!status) return;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...user,
        role: "EXPERT",
        status,
      })
    );
  } catch (error) {
    console.error("UPDATE LOCAL USER STATUS ERROR:", error);
  }
}

function calculateProfileReadiness(profile) {
  if (!profile) return 0;

  const checks = [
    profile.fullName || profile.FullName,
    profile.professionalTitle || profile.ProfessionalTitle,
    profile.bio || profile.Bio,
    profile.skills || profile.Skills,
    profile.yearsOfExperience ?? profile.YearsOfExperience,
    profile.portfolioUrl || profile.PortfolioUrl,
    profile.linkedInUrl || profile.LinkedInUrl || profile.gitHubUrl || profile.GitHubUrl,
    profile.expectedProjectBudgetMin ?? profile.ExpectedProjectBudgetMin,
    profile.expectedProjectBudgetMax ?? profile.ExpectedProjectBudgetMax,
    profile.preferredProjectDurationDays ?? profile.PreferredProjectDurationDays,
  ];

  const completed = checks.filter((item) => {
    if (typeof item === "number") return item >= 0;
    return String(item || "").trim().length > 0;
  }).length;

  return Math.round((completed / checks.length) * 100);
}

function toArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.name || item?.Name || item?.skillName || item?.SkillName;
      })
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSkills(value) {
  return toArray(value).map((skill) => String(skill).trim()).filter(Boolean);
}

function getJobId(job) {
  return job?.id || job?.jobId || job?.JobId || job?.Id || job?.ID;
}

function getJobTitle(job) {
  return job?.title || job?.Title || job?.jobTitle || job?.JobTitle || "Untitled Job";
}

function getJobDescription(job) {
  return (
    job?.description ||
    job?.Description ||
    job?.jobDescription ||
    job?.JobDescription ||
    ""
  );
}

function calculateMatchScore(job, profile, expertSkills) {
  if (!profile || expertSkills.length === 0) return 0;

  const jobSkills = normalizeSkills(job?.skills || job?.Skills).map((skill) =>
    String(skill).toLowerCase()
  );

  if (jobSkills.length === 0) return 0;

  const matched = jobSkills.filter((skill) => expertSkills.includes(skill));

  return Math.min(100, Math.round((matched.length / jobSkills.length) * 100));
}

function formatBudget(min, max) {
  const minValue = Number(min || 0);
  const maxValue = Number(max || 0);

  if (!minValue && !maxValue) return "Negotiable";
  if (minValue && !maxValue) return `From $${minValue}`;
  if (!minValue && maxValue) return `Up to $${maxValue}`;

  return `$${minValue} - $${maxValue}`;
}