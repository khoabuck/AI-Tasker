import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminUserService from "../../../services/adminUser.service";

export default function AdminUserDetailPage() {
  const { userId } = useParams();

  const [user, setUser] = useState(null);

  const [lockForm, setLockForm] = useState({
    reason: "",
    lockoutEnd: "",
  });

  const [banForm, setBanForm] = useState({
    reason: "",
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const computedStatus = useMemo(() => getComputedStatus(user), [user]);
  const locked = useMemo(() => isLocked(user), [user]);
  const banned = useMemo(() => isBanned(user), [user]);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await adminUserService.getUserById(userId);

      setUser(data);

      setLockForm({
        reason: data?.lockReason || "",
        lockoutEnd: toDateTimeLocalValue(data?.lockoutEnd),
      });

      setBanForm({
        reason: data?.banReason || "",
      });
    } catch (err) {
      console.error("LOAD ADMIN USER DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLockUser = async (event) => {
    event.preventDefault();

    if (!lockForm.reason.trim()) {
      setError("Lock reason is required.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to lock this user?");

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await adminUserService.lockUser(userId, {
        reason: lockForm.reason.trim(),
        lockoutEnd: lockForm.lockoutEnd || null,
      });

      setMessage("User locked successfully.");
      await loadUser();
    } catch (err) {
      console.error("LOCK USER ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockUser = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to unlock this user?"
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await adminUserService.unlockUser(userId);

      setMessage("User unlocked successfully.");
      await loadUser();
    } catch (err) {
      console.error("UNLOCK USER ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async (event) => {
    event.preventDefault();

    if (!banForm.reason.trim()) {
      setError("Ban reason is required.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to ban this user? This action may be permanent."
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await adminUserService.banUser(userId, {
        reason: banForm.reason.trim(),
      });

      setMessage("User banned successfully.");
      await loadUser();
    } catch (err) {
      console.error("BAN USER ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]";

  const labelStyle =
    "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <Link
                to="/admin/users"
                className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
              >
                <span className="material-symbols-outlined text-base">
                  arrow_back
                </span>
                Back to users
              </Link>

              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                User Detail
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                {user?.fullName || "Admin User Detail"}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Review account information, security status, lock history and
                ban state.
              </p>
            </div>

            <button
              type="button"
              onClick={loadUser}
              disabled={loading || actionLoading}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-300">
              {message}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading user detail...
            </div>
          )}

          {/* Not found */}
          {!loading && !user && (
            <div className={`${cardStyle} p-12 text-center`}>
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                person_off
              </span>

              <h2 className="text-xl font-bold text-white">User not found</h2>

              <p className="mt-2 text-sm text-gray-400">
                The selected user does not exist or you do not have permission
                to view this account.
              </p>
            </div>
          )}

          {!loading && user && (
            <>
              {/* Top profile card */}
              <section className={`${cardStyle} mb-6 p-6`}>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-2xl font-bold text-cyan-300">
                      {getInitials(user.fullName)}
                    </div>

                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getRoleClass(
                            user.role
                          )}`}
                        >
                          {user.role || "USER"}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                            computedStatus
                          )}`}
                        >
                          {computedStatus}
                        </span>

                        {user.isEmailVerified && (
                          <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-300">
                            Email Verified
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl font-bold text-white">
                        {user.fullName || "Unknown User"}
                      </h2>

                      <p className="mt-1 text-sm text-gray-400">
                        {user.email || "No email"}
                      </p>

                      <p className="mt-2 text-xs text-gray-500">
                        User ID: {user.userId || user.id || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-4 lg:w-[520px]">
                    <MiniStat label="Status" value={computedStatus} />
                    <MiniStat label="Role" value={user.role || "USER"} />
                    <MiniStat
                      label="Lock Count"
                      value={user.lockoutCount ?? 0}
                    />
                    <MiniStat
                      label="Provider"
                      value={user.authProvider || "N/A"}
                    />
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
                {/* Left */}
                <div className="space-y-6">
                  {/* Account info */}
                  <section className={`${cardStyle} p-6`}>
                    <SectionTitle
                      icon="account_circle"
                      title="Account Information"
                    />

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <InfoItem label="Full Name" value={user.fullName} />
                      <InfoItem label="Email" value={user.email} />
                      <InfoItem label="Phone Number" value={user.phoneNumber} />
                      <InfoItem label="Role" value={user.role} />
                      <InfoItem label="Status" value={computedStatus} />
                      <InfoItem
                        label="Email Verified"
                        value={user.isEmailVerified ? "Yes" : "No"}
                      />
                      <InfoItem
                        label="Auth Provider"
                        value={user.authProvider}
                      />
                      <InfoItem
                        label="Status Before Suspension"
                        value={user.statusBeforeSuspension}
                      />
                    </div>
                  </section>

                  {/* Profile linkage */}
                  <section className={`${cardStyle} p-6`}>
                    <SectionTitle icon="badge" title="Profile Links" />

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <InfoItem
                        label="Expert Profile ID"
                        value={user.expertProfileId}
                      />
                      <InfoItem
                        label="Client Profile ID"
                        value={user.clientProfileId}
                      />
                    </div>
                  </section>

                  {/* Security / restriction */}
                  <section className={`${cardStyle} p-6`}>
                    <SectionTitle icon="security" title="Restriction State" />

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <InfoItem
                        label="Lock Reason"
                        value={user.lockReason || "Not locked"}
                      />
                      <InfoItem
                        label="Lockout Count"
                        value={user.lockoutCount ?? 0}
                      />
                      <InfoItem
                        label="Lockout End"
                        value={formatDateTime(user.lockoutEnd)}
                      />
                      <InfoItem
                        label="Last Locked At"
                        value={formatDateTime(user.lastLockedAt)}
                      />
                      <InfoItem
                        label="Ban Reason"
                        value={user.banReason || "Not banned"}
                      />
                      <InfoItem
                        label="Banned At"
                        value={formatDateTime(user.bannedAt)}
                      />
                    </div>
                  </section>

                  {/* Dates */}
                  <section className={`${cardStyle} p-6`}>
                    <SectionTitle icon="event" title="Account Timeline" />

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                      <InfoItem
                        label="Created At"
                        value={formatDateTime(user.createdAt)}
                      />
                      <InfoItem
                        label="Updated At"
                        value={formatDateTime(user.updatedAt)}
                      />
                      <InfoItem
                        label="Last Login At"
                        value={formatDateTime(user.lastLoginAt)}
                      />
                    </div>
                  </section>

                  {/* Raw debug */}
                  <section className={`${cardStyle} p-6`}>
                    <details>
                      <summary className="cursor-pointer text-sm font-bold text-gray-300">
                        Raw user data
                      </summary>

                      <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-gray-300">
                        {JSON.stringify(user.raw || user, null, 2)}
                      </pre>
                    </details>
                  </section>
                </div>

                {/* Right action panel */}
                <aside className="space-y-6">
                  {/* Lock panel */}
                  <section className={`${cardStyle} p-6`}>
                    <SectionTitle icon="lock" title="Lock User" />

                    <p className="mb-5 text-sm leading-6 text-gray-400">
                      Lock prevents the user from using the account until the
                      lockout end time, depending on backend rules.
                    </p>

                    <form onSubmit={handleLockUser} className="space-y-4">
                      <div>
                        <label className={labelStyle}>Lock Reason</label>

                        <textarea
                          value={lockForm.reason}
                          onChange={(event) =>
                            setLockForm((prev) => ({
                              ...prev,
                              reason: event.target.value,
                            }))
                          }
                          rows={4}
                          placeholder="Explain why this account is locked..."
                          className={inputStyle}
                        />
                      </div>

                      <div>
                        <label className={labelStyle}>
                          Lockout End Optional
                        </label>

                        <input
                          type="datetime-local"
                          value={lockForm.lockoutEnd}
                          onChange={(event) =>
                            setLockForm((prev) => ({
                              ...prev,
                              lockoutEnd: event.target.value,
                            }))
                          }
                          className={inputStyle}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={actionLoading || locked || banned}
                        className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {locked ? "User Already Locked" : "Lock User"}
                      </button>
                    </form>
                  </section>

                  {/* Unlock panel */}
                  <section className={`${cardStyle} p-6`}>
                    <SectionTitle icon="lock_open" title="Unlock User" />

                    <p className="mb-5 text-sm leading-6 text-gray-400">
                      Unlock removes the current lock state. It does not unban a
                      banned account.
                    </p>

                    <button
                      type="button"
                      onClick={handleUnlockUser}
                      disabled={actionLoading || !locked || banned}
                      className="w-full rounded-xl border border-green-400/40 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Unlock User
                    </button>

                    {banned && (
                      <p className="mt-3 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
                        This account is banned. Unlock is disabled.
                      </p>
                    )}
                  </section>

                  {/* Ban panel */}
                  <section className={`${cardStyle} p-6`}>
                    <SectionTitle icon="block" title="Ban User" />

                    <p className="mb-5 text-sm leading-6 text-gray-400">
                      Ban is a stronger restriction than lock. Use this only for
                      severe policy violations.
                    </p>

                    <form onSubmit={handleBanUser} className="space-y-4">
                      <div>
                        <label className={labelStyle}>Ban Reason</label>

                        <textarea
                          value={banForm.reason}
                          onChange={(event) =>
                            setBanForm((prev) => ({
                              ...prev,
                              reason: event.target.value,
                            }))
                          }
                          rows={4}
                          placeholder="Explain why this account is banned..."
                          className={inputStyle}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={actionLoading || banned}
                        className="w-full rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {banned ? "User Already Banned" : "Ban User"}
                      </button>
                    </form>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <h2 className="text-lg font-bold text-white">{title}</h2>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-gray-200">
        {value || "N/A"}
      </p>
    </div>
  );
}

function isLocked(user) {
  if (!user) return false;

  const status = String(user.status || "").toUpperCase();

  if (status === "LOCKED" || status === "SUSPENDED") {
    return true;
  }

  if (!user.lockoutEnd) {
    return false;
  }

  const lockoutEndDate = new Date(user.lockoutEnd);

  if (Number.isNaN(lockoutEndDate.getTime())) {
    return false;
  }

  return lockoutEndDate.getTime() > Date.now();
}

function isBanned(user) {
  if (!user) return false;

  const status = String(user.status || "").toUpperCase();

  return status === "BANNED" || Boolean(user.bannedAt);
}

function getComputedStatus(user) {
  if (!user) return "UNKNOWN";

  if (isBanned(user)) return "BANNED";
  if (isLocked(user)) return "LOCKED";

  return String(user.status || "ACTIVE").toUpperCase();
}

function getInitials(name) {
  if (!name) return "U";

  return name
    .split(" ")
    .map((item) => item[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getRoleClass(role) {
  const value = String(role || "").toUpperCase();

  if (value === "ADMIN") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  if (value === "EXPERT") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
  }

  if (value === "CLIENT") {
    return "border-green-400/30 bg-green-400/10 text-green-300";
  }

  return "border-gray-400/30 bg-gray-400/10 text-gray-300";
}

function getStatusClass(status) {
  const value = String(status || "").toUpperCase();

  if (value === "ACTIVE" || value === "VERIFIED") {
    return "border-green-400/30 bg-green-400/10 text-green-300";
  }

  if (value === "PENDING") {
    return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
  }

  if (value === "LOCKED" || value === "SUSPENDED") {
    return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
  }

  if (value === "BANNED") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  return "border-gray-400/30 bg-gray-400/10 text-gray-300";
}

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateTimeLocalValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);

  return localDate.toISOString().slice(0, 16);
}

function getFriendlyError(err) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request because the current token does not have ADMIN permission.";
  }

  if (status === 404) {
    return "Admin user API was not found. Please check backend route.";
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