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

  const reviewStatus = getReviewStatus(profile);
  const userStatus = String(profile?.userStatus || user?.status || "").toUpperCase();

  const isActive = userStatus === "ACTIVE" || reviewStatus === "APPROVED";

  const canResubmit =
    reviewStatus === "NEEDS_CORRECTION" || reviewStatus === "REJECTED";

  const displayName = profile?.fullName || user?.fullName || user?.email || "Expert";

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
          <div className="mx-auto max-w-4xl rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-yellow-200">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
              Expert account is not active
            </p>

            <h1 className="text-3xl font-extrabold text-white">
              Your profile must be approved before using the expert dashboard.
            </h1>

            <p className="mt-4 text-sm leading-7">
              Current account status: <b>{userStatus || "UNKNOWN"}</b>. Review
              status: <b>{reviewStatus || "UNKNOWN"}</b>.
            </p>

            {profile?.profileReviewNote && (
              <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6">
                <p className="font-bold">Review note</p>
                <p className="mt-1">{profile.profileReviewNote}</p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
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
          </div>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Expert Dashboard
            </p>

            <h1 className="text-3xl font-extrabold text-white md:text-5xl">
              Welcome back, {displayName}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
              Your expert account is active. You can browse jobs, submit
              proposals, and manage your work.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <StatusBadge status={userStatus} />
              <StatusBadge status={reviewStatus} />

              {profile?.availableForWork && <StatusBadge status="AVAILABLE" />}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/expert/jobs"
                className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Browse Jobs
              </Link>

              <Link
                to="/expert/recommended-jobs"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
              >
                AI Recommended Jobs
              </Link>
            </div>
          </section>

          {(profileError || jobsError) && (
            <div className="mb-6 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-4 text-sm text-yellow-200">
              {profileError || jobsError}
            </div>
          )}

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Open Jobs" value={openJobs.length} />
            <StatCard label="AI Matches" value={recommendedJobs.length} />
            <StatCard label="Skills" value={expertSkills.length} />
            <StatCard label="Profile Score" value={profile?.profileScore ?? 0} />
          </div>

          <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-white">
                Top Recommended Jobs
              </h2>

              <Link
                to="/expert/jobs"
                className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
              >
                View all
              </Link>
            </div>

            {recommendedJobs.length === 0 ? (
              <p className="text-sm text-gray-500">
                No jobs available right now.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {recommendedJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/expert/jobs/${job.id}`}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/40"
                  >
                    <p className="font-bold text-white">{job.title}</p>

                    <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                      {job.description}
                    </p>

                    <p className="mt-3 text-xs font-bold text-cyan-300">
                      Match: {job.matchScore}%
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </ExpertLayout>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "UNKNOWN").toUpperCase();

  const style =
    value === "ACTIVE" || value === "APPROVED" || value === "AVAILABLE"
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

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function calculateMatchScore(job, profile, expertSkills) {
  if (!profile || expertSkills.length === 0) return 0;

  const jobSkills = (job.skills || []).map((skill) =>
    String(skill).toLowerCase()
  );

  if (jobSkills.length === 0) return 0;

  const matched = jobSkills.filter((skill) => expertSkills.includes(skill));

  return Math.min(100, Math.round((matched.length / jobSkills.length) * 100));
}