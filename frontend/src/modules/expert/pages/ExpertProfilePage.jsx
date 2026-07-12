import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertProfileService from "../../../services/expertProfile.service";
import reviewService from "../../../services/review.service";
import { changePasswordApi } from "../../../api/auth.api";

const MAX_EXPERT_PROFILE_REVIEW_SUBMISSIONS = 5;

export default function ExpertProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState("");
  const [reviewsError, setReviewsError] = useState("");

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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

      setProfile(data);
      updateLocalUserStatus(getUserStatus(data));

      const expertProfileId =
        data?.expertProfileId ||
        data?.ExpertProfileId ||
        data?.id ||
        data?.Id;

      if (expertProfileId) {
        await loadExpertReviews(expertProfileId);
      } else {
        setReviews([]);
      }
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


  const loadExpertReviews = async (expertProfileId) => {
    try {
      setReviewsLoading(true);
      setReviewsError("");

      const result = await reviewService.getExpertReviews(expertProfileId);

      setReviews(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("LOAD EXPERT REVIEWS ERROR:", err?.response?.data || err);
      setReviews([]);
      setReviewsError(
        getFriendlyError(err, "Cannot load expert reviews right now.")
      );
    } finally {
      setReviewsLoading(false);
    }
  };

  const openChangePasswordModal = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setPasswordErrors({});
    setPasswordError("");
    setPasswordMessage("");
    setShowChangePasswordModal(true);
  };

  const closeChangePasswordModal = () => {
    if (changingPassword) return;

    setShowChangePasswordModal(false);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setPasswordErrors({});
    setPasswordError("");
    setPasswordMessage("");
  };

  const updatePasswordField = (name, value) => {
    setPasswordError("");
    setPasswordMessage("");

    setPasswordErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePasswordForm = () => {
    const errors = {};
    const currentPassword = passwordForm.currentPassword;
    const newPassword = passwordForm.newPassword;
    const confirmNewPassword = passwordForm.confirmNewPassword;

    if (!currentPassword.trim()) {
      errors.currentPassword = "Current password is required.";
    }

    if (!newPassword.trim()) {
      errors.newPassword = "New password is required.";
    } else if (newPassword.length < 6) {
      errors.newPassword = "New password must be at least 6 characters.";
    } else if (newPassword.length > 100) {
      errors.newPassword = "New password must not exceed 100 characters.";
    }

    if (!confirmNewPassword.trim()) {
      errors.confirmNewPassword = "Confirm new password is required.";
    } else if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = "Confirm new password does not match.";
    }

    if (
      currentPassword &&
      newPassword &&
      currentPassword === newPassword
    ) {
      errors.newPassword =
        "New password must be different from current password.";
    }

    setPasswordErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (!validatePasswordForm()) {
      setPasswordError("Please fix the highlighted fields.");
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordError("");
      setPasswordMessage("");
      setPasswordErrors({});

      const response = await changePasswordApi({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmNewPassword: passwordForm.confirmNewPassword,
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });

      setPasswordMessage(
        response?.message || "Password changed successfully."
      );
    } catch (err) {
      console.error(
        "CHANGE PASSWORD ERROR:",
        err?.response?.data || err
      );

      setPasswordError(
        getFriendlyError(
          err,
          "Cannot change password. Please check your current password and try again."
        )
      );
    } finally {
      setChangingPassword(false);
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
  const reviewSummary = buildReviewSummary(reviews);

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

                <button
                  type="button"
                  onClick={openChangePasswordModal}
                  className="rounded-xl border border-indigo-400/50 bg-indigo-400/10 px-5 py-3 text-center text-sm font-bold text-indigo-200 transition hover:bg-indigo-400 hover:text-white"
                >
                  Change Password
                </button>

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

              <Card title="Client Reviews">
                {reviewsLoading ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-gray-400">
                    Loading reviews...
                  </div>
                ) : reviewsError ? (
                  <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4">
                    <p className="text-sm font-bold text-red-300">
                      Reviews are unavailable
                    </p>
                    <p className="mt-1 text-xs leading-5 text-red-100/80">
                      {reviewsError}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        loadExpertReviews(
                          profile?.expertProfileId ||
                            profile?.ExpertProfileId ||
                            profile?.id ||
                            profile?.Id
                        )
                      }
                      className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-400 hover:text-black"
                    >
                      Try Again
                    </button>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                    <span className="material-symbols-outlined mb-2 block text-4xl text-gray-600">
                      reviews
                    </span>
                    <p className="font-bold text-white">No reviews yet</p>
                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      Client reviews will appear after completed projects.
                    </p>
                  </div>
                ) : (
                  <div>
                    <ReviewRatingOverview summary={reviewSummary} />

                    <div className="space-y-3">
                      {reviews.map((review, index) => (
                        <ReviewItem
                          key={review.reviewId || review.id || index}
                          review={review}
                        />
                      ))}
                    </div>
                  </div>
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

      {showChangePasswordModal && (
        <ChangePasswordModal
          form={passwordForm}
          errors={passwordErrors}
          error={passwordError}
          message={passwordMessage}
          loading={changingPassword}
          onChange={updatePasswordField}
          onClose={closeChangePasswordModal}
          onSubmit={handleChangePassword}
        />
      )}
    </ExpertLayout>
  );
}

function ChangePasswordModal({
  form,
  errors,
  error,
  message,
  loading,
  onChange,
  onClose,
  onSubmit,
}) {
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const togglePassword = (name) => {
    setShowPasswords((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={onSubmit}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-indigo-400/30 bg-[#151a22] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.75)]"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
              Account Security
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Change Password
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Enter your current password and choose a new password for your
              account.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close change password modal"
          >
            <span className="material-symbols-outlined text-[24px]">
              close
            </span>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <PasswordInput
            label="Current Password"
            value={form.currentPassword}
            show={showPasswords.currentPassword}
            error={errors.currentPassword}
            disabled={loading}
            autoComplete="current-password"
            placeholder="Enter your current password"
            onChange={(value) => onChange("currentPassword", value)}
            onToggle={() => togglePassword("currentPassword")}
          />

          <PasswordInput
            label="New Password"
            value={form.newPassword}
            show={showPasswords.newPassword}
            error={errors.newPassword}
            disabled={loading}
            autoComplete="new-password"
            placeholder="Enter your new password"
            onChange={(value) => onChange("newPassword", value)}
            onToggle={() => togglePassword("newPassword")}
          />

          <PasswordInput
            label="Confirm New Password"
            value={form.confirmNewPassword}
            show={showPasswords.confirmNewPassword}
            error={errors.confirmNewPassword}
            disabled={loading}
            autoComplete="new-password"
            placeholder="Enter your new password again"
            onChange={(value) => onChange("confirmNewPassword", value)}
            onToggle={() => togglePassword("confirmNewPassword")}
          />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-400 px-5 py-3 text-sm font-black text-black transition hover:bg-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[19px]">
              lock_reset
            </span>
            {loading ? "Changing..." : "Change Password"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  show,
  error,
  disabled,
  autoComplete,
  placeholder,
  onChange,
  onToggle,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-gray-400">
        {label}
        <span className="ml-1 text-red-400">*</span>
      </span>

      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-500">
          lock
        </span>

        <input
          type={show ? "text" : "password"}
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`h-12 w-full rounded-xl border bg-white/[0.04] pl-12 pr-12 text-sm font-semibold text-white outline-none transition placeholder:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60 ${
            error
              ? "border-red-400/70 focus:border-red-400"
              : "border-white/10 focus:border-indigo-400"
          }`}
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {show ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs font-semibold text-red-300">
          {error}
        </p>
      )}
    </label>
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

function ReviewRatingOverview({ summary }) {
  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-yellow-300/20 bg-gradient-to-br from-yellow-300/[0.10] via-white/[0.025] to-transparent p-5">
      <div className="grid gap-5 md:grid-cols-[210px_1fr] md:items-center">
        <div className="text-center md:border-r md:border-white/10 md:pr-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-yellow-200/70">
            Average Rating
          </p>

          <div className="mt-2 flex items-end justify-center gap-1.5">
            <span className="text-5xl font-black leading-none text-white">
              {summary.averageText}
            </span>
            <span className="pb-1 text-sm font-bold text-gray-500">/ 5</span>
          </div>

          <div className="mt-3 flex justify-center">
            <AverageStars rating={summary.average} />
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Based on {summary.total} client review{summary.total === 1 ? "" : "s"}
          </p>
        </div>

        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.distribution[star] || 0;
            const percentage = summary.total > 0
              ? Math.round((count / summary.total) * 100)
              : 0;

            return (
              <div key={star} className="grid grid-cols-[30px_1fr_34px] items-center gap-2">
                <span className="text-xs font-bold text-gray-400">
                  {star}★
                </span>

                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-yellow-300 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <span className="text-right text-xs font-semibold text-gray-500">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
        <div className="rounded-xl bg-black/10 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
            Total Reviews
          </p>
          <p className="mt-1 text-lg font-black text-white">{summary.total}</p>
        </div>

        <div className="rounded-xl bg-black/10 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
            5-Star Reviews
          </p>
          <p className="mt-1 text-lg font-black text-white">
            {summary.fiveStarCount}
          </p>
        </div>
      </div>
    </div>
  );
}

function AverageStars({ rating }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating || 0)));
  const fillPercentage = `${(safeRating / 5) * 100}%`;

  return (
    <div className="relative inline-flex" aria-label={`${safeRating.toFixed(1)} out of 5 stars`}>
      <div className="flex text-gray-700">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className="material-symbols-outlined text-[23px]">
            star
          </span>
        ))}
      </div>

      <div
        className="absolute inset-y-0 left-0 overflow-hidden text-yellow-300"
        style={{ width: fillPercentage }}
      >
        <div className="flex w-max">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className="material-symbols-outlined text-[23px]">
              star
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ review }) {
  const rating = Math.max(0, Math.min(5, Number(review?.rating || 0)));

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <ReviewAvatar
              name={review?.reviewerName}
              avatarUrl={review?.reviewerAvatarUrl}
            />

            <div className="min-w-0">
              <p className="truncate font-bold text-white">
                {review?.reviewerName || "Client"}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {review?.projectTitle || "Completed project"}
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className="flex items-center gap-1 sm:justify-end">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className={`material-symbols-outlined text-[18px] ${
                  index < rating ? "text-yellow-300" : "text-gray-700"
                }`}
              >
                star
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-600">
            {formatReviewDate(review?.createdAt)}
          </p>
        </div>
      </div>

      {review?.comment ? (
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
          {review.comment}
        </p>
      ) : (
        <p className="mt-4 text-sm italic text-gray-600">
          No written feedback was provided.
        </p>
      )}
    </article>
  );
}

function ReviewAvatar({ name, avatarUrl }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "Client"}
        className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-sm font-black text-cyan-300">
      {getReviewInitials(name)}
    </div>
  );
}

function buildReviewSummary(reviews = []) {
  const list = Array.isArray(reviews) ? reviews : [];

  const validRatings = list
    .map((review) => Number(review?.rating))
    .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);

  const total = validRatings.length;
  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  validRatings.forEach((rating) => {
    const normalizedStar = Math.max(1, Math.min(5, Math.round(rating)));
    distribution[normalizedStar] += 1;
  });

  if (total === 0) {
    return {
      total: 0,
      average: 0,
      averageText: "0.0",
      fiveStarCount: 0,
      distribution,
    };
  }

  const ratingTotal = validRatings.reduce((sum, rating) => sum + rating, 0);
  const average = ratingTotal / total;

  return {
    total,
    average,
    averageText: average.toFixed(1),
    fiveStarCount: distribution[5],
    distribution,
  };
}

function getReviewInitials(name) {
  if (!name) return "CL";

  return String(name)
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((item) => item[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatReviewDate(value) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

function getFriendlyError(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;

  if (typeof data === "string") return data;

  return (
    data?.message ||
    data?.title ||
    data?.detail ||
    error?.message ||
    fallback
  );
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