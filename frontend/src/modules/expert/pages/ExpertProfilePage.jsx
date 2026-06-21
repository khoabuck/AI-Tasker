import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertProfileService from "../../../services/expertProfile.service";

export default function ExpertProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await expertProfileService.getMyExpertProfile();

      setProfile(data);
      updateLocalUserStatus(data?.userStatus || data?.UserStatus);
    } catch (err) {
      console.error("LOAD EXPERT PROFILE ERROR:", err?.response?.data || err);

      if (err?.response?.status === 404) {
        navigate("/expert/setup-profile", { replace: true });
        return;
      }

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.title ||
          err?.message ||
          "Cannot load expert profile right now."
      );
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

  const reviewStatus = getReviewStatus(profile);
  const userStatus = getUserStatus(profile);

  const canResubmit =
    reviewStatus === "NEEDS_CORRECTION" || reviewStatus === "REJECTED";

  const canUpdateAfterActive =
    userStatus === "ACTIVE" || reviewStatus === "APPROVED";

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

                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge
                      label={`Review: ${reviewStatus || "UNKNOWN"}`}
                      status={reviewStatus}
                    />

                    <StatusBadge
                      label={`Account: ${userStatus || "UNKNOWN"}`}
                      status={userStatus}
                    />

                    {profile?.level && (
                      <StatusBadge label={profile.level} status="INFO" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                {canResubmit && (
                  <Link
                    to="/expert/profile/edit"
                    className="rounded-xl border border-yellow-300/50 bg-yellow-300/10 px-5 py-3 text-center text-sm font-bold text-yellow-200 transition hover:bg-yellow-300 hover:text-black"
                  >
                    Resubmit Profile
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

          {canUpdateAfterActive && (
            <section className="mb-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5 text-cyan-200">
              <p className="font-bold">Update profile logic</p>

              <p className="mt-2 text-sm leading-6">
                Basic information is updated directly. Verification information
                is reviewed by AI first. If approved, new verification data is
                applied. If not approved, your current verified profile is kept.
              </p>
            </section>
          )}

          {canResubmit && (
            <section className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-200">
              <p className="font-bold">Your profile needs correction</p>

              <p className="mt-2 text-sm leading-6">
                {profile?.profileReviewNote ||
                  profile?.reviewNote ||
                  "Please update your profile information and submit again."}
              </p>

              {profile?.missingInformation && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                  <p className="font-bold">Missing information</p>
                  <p className="mt-1">{profile.missingInformation}</p>
                </div>
              )}
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
                {profile?.certificates?.length > 0 ? (
                  <div className="space-y-3">
                    {profile.certificates.map((cert, index) => (
                      <a
                        key={cert.expertCertificateId || cert.id || index}
                        href={cert.certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/40"
                      >
                        <p className="font-bold text-white">
                          {cert.certificateName}
                        </p>

                        <p className="mt-1 text-sm text-gray-400">
                          Issuer: {cert.certificateIssuer}
                        </p>

                        <p className="mt-1 text-xs text-cyan-300">
                          {cert.verificationStatus || "UNVERIFIED"}
                        </p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No certificates.</p>
                )}
              </Card>
            </main>

            <aside className="space-y-6">
              <Card title="Profile Review">
                <Summary
                  label="Profile Score"
                  value={`${profile?.profileScore ?? 0}`}
                />

                <Summary
                  label="Category"
                  value={profile?.expertCategory || "N/A"}
                />

                <Summary label="Level" value={profile?.level || "N/A"} />

                <Summary
                  label="Review Status"
                  value={reviewStatus || "N/A"}
                />
              </Card>

              <Card title="Work Preferences">
                <Summary
                  label="Experience"
                  value={`${profile?.yearsOfExperience ?? 0} years`}
                />

                <Summary
                  label="Verified Experience"
                  value={`${profile?.verifiedYearsOfExperience ?? 0} years`}
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

function Summary({ label, value }) {
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value || "N/A"}</p>
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

function StatusBadge({ label, status }) {
  const normalized = String(status || "").toUpperCase();

  const style =
    normalized === "APPROVED" || normalized === "ACTIVE"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : normalized === "NEEDS_CORRECTION" ||
        normalized === "PENDING_PROFILE"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : normalized === "REJECTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {label}
    </span>
  );
}

function getReviewStatus(profile) {
  return String(
    profile?.profileReviewStatus ||
      profile?.ProfileReviewStatus ||
      profile?.reviewStatus ||
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
