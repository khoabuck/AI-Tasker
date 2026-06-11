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
    } catch (err) {
      console.error("LOAD EXPERT PROFILE ERROR:", err?.response?.data);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Cannot load expert profile.";

      if (
        err?.response?.status === 404 ||
        String(message).toLowerCase().includes("not found")
      ) {
        navigate("/expert/setup-profile", { replace: true });
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    const number = Number(value || 0);

    return `$${number.toLocaleString("en-US")}`;
  };

  const formatDate = (value) => {
    if (!value) return "No date";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "No date";
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const getSkills = () => {
    if (!profile?.skills) return [];

    return String(profile.skills)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const getAvatarText = () => {
    const title = profile?.professionalTitle || "AI Expert";

    return title
      .split(" ")
      .map((item) => item[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const certificates = Array.isArray(profile?.certificates)
    ? profile.certificates
    : [];

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const actionButton =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black";

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          <div className="text-center">
            <span className="material-symbols-outlined mb-3 block text-5xl text-[#00F0FF]">
              hourglass_empty
            </span>

            <p>Loading expert profile...</p>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                My Expert Profile
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                View your expert profile
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                This is your Expert profile. Clients can see your title, bio,
                skills, experience, portfolio links and certificates.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/expert/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
              >
                <span className="material-symbols-outlined text-[18px]">
                  dashboard
                </span>
                Dashboard
              </Link>

              <Link to="/expert/profile/edit" className={actionButton}>
                <span className="material-symbols-outlined text-[18px]">
                  edit
                </span>
                Edit Profile
              </Link>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              <p className="font-bold">Cannot load profile</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {!error && profile && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
              <aside className={cardStyle}>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-5 flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-cyan-400/30 bg-cyan-400/10">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt="Expert avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-black text-cyan-300">
                        {getAvatarText()}
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold text-white">
                    {profile.professionalTitle || "AI Expert"}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-gray-400">
                    {profile.bio || "No bio yet."}
                  </p>

                  <div
                    className={`mt-5 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${
                      profile.availableForWork
                        ? "border-green-400/30 bg-green-400/10 text-green-300"
                        : "border-red-400/30 bg-red-400/10 text-red-300"
                    }`}
                  >
                    {profile.availableForWork
                      ? "Available for work"
                      : "Not available"}
                  </div>
                </div>

                <div className="my-6 border-t border-white/10" />

                <div className="space-y-5">
                  <InfoItem
                    icon="work_history"
                    label="Experience"
                    value={`${profile.yearsOfExperience || 0} years`}
                  />

                  <InfoItem
                    icon="payments"
                    label="Expected Budget"
                    value={`${formatMoney(
                      profile.expectedProjectBudgetMin
                    )} - ${formatMoney(profile.expectedProjectBudgetMax)}`}
                  />

                  <InfoItem
                    icon="schedule"
                    label="Preferred Duration"
                    value={`${profile.preferredProjectDurationDays || 0} days`}
                  />
                </div>
              </aside>

              <main className="space-y-6">
                <section className={cardStyle}>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00F0FF]">
                      psychology
                    </span>

                    <h3 className="text-lg font-bold text-white">Skills</h3>
                  </div>

                  {getSkills().length === 0 ? (
                    <p className="text-sm text-gray-500">No skills yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getSkills().map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section className={cardStyle}>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00F0FF]">
                      link
                    </span>

                    <h3 className="text-lg font-bold text-white">
                      Portfolio Links
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <ProfileLink
                      label="Portfolio"
                      value={profile.portfolioUrl}
                      icon="language"
                    />

                    <ProfileLink
                      label="LinkedIn"
                      value={profile.linkedInUrl}
                      icon="work"
                    />

                    <ProfileLink
                      label="GitHub"
                      value={profile.gitHubUrl}
                      icon="code"
                    />
                  </div>
                </section>

                <section className={cardStyle}>
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#00F0FF]">
                          workspace_premium
                        </span>

                        <h3 className="text-lg font-bold text-white">
                          Certificates
                        </h3>
                      </div>

                      <p className="text-sm text-gray-500">
                        Certificate links submitted in your Expert profile.
                      </p>
                    </div>
                  </div>

                  {certificates.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                        workspace_premium
                      </span>

                      <h4 className="font-bold text-white">
                        No certificates
                      </h4>

                      <p className="mt-2 text-sm text-gray-500">
                        You can add certificates when editing your profile.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {certificates.map((certificate, index) => (
                        <div
                          key={index}
                          className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-bold text-white">
                              {certificate.certificateName ||
                                `Certificate ${index + 1}`}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {certificate.certificateIssuer || "No issuer"}
                            </p>

                            <p className="mt-1 text-xs text-gray-600">
                              Issued at: {formatDate(certificate.issuedAt)}
                            </p>
                          </div>

                          {certificate.certificateUrl ? (
                            <a
                              href={certificate.certificateUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={actionButton}
                            >
                              Open Certificate
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500">
                              No link
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </main>
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500">
          {label}
        </p>

        <p className="mt-1 font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function ProfileLink({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2 text-gray-400">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>

        <span className="text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>

      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        >
          {value}
        </a>
      ) : (
        <p className="text-sm text-gray-600">No link</p>
      )}
    </div>
  );
}