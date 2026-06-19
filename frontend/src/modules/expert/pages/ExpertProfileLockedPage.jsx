import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../../services/auth.service";
import expertProfileService from "../../../services/expertProfile.service";
import { useAuth } from "../../../context/AuthContext";

const MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS = 5;

export default function ExpertProfileLockedPage() {
  const navigate = useNavigate();
  const { handleLogout: logoutContext } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const reviewInfo = useMemo(() => extractReviewInfo(profile), [profile]);

  const locked = isExpertProfileCurrentlyLocked(reviewInfo);
  const lockExpired = isLockExpired(reviewInfo.lockedUntil);
  const remainingAttempts = getRemainingAttempts(reviewInfo.submissionCount);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await expertProfileService.getMyExpertProfile();
      setProfile(data);

      const nextInfo = extractReviewInfo(data);

      if (isExpertProfileCurrentlyLocked(nextInfo)) {
        updateLocalUserStatus("EXPERT_PROFILE_LOCKED");
        return;
      }

      if (
        nextInfo.userStatus === "ACTIVE" ||
        nextInfo.reviewStatus === "APPROVED"
      ) {
        updateLocalUserStatus("ACTIVE");
        navigate("/expert/dashboard", { replace: true });
        return;
      }

      updateLocalUserStatus("PENDING_PROFILE");
      navigate("/expert/profile/edit", { replace: true });
    } catch (err) {
      console.error("LOAD LOCKED PROFILE ERROR:", err?.response?.data || err);

      if (err?.response?.status === 404) {
        updateLocalUserStatus("PENDING_PROFILE");
        navigate("/expert/setup-profile", { replace: true });
        return;
      }

      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  };

  const handleGoResubmit = () => {
    updateLocalUserStatus("PENDING_PROFILE");
    navigate("/expert/profile/edit", { replace: true });
  };

  const handleLogout = async () => {
    try {
      if (typeof logoutContext === "function") {
        logoutContext();
      }
    } catch (error) {
      console.error("AUTH CONTEXT LOGOUT ERROR:", error);
    }

    try {
      if (typeof authService.logout === "function") {
        await authService.logout();
      }
    } catch (error) {
      console.error("AUTH SERVICE LOGOUT ERROR:", error);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("role");

    sessionStorage.clear();

    window.location.replace("/login");
  };

  if (loading) {
    return (
      <LockedShell onLogout={handleLogout}>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading locked profile status...
        </div>
      </LockedShell>
    );
  }

  return (
    <LockedShell onLogout={handleLogout}>
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-5 py-10 md:px-8">
        <section className="w-full max-w-2xl rounded-3xl border border-red-500/30 bg-[#151a22] p-6 text-center shadow-[0_30px_120px_rgba(0,0,0,0.55)] md:p-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-red-400/40 bg-red-400/10">
            <span className="material-symbols-outlined text-5xl text-red-300">
              lock
            </span>
          </div>

          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-red-300">
            Expert Profile Locked
          </p>

          <h1 className="text-3xl font-black text-white md:text-4xl">
            Your profile review is temporarily locked
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-400">
            Backend has temporarily locked your expert profile review. Please
            wait until the lock time expires before trying again.
          </p>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-left text-sm text-red-300">
              <p className="font-bold">Cannot refresh profile status</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoCard
              label="Review submissions used"
              value={`${reviewInfo.submissionCount}/${MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS}`}
              icon="counter_5"
            />

            <InfoCard
              label="Attempts remaining"
              value={`${remainingAttempts}/${MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS}`}
              icon="published_with_changes"
            />

            <InfoCard
              label="Review status"
              value={reviewInfo.reviewStatus || "UNKNOWN"}
              icon="fact_check"
            />

            <InfoCard
              label="Account status"
              value={reviewInfo.userStatus || "UNKNOWN"}
              icon="manage_accounts"
            />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-left">
            <p className="font-bold text-white">Locked time from backend</p>

            {reviewInfo.lockedUntil ? (
              <>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Locked until:{" "}
                  <span className="font-bold text-red-200">
                    {formatDateTime(reviewInfo.lockedUntil)}
                  </span>
                </p>

                {locked && (
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Please wait until this time before resubmitting.
                  </p>
                )}

                {lockExpired && (
                  <p className="mt-2 text-sm leading-6 text-green-300">
                    The lock time has expired. You can resubmit your profile
                    again.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Backend has not returned a locked time. Press Refresh Status or
                contact admin.
              </p>
            )}
          </div>

          {getProfileReviewNote(profile) && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-left">
              <p className="font-bold text-white">Review note</p>

              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-400">
                {getProfileReviewNote(profile)}
              </p>
            </div>
          )}

          {getMissingInformation(profile) && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-left">
              <p className="font-bold text-white">Missing information</p>

              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-400">
                {getMissingInformation(profile)}
              </p>
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5 text-left">
            <p className="font-bold text-white">What should you do now?</p>

            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-400">
              <li>• Wait until the backend lock time expires.</li>
              <li>• Prepare stronger proof links, certificates, and portfolio.</li>
              <li>• After unlock, resubmit your expert profile carefully.</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-6 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh Status"}
            </button>

            {lockExpired && (
              <button
                type="button"
                onClick={handleGoResubmit}
                className="rounded-xl border border-green-400/50 bg-green-400/10 px-6 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
              >
                Try Resubmit
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-red-400/50 bg-red-400/10 px-6 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
            >
              Logout
            </button>
          </div>
        </section>
      </div>
    </LockedShell>
  );
}

function LockedShell({ children, onLogout }) {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e1e2eb]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d1117]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <div className="inline-flex items-center text-xl font-extrabold tracking-tight">
            <span className="text-[#00F0FF]">AI</span>
            <span className="ml-1 text-white">Tasker</span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
            Logout
          </button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/30 bg-red-400/10 text-red-300">
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 break-words text-lg font-black text-white">{value}</p>
    </div>
  );
}

function extractReviewInfo(profile) {
  return {
    submissionCount: Number(
      profile?.profileReviewSubmissionCount ||
        profile?.ProfileReviewSubmissionCount ||
        0
    ),

    lockedUntil:
      profile?.profileReviewLockedUntil ||
      profile?.ProfileReviewLockedUntil ||
      "",

    reviewStatus: String(
      profile?.profileReviewStatus ||
        profile?.ProfileReviewStatus ||
        profile?.reviewStatus ||
        profile?.ReviewStatus ||
        ""
    )
      .trim()
      .toUpperCase(),

    userStatus: String(profile?.userStatus || profile?.UserStatus || "")
      .trim()
      .toUpperCase(),
  };
}

function isExpertProfileCurrentlyLocked(info) {
  if (!info) return false;

  return isFutureDate(info.lockedUntil);
}

function getRemainingAttempts(submissionCount) {
  return Math.max(
    MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS - Number(submissionCount || 0),
    0
  );
}

function isFutureDate(value) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() > Date.now();
}

function isLockExpired(value) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() <= Date.now();
}

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getProfileReviewNote(profile) {
  return (
    profile?.profileReviewNote ||
    profile?.ProfileReviewNote ||
    profile?.reviewNote ||
    profile?.ReviewNote ||
    profile?.aiReviewNote ||
    profile?.AiReviewNote ||
    ""
  );
}

function getMissingInformation(profile) {
  const value =
    profile?.missingInformation ||
    profile?.MissingInformation ||
    profile?.missingInfo ||
    profile?.MissingInfo ||
    "";

  if (Array.isArray(value)) return value.join(", ");

  if (typeof value === "object" && value !== null) {
    return Object.values(value).flat().join(", ");
  }

  return String(value || "");
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

function getFriendlyError(err) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request because the current token does not have EXPERT permission.";
  }

  const data = err?.response?.data;

  if (typeof data === "string") return data;

  if (data?.message) return data.message;

  if (data?.title) return data.title;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || "Something went wrong. Please try again.";
}
