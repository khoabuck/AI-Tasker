import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import { useAuth } from "../../../context/AuthContext";
import expertProfileService from "../../../services/expertProfile.service";

export default function ExpertProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

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
      console.error("LOAD EXPERT PROFILE ERROR:", err?.response?.data || err);

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

  const displayName = getDisplayName(profile, user);
  const professionalTitle =
    profile?.professionalTitle || "AI Expert / Freelancer";
  const skills = useMemo(() => toArray(profile?.skills), [profile]);
  const certificates = Array.isArray(profile?.certificates)
    ? profile.certificates
    : [];

  const profileStatus = String(
    profile?.status || profile?.profileStatus || user?.status || ""
  ).toUpperCase();

  const profileCompletion = useMemo(() => {
    return calculateProfileCompletion(profile);
  }, [profile]);

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const actionButton =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black";

  const formatMoney = (value) => {
    const number = Number(value || 0);

    if (!number) return "$0";

    return `$${number.toLocaleString("en-US")}`;
  };

  const formatBudgetRange = () => {
    const min = Number(profile?.expectedProjectBudgetMin || 0);
    const max = Number(profile?.expectedProjectBudgetMax || 0);

    if (!min && !max) return "Negotiable";
    if (min && !max) return `From ${formatMoney(min)}`;
    if (!min && max) return `Up to ${formatMoney(max)}`;

    return `${formatMoney(min)} - ${formatMoney(max)}`;
  };

  const formatDate = (value) => {
    if (!value) return "No date";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "No date";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          <div className="text-center">
            <span className="material-symbols-outlined mb-3 block text-5xl text-[#00F0FF]">
              account_circle
            </span>
            Loading expert profile...
          </div>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                My Expert Profile
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                View your expert profile
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                This is your public expert profile. Clients can review your
                skills, experience, certificates, and portfolio links.
              </p>
            </div>

            <Link to="/expert/profile/edit" className={actionButton}>
              <span className="material-symbols-outlined text-[18px]">
                edit
              </span>
              Edit Profile
            </Link>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!error && profile && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
              <aside className="space-y-6">
                <section className={cardStyle}>
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-5 h-36 w-36 overflow-hidden rounded-3xl border border-cyan-400/30 bg-cyan-400/10 shadow-[0_16px_50px_rgba(0,240,255,0.12)]">
                      {profile.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt="Expert avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="material-symbols-outlined text-7xl text-cyan-300">
                            person
                          </span>
                        </div>
                      )}
                    </div>

                    <h2 className="text-3xl font-extrabold leading-tight text-white">
                      {displayName}
                    </h2>

                    <p className="mt-2 text-sm font-semibold leading-6 text-cyan-300">
                      {professionalTitle}
                    </p>

                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <StatusBadge status={profileStatus} />

                      <AvailabilityBadge
                        available={profile.availableForWork}
                      />
                    </div>
                  </div>

                  <div className="my-6 border-t border-white/10" />

                  <div className="space-y-4">
                    <InfoItem
                      icon="work_history"
                      label="Experience"
                      value={`${profile.yearsOfExperience || 0} years`}
                    />

                    <InfoItem
                      icon="payments"
                      label="Expected Budget"
                      value={formatBudgetRange()}
                    />

                    <InfoItem
                      icon="calendar_month"
                      label="Preferred Duration"
                      value={
                        profile.preferredProjectDurationDays
                          ? `${profile.preferredProjectDurationDays} days`
                          : "Flexible"
                      }
                    />
                  </div>
                </section>

                <section className={cardStyle}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">
                      Profile Strength
                    </h3>

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
                      done={Boolean(profile.avatarUrl)}
                      text="Avatar"
                    />
                    <ChecklistItem
                      done={Boolean(profile.professionalTitle)}
                      text="Professional title"
                    />
                    <ChecklistItem done={Boolean(profile.bio)} text="Bio" />
                    <ChecklistItem done={skills.length > 0} text="Skills" />
                    <ChecklistItem
                      done={hasAnyPublicLink(profile)}
                      text="Public link"
                    />
                    <ChecklistItem
                      done={certificates.length > 0}
                      text="Certificate"
                    />
                  </div>
                </section>
              </aside>

              <main className="space-y-6">
                <section className={cardStyle}>
                  <SectionHeader
                    icon="description"
                    title="About Me"
                    description="A short introduction clients will read before inviting or hiring you."
                  />

                  <BioBlock bio={profile.bio} />
                </section>

                <section className={cardStyle}>
                  <SectionHeader
                    icon="psychology"
                    title="Skills"
                    description="Skills used for job matching and client search."
                  />

                  {skills.length === 0 ? (
                    <EmptyBox
                      icon="psychology_alt"
                      title="No skills yet"
                      message="Add skills to improve job matching."
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section className={cardStyle}>
                  <SectionHeader
                    icon="link"
                    title="Public Links"
                    description="Portfolio and professional links clients can open."
                  />

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
                  <SectionHeader
                    icon="workspace_premium"
                    title="Certificates"
                    description="Certificates submitted in your expert profile."
                  />

                  {certificates.length === 0 ? (
                    <EmptyBox
                      icon="workspace_premium"
                      title="No certificates"
                      message="Add certificates to build more trust with clients."
                    />
                  ) : (
                    <div className="space-y-3">
                      {certificates.map((certificate, index) => (
                        <CertificateCard
                          key={`${
                            certificate.certificateName || "cert"
                          }-${index}`}
                          certificate={certificate}
                          index={index}
                          formatDate={formatDate}
                        />
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

function getDisplayName(profile, user) {
  return (
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
    "Expert User"
  );
}

function toArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return (
            item.name ||
            item.skillName ||
            item.title ||
            item.Name ||
            item.SkillName ||
            item.Title ||
            ""
          );
        }

        return item;
      })
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function StatusBadge({ status }) {
  if (status === "NEEDS_CORRECTION") {
    return (
      <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-yellow-300">
        Needs Correction
      </span>
    );
  }

  if (status === "PENDING_REVIEW" || status === "PENDING_PROFILE") {
    return (
      <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-yellow-300">
        Under Review
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

function AvailabilityBadge({ available }) {
  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${
        available
          ? "border-green-400/30 bg-green-400/10 text-green-300"
          : "border-red-400/30 bg-red-400/10 text-red-300"
      }`}
    >
      {available ? "Available for work" : "Not available"}
    </span>
  );
}

function SectionHeader({ icon, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <div>
        <h3 className="text-lg font-extrabold text-white">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function BioBlock({ bio }) {
  if (!bio) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm text-gray-500">No bio yet.</p>
      </div>
    );
  }

  const paragraphs = String(bio)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="text-sm leading-7 text-gray-300 md:text-[15px]"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <span className="material-symbols-outlined mt-[2px] text-[20px] text-cyan-300">
        {icon}
      </span>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          {label}
        </p>

        <p className="mt-1 text-sm font-bold text-white">{value}</p>
      </div>
    </div>
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

function CertificateCard({ certificate, index, formatDate }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-bold text-white">
          {certificate.certificateName || `Certificate ${index + 1}`}
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
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          <span className="material-symbols-outlined text-[18px]">
            open_in_new
          </span>
          Open
        </a>
      ) : (
        <span className="text-sm text-gray-500">No link</span>
      )}
    </div>
  );
}

function EmptyBox({ icon, title, message }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        {icon}
      </span>

      <h4 className="font-bold text-white">{title}</h4>

      <p className="mt-2 text-sm text-gray-500">{message}</p>
    </div>
  );
}