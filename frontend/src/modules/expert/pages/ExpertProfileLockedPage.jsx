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

  const reviewLimit = useMemo(
    () => extractExpertProfileReviewLimit(profile),
    [profile]
  );

  const scoreInfo = useMemo(() => extractProfileScoreInfo(profile), [profile]);

  const feedback = useMemo(
    () => buildFriendlyFeedback(profile),
    [profile]
  );

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const result = await expertProfileService.getMyExpertProfile();
      const data = unwrapData(result);

      const reviewStatus = getReviewStatus(data);
      const userStatus = getUserStatus(data);
      const limit = extractExpertProfileReviewLimit(data);

      if (reviewStatus === "APPROVED" || userStatus === "ACTIVE") {
        navigate("/expert/dashboard", { replace: true });
        return;
      }

      if (!isProfileLocked(limit)) {
        navigate("/expert/profile", { replace: true });
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error("LOAD LOCKED PROFILE ERROR:", getRawPayload(err));

      const status = err?.response?.status || err?.status;

      if (status === 404) {
        navigate("/expert/setup-profile", { replace: true });
        return;
      }

      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof logoutContext === "function") {
        logoutContext();
      }
    } catch (logoutError) {
      console.error("AUTH CONTEXT LOGOUT ERROR:", logoutError);
    }

    try {
      if (typeof authService.logout === "function") {
        await authService.logout();
      }
    } catch (logoutError) {
      console.error("AUTH SERVICE LOGOUT ERROR:", logoutError);
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
          Loading your profile information...
        </div>
      </LockedShell>
    );
  }

  return (
    <LockedShell onLogout={handleLogout}>
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-5 py-10 md:px-8">
        <div className="w-full max-w-5xl">
          <section className="rounded-3xl border border-red-400/25 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10 text-red-300">
                  <span className="material-symbols-outlined text-4xl">
                    lock
                  </span>
                </div>

                <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                  Profile Review Paused
                </p>

                <h1 className="text-3xl font-extrabold text-white md:text-4xl">
                  You have no profile submission attempts left
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
                  Your profile cannot be submitted again right now. You can
                  prepare stronger evidence and update your information when
                  submissions become available again.
                </p>

                {reviewLimit.lockedUntil ? (
                  <div className="mt-5 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-4 text-yellow-100">
                    <p className="font-bold">Available again</p>
                    <p className="mt-1 text-sm">
                      {formatDateTime(reviewLimit.lockedUntil)}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-3 md:w-[430px] md:grid-cols-1">
                <SummaryCard
                  label="Attempts Used"
                  value={`${reviewLimit.submissionCount}/${reviewLimit.maxAttempts}`}
                />

                <SummaryCard
                  label="Attempts Remaining"
                  value={`${reviewLimit.remainingAttempts}/${reviewLimit.maxAttempts}`}
                />

                <SummaryCard
                  label="Profile Score"
                  value={scoreInfo.scoreText || "N/A"}
                  subText={
                    scoreInfo.passScoreText
                      ? `Passing score: ${scoreInfo.passScoreText}`
                      : ""
                  }
                />
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <FriendlyCard
                icon="priority_high"
                tone="warning"
                title="Main issue"
                message={feedback.mainIssue}
              />

              <FriendlyCard
                icon="tips_and_updates"
                tone="danger"
                title="What to improve"
                message={feedback.fixAction}
              />
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-lg font-black text-white">
                What you can prepare next
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <TipItem text="Use a realistic years-of-experience value that matches your public evidence." />
                <TipItem text="Add detailed project descriptions to your portfolio and GitHub repositories." />
                <TipItem text="Add public certificate links if you have them." />
                <TipItem text="Add a LinkedIn profile or other public proof of experience." />
              </div>
            </div>
          </section>
        </div>
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

function SummaryCard({ label, value, subText }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value || "N/A"}</p>
      {subText ? <p className="mt-1 text-xs text-gray-500">{subText}</p> : null}
    </div>
  );
}

function FriendlyCard({ icon, tone, title, message }) {
  const style =
    tone === "danger"
      ? "border-red-400/25 bg-red-400/10"
      : "border-yellow-400/25 bg-yellow-400/10";

  const iconStyle = tone === "danger" ? "text-red-300" : "text-yellow-300";

  return (
    <div className={`rounded-2xl border p-5 ${style}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`material-symbols-outlined text-xl ${iconStyle}`}>
          {icon}
        </span>

        <p className="font-black text-white">{title}</p>
      </div>

      <p className="text-sm leading-7 text-gray-300">
        {message || "Please improve your profile evidence."}
      </p>
    </div>
  );
}

function TipItem({ text }) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className="material-symbols-outlined mt-0.5 text-[18px] text-cyan-300">
        check_circle
      </span>
      <p className="text-sm leading-6 text-gray-400">{text}</p>
    </div>
  );
}

function buildFriendlyFeedback(profile) {
  const reviewNote = getReviewNote(profile);
  const missingInformation = getMissingInformation(profile);

  return {
    mainIssue: buildMainIssue(reviewNote),
    fixAction: buildFixAction({
      reviewNote,
      missingInformation,
    }),
  };
}

function buildMainIssue(reviewNote) {
  const text = String(reviewNote || "").trim();

  if (!text) {
    return "Your profile needs stronger evidence before it can be approved.";
  }

  return (
    extractSentence(text, /extremely high and not supported/i) ||
    extractSentence(text, /claimed experience is much higher/i) ||
    extractSentence(text, /lacks strong evidence/i) ||
    firstSentence(text) ||
    "Your profile needs stronger evidence before it can be approved."
  );
}

function buildFixAction({ reviewNote, missingInformation }) {
  const missingText = String(missingInformation || "").trim();

  if (missingText) return missingText;

  const text = String(reviewNote || "").trim();

  return (
    extractSentence(text, /Additional evidence is required/i) ||
    "Add stronger evidence such as detailed project descriptions, certificates, GitHub repositories, portfolio links, or a LinkedIn profile."
  );
}

function extractProfileScoreInfo(profile) {
  const raw = profile?.raw || profile?.Raw || profile || {};
  const reviewNote = getReviewNote(profile);
  const parsedScore = parseFinalProfileScore(reviewNote);

  const profileScore =
    parsedScore.score ??
    toNumberOrNull(
      pickFirst(
        profile?.profileScore,
        profile?.ProfileScore,
        profile?.score,
        profile?.Score,
        raw?.profileScore,
        raw?.ProfileScore,
        raw?.score,
        raw?.Score
      )
    );

  const profileScoreMax =
    parsedScore.maxScore ??
    toNumberOrNull(
      pickFirst(
        profile?.profileScoreMax,
        profile?.ProfileScoreMax,
        profile?.maxScore,
        profile?.MaxScore,
        raw?.profileScoreMax,
        raw?.ProfileScoreMax,
        raw?.maxScore,
        raw?.MaxScore
      )
    );

  const passScore =
    parsePassThreshold(reviewNote) ??
    toNumberOrNull(
      pickFirst(
        profile?.profilePassScore,
        profile?.ProfilePassScore,
        profile?.passScore,
        profile?.PassScore,
        raw?.profilePassScore,
        raw?.ProfilePassScore,
        raw?.passScore,
        raw?.PassScore
      )
    );

  const scoreText =
    parsedScore.text ||
    profile?.profileScoreText ||
    profile?.ProfileScoreText ||
    raw?.profileScoreText ||
    raw?.ProfileScoreText ||
    buildScoreText({
      profileScore,
      profileScoreMax,
    });

  return {
    scoreText,
    passScoreText:
      passScore !== null && passScore !== undefined ? String(passScore) : "",
  };
}

function extractExpertProfileReviewLimit(data) {
  const raw = data?.raw || data?.Raw || data || {};

  const maxAttempts =
    toNumberOrNull(
      pickFirst(
        data?.maxReviewAttempts,
        data?.MaxReviewAttempts,
        data?.profileReviewMaxSubmissions,
        data?.ProfileReviewMaxSubmissions,
        data?.maxAttempts,
        data?.MaxAttempts,
        raw?.maxReviewAttempts,
        raw?.MaxReviewAttempts,
        raw?.profileReviewMaxSubmissions,
        raw?.ProfileReviewMaxSubmissions,
        raw?.maxAttempts,
        raw?.MaxAttempts
      )
    ) || MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS;

  const submissionCount =
    toNumberOrNull(
      pickFirst(
        data?.profileReviewSubmissionCount,
        data?.ProfileReviewSubmissionCount,
        data?.reviewAttempts,
        data?.ReviewAttempts,
        data?.submissionCount,
        data?.SubmissionCount,
        data?.submissionCountUsed,
        data?.SubmissionCountUsed,
        raw?.profileReviewSubmissionCount,
        raw?.ProfileReviewSubmissionCount,
        raw?.reviewAttempts,
        raw?.ReviewAttempts,
        raw?.submissionCount,
        raw?.SubmissionCount,
        raw?.submissionCountUsed,
        raw?.SubmissionCountUsed
      )
    ) || 0;

  const explicitRemaining = toNumberOrNull(
    pickFirst(
      data?.remainingReviewAttempts,
      data?.RemainingReviewAttempts,
      data?.profileReviewRemainingAttempts,
      data?.ProfileReviewRemainingAttempts,
      data?.remainingAttempts,
      data?.RemainingAttempts,
      raw?.remainingReviewAttempts,
      raw?.RemainingReviewAttempts,
      raw?.profileReviewRemainingAttempts,
      raw?.ProfileReviewRemainingAttempts,
      raw?.remainingAttempts,
      raw?.RemainingAttempts
    )
  );

  const remainingAttempts =
    explicitRemaining !== null
      ? Math.max(0, explicitRemaining)
      : Math.max(0, maxAttempts - submissionCount);

  return {
    submissionCount,
    remainingAttempts,
    maxAttempts,
    lockedUntil:
      pickFirst(
        data?.profileReviewLockedUntil,
        data?.ProfileReviewLockedUntil,
        data?.lockedUntil,
        data?.LockedUntil,
        raw?.profileReviewLockedUntil,
        raw?.ProfileReviewLockedUntil,
        raw?.lockedUntil,
        raw?.LockedUntil
      ) || "",
    reviewStatus: getReviewStatus(data),
    userStatus: getUserStatus(data),
  };
}

function isProfileLocked(limit) {
  if (!limit) return false;

  const reviewStatus = String(limit.reviewStatus || "").toUpperCase();
  const userStatus = String(limit.userStatus || "").toUpperCase();

  if (
    reviewStatus === "LOCKED" ||
    userStatus === "EXPERT_PROFILE_LOCKED" ||
    userStatus === "LOCKED"
  ) {
    return true;
  }

  if (Number(limit.remainingAttempts || 0) <= 0) {
    return true;
  }

  if (!limit.lockedUntil) return false;

  const time = new Date(limit.lockedUntil).getTime();

  return Number.isFinite(time) && time > Date.now();
}

function getReviewStatus(data) {
  const raw = data?.raw || data?.Raw || data || {};

  return String(
    pickFirst(
      data?.profileReviewStatus,
      data?.ProfileReviewStatus,
      data?.reviewStatus,
      data?.ReviewStatus,
      data?.status,
      data?.Status,
      raw?.profileReviewStatus,
      raw?.ProfileReviewStatus,
      raw?.reviewStatus,
      raw?.ReviewStatus,
      raw?.status,
      raw?.Status
    ) || ""
  )
    .trim()
    .toUpperCase();
}

function getUserStatus(data) {
  const raw = data?.raw || data?.Raw || data || {};

  return String(
    pickFirst(
      data?.userStatus,
      data?.UserStatus,
      raw?.userStatus,
      raw?.UserStatus
    ) || ""
  )
    .trim()
    .toUpperCase();
}

function getReviewNote(data) {
  const raw = data?.raw || data?.Raw || data || {};

  return (
    pickFirst(
      data?.profileReviewNote,
      data?.ProfileReviewNote,
      data?.reviewNote,
      data?.ReviewNote,
      data?.correctionNote,
      data?.CorrectionNote,
      data?.rejectionReason,
      data?.RejectionReason,
      raw?.profileReviewNote,
      raw?.ProfileReviewNote,
      raw?.reviewNote,
      raw?.ReviewNote,
      raw?.correctionNote,
      raw?.CorrectionNote,
      raw?.rejectionReason,
      raw?.RejectionReason
    ) || ""
  );
}

function getMissingInformation(data) {
  const raw = data?.raw || data?.Raw || data || {};

  const value = pickFirst(
    data?.missingInformation,
    data?.MissingInformation,
    data?.missingFields,
    data?.MissingFields,
    raw?.missingInformation,
    raw?.MissingInformation,
    raw?.missingFields,
    raw?.MissingFields
  );

  if (Array.isArray(value)) return value.join(", ");

  return String(value || "");
}

function unwrapData(result) {
  if (!result) return result;

  if (result.data?.data) return result.data.data;
  if (result.data) return result.data;

  return result;
}

function getRawPayload(error) {
  return error?.response?.data || error?.data || error;
}

function parseFinalProfileScore(text) {
  const match = String(text || "").match(
    /Final profile score:\s*(\d+)\s*\/\s*(\d+)/i
  );

  if (!match) {
    return {
      score: null,
      maxScore: null,
      text: "",
    };
  }

  return {
    score: Number(match[1]),
    maxScore: Number(match[2]),
    text: `${match[1]}/${match[2]}`,
  };
}

function parsePassThreshold(text) {
  return extractNumber(text, /Pass threshold:\s*(\d+)/i);
}

function buildScoreText(scoreInfo) {
  const score = scoreInfo?.profileScore;
  const maxScore = scoreInfo?.profileScoreMax;

  if (score === null || score === undefined) return "";
  if (maxScore === null || maxScore === undefined) return String(score);

  return `${score}/${maxScore}`;
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);

  if (!Number.isFinite(number)) return null;

  return number;
}

function extractNumber(text, regex) {
  const match = String(text || "").match(regex);

  if (!match) return null;

  const value = Number(match[1]);

  return Number.isFinite(value) ? value : null;
}

function extractSentence(text, regex) {
  const sentences = String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.find((sentence) => regex.test(sentence)) || "";
}

function firstSentence(text) {
  return (
    String(text || "")
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)[0] || ""
  );
}

function formatDateTime(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}