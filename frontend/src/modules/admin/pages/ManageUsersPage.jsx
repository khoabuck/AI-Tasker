import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminUserService from "../../../services/adminUser.service";

export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await adminUserService.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error("LOAD ADMIN USERS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return users.filter((user) => {
      const name = getFullName(user).toLowerCase();
      const email = getEmail(user).toLowerCase();
      const role = String(getRole(user)).toUpperCase();
      const status = getComputedStatus(user);

      const matchSearch =
        !keyword ||
        name.includes(keyword) ||
        email.includes(keyword) ||
        String(getUserId(user) || "").includes(keyword);

      const matchRole =
        roleFilter === "ALL" || role === roleFilter.toUpperCase();

      const matchStatus =
        statusFilter === "ALL" || status === statusFilter.toUpperCase();

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchText, roleFilter, statusFilter]);

  const summary = useMemo(() => {
    const activeUsers = users.filter(
      (user) => getComputedStatus(user) === "ACTIVE"
    );

    const lockedUsers = users.filter(
      (user) => getComputedStatus(user) === "LOCKED"
    );

    const bannedUsers = users.filter(
      (user) => getComputedStatus(user) === "BANNED"
    );

    const admins = users.filter(
      (user) => String(getRole(user)).toUpperCase() === "ADMIN"
    );

    return {
      total: users.length,
      active: activeUsers.length,
      locked: lockedUsers.length,
      banned: bannedUsers.length,
      admins: admins.length,
    };
  }, [users]);

  const handleLockUser = async (user) => {
    const userId = getUserId(user);

    if (!userId) {
      setError("Invalid user id.");
      return;
    }

    const reason = window.prompt(
      `Enter lock reason for ${getFullName(user)}:`,
      getLockReason(user) || ""
    );

    if (reason === null) return;

    if (!reason.trim()) {
      setError("Lock reason is required.");
      return;
    }

    const lockoutEnd = window.prompt(
      "Enter lockout end time. Example: 2026-06-25T18:00:00. Leave empty if backend allows indefinite lock:",
      getLockoutEnd(user) || ""
    );

    if (lockoutEnd === null) return;

    const confirmLock = window.confirm(
      `Are you sure you want to lock ${getFullName(user)}?`
    );

    if (!confirmLock) return;

    try {
      setActionLoadingId(userId);
      setMessage("");
      setError("");

      await adminUserService.lockUser(userId, {
        reason: reason.trim(),
        lockoutEnd: lockoutEnd.trim() || null,
      });

      setMessage("User locked successfully.");
      await loadUsers();
    } catch (err) {
      console.error("LOCK USER ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnlockUser = async (user) => {
    const userId = getUserId(user);

    if (!userId) {
      setError("Invalid user id.");
      return;
    }

    const confirmUnlock = window.confirm(
      `Are you sure you want to unlock ${getFullName(user)}?`
    );

    if (!confirmUnlock) return;

    try {
      setActionLoadingId(userId);
      setMessage("");
      setError("");

      await adminUserService.unlockUser(userId);

      setMessage("User unlocked successfully.");
      await loadUsers();
    } catch (err) {
      console.error("UNLOCK USER ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBanUser = async (user) => {
    const userId = getUserId(user);

    if (!userId) {
      setError("Invalid user id.");
      return;
    }

    const reason = window.prompt(
      `Enter ban reason for ${getFullName(user)}:`,
      getBanReason(user) || ""
    );

    if (reason === null) return;

    if (!reason.trim()) {
      setError("Ban reason is required.");
      return;
    }

    const confirmBan = window.confirm(
      `Are you sure you want to permanently ban ${getFullName(user)}?`
    );

    if (!confirmBan) return;

    try {
      setActionLoadingId(userId);
      setMessage("");
      setError("");

      await adminUserService.banUser(userId, {
        reason: reason.trim(),
      });

      setMessage("User banned successfully.");
      await loadUsers();
    } catch (err) {
      console.error("BAN USER ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const labelStyle =
    "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Admin Users
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Manage users
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                View users, account roles, lock state, ban state and account
                activity.
              </p>
            </div>

            <button
              type="button"
              onClick={loadUsers}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
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

          {/* Summary */}
          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
            <SummaryCard label="Total" value={summary.total} icon="groups" />
            <SummaryCard
              label="Active"
              value={summary.active}
              icon="verified_user"
              tone="green"
            />
            <SummaryCard
              label="Locked"
              value={summary.locked}
              icon="lock"
              tone="yellow"
            />
            <SummaryCard
              label="Banned"
              value={summary.banned}
              icon="block"
              tone="red"
            />
            <SummaryCard
              label="Admins"
              value={summary.admins}
              icon="admin_panel_settings"
              tone="cyan"
            />
          </section>

          {/* Filter */}
          <section className={`${cardStyle} mb-6 p-6`}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_180px_180px_150px]">
              <div>
                <label className={labelStyle}>Search User</label>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    search
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search by id, name or email..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div>
                <label className={labelStyle}>Role</label>

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  <option value="ALL">All roles</option>
                  <option value="CLIENT">Client</option>
                  <option value="EXPERT">Expert</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <label className={labelStyle}>Status</label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  <option value="ALL">All status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="LOCKED">Locked</option>
                  <option value="BANNED">Banned</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Showing
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {filteredUsers.length}
                </p>
              </div>
            </div>
          </section>

          {/* Loading */}
          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading users...
            </div>
          )}

          {/* Empty */}
          {!loading && filteredUsers.length === 0 && (
            <div className={`${cardStyle} p-12 text-center`}>
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                groups
              </span>

              <h2 className="text-xl font-bold text-white">No users found</h2>

              <p className="mt-2 text-sm text-gray-400">
                There are no users that match your filter.
              </p>
            </div>
          )}

          {/* User list */}
          {!loading && filteredUsers.length > 0 && (
            <div className="grid grid-cols-1 gap-5">
              {filteredUsers.map((user) => {
                const userId = getUserId(user);
                const role = getRole(user);
                const status = getComputedStatus(user);
                const locked = isLocked(user);
                const banned = isBanned(user);
                const actionLoading = actionLoadingId === userId;

                return (
                  <article
                    key={userId}
                    className={`${cardStyle} p-6 transition hover:border-cyan-400/40`}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex flex-1 gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-lg font-bold text-cyan-300">
                          {getInitials(getFullName(user))}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getRoleClass(
                                role
                              )}`}
                            >
                              {role}
                            </span>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>

                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                              Joined {formatDate(getCreatedAt(user))}
                            </span>
                          </div>

                          <h2 className="truncate text-xl font-bold text-white">
                            {getFullName(user)}
                          </h2>

                          <p className="mt-1 truncate text-sm text-gray-400">
                            {getEmail(user)}
                          </p>

                          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                            <InfoBox label="User ID" value={userId || "N/A"} />
                            <InfoBox
                              label="Auth Provider"
                              value={user.authProvider || "N/A"}
                            />
                            <InfoBox
                              label="Email Verified"
                              value={user.isEmailVerified ? "Yes" : "No"}
                            />
                          </div>

                          {(locked || banned || getLockReason(user) || getBanReason(user)) && (
                            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                                Restriction Info
                              </p>

                              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                                {getLockReason(user) && (
                                  <InfoBox
                                    label="Lock Reason"
                                    value={getLockReason(user)}
                                  />
                                )}

                                {getLockoutEnd(user) && (
                                  <InfoBox
                                    label="Lockout End"
                                    value={formatDateTime(getLockoutEnd(user))}
                                  />
                                )}

                                {getBanReason(user) && (
                                  <InfoBox
                                    label="Ban Reason"
                                    value={getBanReason(user)}
                                  />
                                )}

                                {getBannedAt(user) && (
                                  <InfoBox
                                    label="Banned At"
                                    value={formatDateTime(getBannedAt(user))}
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-96">
                        <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">
                          Admin Actions
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            to={`/admin/users/${userId}`}
                            className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-center text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                          >
                            View Detail
                          </Link>

                          <button
                            type="button"
                            disabled={actionLoading || locked || banned}
                            onClick={() => handleLockUser(user)}
                            className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Lock
                          </button>

                          <button
                            type="button"
                            disabled={actionLoading || !locked || banned}
                            onClick={() => handleUnlockUser(user)}
                            className="rounded-lg border border-green-400/40 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Unlock
                          </button>

                          <button
                            type="button"
                            disabled={actionLoading || banned}
                            onClick={() => handleBanUser(user)}
                            className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Ban
                          </button>
                        </div>

                        {actionLoading && (
                          <p className="mt-3 text-xs text-gray-500">
                            Processing user action...
                          </p>
                        )}

                        {banned && (
                          <p className="mt-3 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
                            This user is banned. Unlock action is disabled.
                          </p>
                        )}

                        {locked && !banned && (
                          <p className="mt-3 rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-xs text-yellow-300">
                            This user is currently locked.
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ label, value, icon, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value ?? 0}</p>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-gray-200">
        {value || "N/A"}
      </p>
    </div>
  );
}

function getUserId(user) {
  return user?.userId || user?.id || user?.userID || user?.UserId;
}

function getFullName(user) {
  return (
    user?.fullName ||
    user?.name ||
    user?.userName ||
    user?.displayName ||
    "Unknown User"
  );
}

function getEmail(user) {
  return user?.email || user?.emailAddress || "No email";
}

function getRole(user) {
  return user?.role || user?.userRole || "USER";
}

function getStatus(user) {
  return user?.status || user?.accountStatus || "ACTIVE";
}

function getCreatedAt(user) {
  return user?.createdAt || user?.createdDate || user?.registeredAt;
}

function getLockReason(user) {
  return user?.lockReason || user?.LockReason || "";
}

function getLockoutEnd(user) {
  return user?.lockoutEnd || user?.LockoutEnd || null;
}

function getBanReason(user) {
  return user?.banReason || user?.BanReason || "";
}

function getBannedAt(user) {
  return user?.bannedAt || user?.BannedAt || null;
}

function isLocked(user) {
  const status = String(getStatus(user)).toUpperCase();
  const lockoutEnd = getLockoutEnd(user);

  if (status === "LOCKED" || status === "SUSPENDED") {
    return true;
  }

  if (!lockoutEnd) {
    return false;
  }

  const lockoutEndDate = new Date(lockoutEnd);

  if (Number.isNaN(lockoutEndDate.getTime())) {
    return false;
  }

  return lockoutEndDate.getTime() > Date.now();
}

function isBanned(user) {
  const status = String(getStatus(user)).toUpperCase();

  return status === "BANNED" || Boolean(getBannedAt(user));
}

function getComputedStatus(user) {
  if (isBanned(user)) return "BANNED";
  if (isLocked(user)) return "LOCKED";

  return String(getStatus(user)).toUpperCase();
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
  const value = String(role).toUpperCase();

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
  const value = String(status).toUpperCase();

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

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    return "Admin users API was not found. Please check backend route.";
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