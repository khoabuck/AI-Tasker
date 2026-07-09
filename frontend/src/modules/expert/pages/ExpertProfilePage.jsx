import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertProfileService from "../../../services/expertProfile.service";

const MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS = 5;

export default function ExpertProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await expertProfileService.getMyExpertProfile();
      const data = unwrapProfileData(result);

      console.log("EXPERT PROFILE RESULT:", result);
      console.log("EXPERT PROFILE DATA:", data);
      console.log("CATEGORY:", data?.expertCategory);
      console.log("LEVEL:", data?.level);

      setProfile(data);
      updateLocalUserStatus(getUserStatus(data));
    } catch (err) {
      console.error("LOAD EXPERT PROFILE ERROR:", getRawPayload(err));

      const status = err?.response?.status || err?.status;

      if (status === 404) {
        navigate("/expert/setup-profile", { replace: true });
        return;
      }

      setError("Cannot load your expert profile right now.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading expert profile...
        </div>
      </ExpertLayout>
    );
  }

  if (error) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            <p className="font-bold">Cannot load profile</p>
            <p className="mt-2 text-sm">{error}</p>

            <button
              type="button"
              onClick={loadProfile}
              className="mt-5 rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
            >
              Try Again
            </button>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  if (!profile) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-[#151a22] p-6">
            <p className="text-xl font-bold text-white">No expert profile yet</p>
            <p className="mt-2 text-sm text-gray-400">
              Create your expert profile to start using expert features.
            </p>

            <Link
              to="/expert/setup-profile"
              className="mt-5 inline-flex rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Create Profile
            </Link>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  const reviewStatus = getReviewStatus(profile);
  const userStatus = getUserStatus(profile);

  const canResubmit =
    reviewStatus === "NEEDS_CORRECTION" || reviewStatus === "REJECTED";

  const canUpdateAfterActive =
    userStatus === "ACTIVE" || reviewStatus === "APPROVED";

  const feedback = buildProfileFeedback(profile);

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <section className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-5">
                <div className="h-24 w-24 overflow-hidden rounded-3xl border border-cyan-400/30 bg-cyan-400/10">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-cyan-300">
                      <span className="material-symbols-outlined text-5xl">
                        person
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                    Expert Profile
                  </p>

                  <h1 className="text-3xl font-extrabold text-white">
                    {profile?.fullName || profile?.email || "Expert"}
                  </h1>

                  <p className="mt-2 text-lg font-semibold text-cyan-200">
                    {profile?.professionalTitle || "No title"}
                  </p>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                    {getFriendlyProfileMessage(profile)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                {canResubmit && (
                  <Link
                    to="/expert/profile/edit"
                    className="rounded-xl border border-yellow-300/50 bg-yellow-300/10 px-5 py-3 text-center text-sm font-bold text-yellow-200 transition hover:bg-yellow-300 hover:text-black"
                  >
                    Improve Profile
                  </Link>
                )}

                {canUpdateAfterActive && (
                  <Link
                    to="/expert/profile/update"
                    className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-center text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                  >
                    Update Profile
                  </Link>
                )}

                <Link
                  to="/expert/jobs"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
                >
                  Browse Jobs
                </Link>
              </div>
            </div>
          </section>

          {canResubmit && (
            <section className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-100">
              <p className="text-lg font-bold text-white">
                Your profile needs improvement
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Summary label="Score" value={feedback.scoreText} />
                <Summary label="Passing Score" value={feedback.passScore} />
                <Summary
                  label="Attempts"
                  value={`${feedback.attempts.used}/${feedback.attempts.max}`}
                  subText={`${feedback.attempts.remaining} remaining`}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="font-bold text-white">Main issue</p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    {feedback.mainIssue}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="font-bold text-white">What to improve</p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    {feedback.fixAction}
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="Bio">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {profile?.bio || "No bio."}
                </p>
              </Card>

              <Card title="Skills">
                <div className="flex flex-wrap gap-2">
                  {toArray(profile?.skills).length > 0 ? (
                    toArray(profile.skills).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No skills listed.</p>
                  )}
                </div>
              </Card>

              <Card title="Certificates">
                {getCertificates(profile).length > 0 ? (
                  <div className="space-y-3">
                    {getCertificates(profile).map((cert, index) => (
                      <CertificateItem
                        key={cert.expertCertificateId || cert.id || index}
                        certificate={cert}
                        index={index}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No certificates added. Certificates are optional, but they
                    can help strengthen your profile.
                  </p>
                )}
              </Card>
            </main>

            <aside className="space-y-6">
              <Card title="Profile Summary">
                <Summary label="Score" value={feedback.scoreText} />
                <Summary label="Passing Score" value={feedback.passScore} />
                <Summary
                  label="Category"
                  value={formatExpertCategory(profile?.expertCategory)}
                />
                <Summary
                  label="Level"
                  value={formatExpertLevel(profile?.level)}
                />
              </Card>

              <Card title="Work Preferences">
                <Summary
                  label="Experience"
                  value={`${profile?.yearsOfExperience ?? 0} years`}
                />

                <Summary
                  label="Available"
                  value={profile?.availableForWork ? "Yes" : "No"}
                />
              </Card>

              <Card title="Public Links">
                <LinkItem label="Portfolio" url={profile?.portfolioUrl} />
                <LinkItem label="LinkedIn" url={profile?.linkedInUrl} />
                <LinkItem label="GitHub" url={profile?.gitHubUrl} />
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
      <h2 className="mb-4 text-xl font-extrabold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Summary({ label, value, subText }) {
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value || "N/A"}</p>
      {subText ? <p className="mt-1 text-xs text-gray-500">{subText}</p> : null}
    </div>
  );
}

function LinkItem({ label, url }) {
  if (!url) return <Summary label={label} value="N/A" />;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mb-3 block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/40"
    >
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 truncate font-bold text-cyan-300">{url}</p>
    </a>
  );
}

function CertificateItem({ certificate, index }) {
  const badge = getCertificateBadge(certificate?.verificationStatus);

  const title =
    certificate?.detectedCertificateName ||
    certificate?.certificateName ||
    `Certificate ${index + 1}`;

  const issuer =
    certificate?.detectedIssuer || certificate?.certificateIssuer || "";

  return (
    <a
      href={certificate?.certificateUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/40"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-bold text-white">{title}</p>

          <p className="mt-1 text-sm text-gray-400">
            {issuer || formatCertificateType(certificate?.certificateType)}
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      {certificate?.verificationNote && (
        <p className="mt-3 text-xs leading-5 text-gray-500">
          {certificate.verificationNote}
        </p>
      )}
    </a>
  );
}

function buildProfileFeedback(profile) {
  const scoreInfo = extractProfileScoreInfo(profile);
  const reviewNote = getReviewNote(profile);
  const missingInformation = getMissingInformation(profile);
  const reviewLimit = extractExpertProfileReviewLimit(profile);

  return {
    scoreText: scoreInfo.scoreText || "N/A",
    passScore:
      scoreInfo.profilePassScore !== null &&
      scoreInfo.profilePassScore !== undefined
        ? String(scoreInfo.profilePassScore)
        : "N/A",
    attempts: {
      used: reviewLimit.submissionCount,
      remaining: reviewLimit.remainingAttempts,
      max: reviewLimit.maxAttempts,
    },
    mainIssue: buildMainIssue(reviewNote),
    fixAction: buildFixAction({
      reviewNote,
      missingInformation,
    }),
  };
}

function extractProfileScoreInfo(profile) {
  const raw = profile?.raw || profile?.Raw || profile || {};

  const parsedScore = parseFinalProfileScore(getReviewNote(profile));

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

  const profilePassScore =
    parsePassThreshold(getReviewNote(profile)) ??
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
    profileScore,
    profileScoreMax,
    profilePassScore,
    scoreText,
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

  return {
    submissionCount,
    remainingAttempts:
      explicitRemaining !== null
        ? Math.max(0, explicitRemaining)
        : Math.max(0, maxAttempts - submissionCount),
    maxAttempts,
  };
}

function getCertificates(profile) {
  const certificates = profile?.certificates || profile?.Certificates || [];

  return Array.isArray(certificates) ? certificates : [];
}

function getCertificateBadge(status) {
  const value = String(status || "").trim().toUpperCase();

  if (value === "VERIFIED") {
    return {
      label: "Verified",
      className: "border-green-400/30 bg-green-400/10 text-green-300",
    };
  }

  if (value === "NAME_MISMATCH") {
    return {
      label: "Needs update",
      className: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
    };
  }

  if (value === "NEEDS_REVIEW") {
    return {
      label: "Being reviewed",
      className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    };
  }

  if (value === "INVALID") {
    return {
      label: "Invalid",
      className: "border-red-400/30 bg-red-400/10 text-red-300",
    };
  }

  return {
    label: "Not verified",
    className: "border-white/10 bg-white/[0.04] text-gray-300",
  };
}

function getFriendlyProfileMessage(profile) {
  const reviewStatus = getReviewStatus(profile);
  const userStatus = getUserStatus(profile);

  if (reviewStatus === "APPROVED" || userStatus === "ACTIVE") {
    return "Your profile is ready. Keep your information updated so clients can trust your expertise.";
  }

  if (reviewStatus === "NEEDS_CORRECTION" || reviewStatus === "REJECTED") {
    return "Your profile needs a few improvements before it can be approved.";
  }

  return "Your profile is being reviewed. You can still keep your information up to date.";
}

function getReviewStatus(profile) {
  return String(
    profile?.profileReviewStatus ||
      profile?.ProfileReviewStatus ||
      profile?.reviewStatus ||
      profile?.ReviewStatus ||
      profile?.status ||
      profile?.Status ||
      ""
  )
    .trim()
    .toUpperCase();
}

function getUserStatus(profile) {
  return String(profile?.userStatus || profile?.UserStatus || "")
    .trim()
    .toUpperCase();
}

function getReviewNote(profile) {
  return (
    profile?.profileReviewNote ||
    profile?.ProfileReviewNote ||
    profile?.reviewNote ||
    profile?.ReviewNote ||
    profile?.correctionNote ||
    profile?.CorrectionNote ||
    profile?.rejectionReason ||
    profile?.RejectionReason ||
    ""
  );
}

function getMissingInformation(profile) {
  const value =
    profile?.missingInformation ||
    profile?.MissingInformation ||
    profile?.missingFields ||
    profile?.MissingFields ||
    "";

  if (Array.isArray(value)) return value.join(", ");

  return String(value || "");
}

function formatExpertCategory(value) {
  const map = {
    AI_AUTOMATION: "AI Automation",
    AI: "AI",
    DATA_AI: "Data & AI",
    DATA_SCIENCE: "Data Science",
    MACHINE_LEARNING: "Machine Learning",
    CHATBOT: "Chatbot",
    COMPUTER_VISION: "Computer Vision",
    NLP: "NLP",
    OTHER: "Other",
  };

  return map[value] || formatEnumText(value) || "N/A";
}

function formatExpertLevel(value) {
  const map = {
    INTERN: "Intern",
    FRESHER: "Fresher",
    JUNIOR: "Junior",
    MIDDLE: "Middle",
    MID: "Middle",
    SENIOR: "Senior",
    EXPERT: "Expert",
  };

  return map[value] || formatEnumText(value) || "N/A";
}

function formatEnumText(value) {
  if (!value) return "";

  return String(value)
    .trim()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unwrapProfileData(result) {
  if (!result) return null;

  if (result?.expertProfileId) return result;

  if (result?.success === true && result?.data) return result.data;

  if (result?.data?.expertProfileId) return result.data;

  if (result?.data?.success === true && result?.data?.data) {
    return result.data.data;
  }

  if (result?.data?.data?.expertProfileId) return result.data.data;

  return result;
}

function getRawPayload(error) {
  return error?.response?.data || error?.data || error;
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

function formatCertificateType(value) {
  const map = {
    COURSE_CERTIFICATE: "Course Certificate",
    PROFESSIONAL_CERTIFICATE: "Professional Certificate",
    BOOTCAMP_CERTIFICATE: "Bootcamp Certificate",
    DEGREE_CERTIFICATE: "Degree Certificate",
    AWARD_CERTIFICATE: "Award Certificate",
    OTHER: "Other",
  };

  return map[value] || "Certificate";
}