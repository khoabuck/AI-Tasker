import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminUserService from "../../../services/adminUser.service";

const ROLE_OPTIONS = ["ALL", "CLIENT", "EXPERT", "USER"];
const STATUS_OPTIONS = ["ALL", "ACTIVE", "LOCKED", "BANNED"];

const EMPTY_ACTION = {
  type: "",
  user: null,
};

const EMPTY_LOCK_FORM = {
  durationMinutes: "60",
  reason: "",
};

const EMPTY_UNLOCK_FORM = {
  reason: "",
};

const EMPTY_BAN_FORM = {
  reason: "",
};

export default function ManageUsersPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalError, setModalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [action, setAction] = useState(EMPTY_ACTION);
  const [lockForm, setLockForm] = useState(EMPTY_LOCK_FORM);
  const [unlockForm, setUnlockForm] = useState(EMPTY_UNLOCK_FORM);
  const [banForm, setBanForm] = useState(EMPTY_BAN_FORM);

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return users.filter((user) => {
      const role = String(user.role || "USER").toUpperCase();
      const status = getUserStatus(user);

      const matchSearch =
        !search ||
        String(user.fullName || "").toLowerCase().includes(search) ||
        String(user.email || "").toLowerCase().includes(search) ||
        String(user.phoneNumber || "").toLowerCase().includes(search);

      const matchRole = roleFilter === "ALL" || role === roleFilter;
      const matchStatus = statusFilter === "ALL" || status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, keyword, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    return users.reduce(
      (result, user) => {
        const role = String(user.role || "USER").toUpperCase();
        const status = getUserStatus(user);

        result.total += 1;

        if (role === "ADMIN") result.admins += 1;
        if (role === "CLIENT") result.clients += 1;
        if (role === "EXPERT") result.experts += 1;

        if (status === "ACTIVE") result.active += 1;
        if (status === "LOCKED") result.locked += 1;
        if (status === "BANNED") result.banned += 1;

        return result;
      },
      {
        total: 0,
        admins: 0,
        clients: 0,
        experts: 0,
        active: 0,
        locked: 0,
        banned: 0,
      }
    );
  }, [users]);

  const loadUsers = async ({ keepMessage = false } = {}) => {
    try {
      setLoading(true);
      setError("");

      if (!keepMessage) {
        setSuccess("");
      }

     const data = await adminUserService.getAllUsers();

const visibleUsers = Array.isArray(data)
  ? data.filter((user) => String(user.role || "").toUpperCase() !== "ADMIN")
  : [];

setUsers(visibleUsers);
    } catch (err) {
      console.error("LOAD ADMIN USERS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load users."));
    } finally {
      setLoading(false);
    }
  };

  const openLockModal = (user) => {
    setAction({
      type: "LOCK",
      user,
    });

    setLockForm(EMPTY_LOCK_FORM);
    setModalError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
  };

  const openUnlockModal = (user) => {
    setAction({
      type: "UNLOCK",
      user,
    });

    setUnlockForm(EMPTY_UNLOCK_FORM);
    setModalError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
  };

  const openBanModal = (user) => {
    setAction({
      type: "BAN",
      user,
    });

    setBanForm(EMPTY_BAN_FORM);
    setModalError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
  };

  const closeActionModal = () => {
    if (actionLoading) return;

    setAction(EMPTY_ACTION);
    setLockForm(EMPTY_LOCK_FORM);
    setUnlockForm(EMPTY_UNLOCK_FORM);
    setBanForm(EMPTY_BAN_FORM);
    setModalError("");
    setFieldErrors({});
  };

  const handleLockUser = async () => {
    if (!action.user?.userId) return;

    const errors = {};
    const durationText = String(lockForm.durationMinutes ?? "").trim();

    if (!durationText) {
      errors.durationMinutes = "Lock duration is required.";
    } else if (!/^\d+$/.test(durationText)) {
      errors.durationMinutes = "Lock duration must be a whole number.";
    } else if (Number(durationText) <= 0) {
      errors.durationMinutes = "Lock duration must be greater than 0.";
    }

    if (!lockForm.reason.trim()) {
      errors.reason = "Lock Reason is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setModalError("Please fix the highlighted fields.");
      return;
    }

    try {
      setActionLoading(true);
      setModalError("");
      setFieldErrors({});
      setError("");
      setSuccess("");

      await adminUserService.lockUser(action.user.userId, {
        durationMinutes: Number(durationText),
        reason: lockForm.reason.trim(),
      });

      const userLabel = action.user.email || action.user.fullName || "User";

      closeActionModal();
      await loadUsers({ keepMessage: true });
      setSuccess(`${userLabel} has been locked successfully.`);
    } catch (err) {
      console.error("LOCK USER ERROR:", err?.response?.data || err);
      setModalError(getFriendlyError(err, "Cannot lock user."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockUser = async () => {
    if (!action.user?.userId) return;

    const errors = {};

    if (!unlockForm.reason.trim()) {
      errors.reason = "Unlock Reason is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setModalError("Please fix the highlighted fields.");
      return;
    }

    try {
      setActionLoading(true);
      setModalError("");
      setFieldErrors({});
      setError("");
      setSuccess("");

      await adminUserService.unlockUser(action.user.userId, {
        reason: unlockForm.reason.trim(),
      });

      const userLabel = action.user.email || action.user.fullName || "User";

      closeActionModal();
      await loadUsers({ keepMessage: true });
      setSuccess(`${userLabel} has been unlocked successfully.`);
    } catch (err) {
      console.error("UNLOCK USER ERROR:", err?.response?.data || err);
      setModalError(getFriendlyError(err, "Cannot unlock user."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!action.user?.userId) return;

    const errors = {};

    if (!banForm.reason.trim()) {
      errors.reason = "Ban Reason is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setModalError("Please fix the highlighted fields.");
      return;
    }

    try {
      setActionLoading(true);
      setModalError("");
      setFieldErrors({});
      setError("");
      setSuccess("");

      await adminUserService.banUser(action.user.userId, {
        reason: banForm.reason.trim(),
      });

      const userLabel = action.user.email || action.user.fullName || "User";

      closeActionModal();
      await loadUsers({ keepMessage: true });
      setSuccess(`${userLabel} has been banned successfully.`);
    } catch (err) {
      console.error("BAN USER ERROR:", err?.response?.data || err);
      setModalError(getFriendlyError(err, "Cannot ban user."));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              User Management
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Manage users
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              View all platform users, filter by role or status, lock suspicious
              accounts, unlock accounts, or ban serious violations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadUsers()}
            disabled={loading || actionLoading}
            className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <Alert
            type="danger"
            title="Action failed"
            message={error}
            onClose={() => setError("")}
          />
        )}

        {success && (
          <Alert
            type="success"
            title="Success"
            message={success}
            onClose={() => setSuccess("")}
          />
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon="groups"
            label="Total Users"
            value={stats.total}
            description={`${stats.clients} clients · ${stats.experts} experts`}
            tone="cyan"
          />

          <StatCard
            icon="verified_user"
            label="Active Users"
            value={stats.active}
            description="Available accounts"
            tone="green"
          />

          <StatCard
            icon="lock"
            label="Locked Users"
            value={stats.locked}
            description="Temporarily restricted"
            tone="yellow"
          />

          <StatCard
            icon="block"
            label="Banned Users"
            value={stats.banned}
            description="Permanently restricted"
            tone="red"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px_180px]">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Search
              </label>

              <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4">
                <span className="material-symbols-outlined text-[20px] text-gray-500">
                  search
                </span>

                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
                />
              </div>
            </div>

            <FilterSelect
              label="Role"
              value={roleFilter}
              options={ROLE_OPTIONS}
              onChange={setRoleFilter}
            />

            <FilterSelect
              label="Status"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={setStatusFilter}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Users</h2>
              <p className="mt-1 text-sm text-gray-500">
                Showing {filteredUsers.length} of {users.length} accounts.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-white/10">
              {filteredUsers.map((user) => (
                <UserRow
                  key={user.userId || user.email}
                  user={user}
                  disabled={actionLoading}
                  onView={() => navigate(`/admin/users/${user.userId}`)}
                  onLock={() => openLockModal(user)}
                  onUnlock={() => openUnlockModal(user)}
                  onBan={() => openBanModal(user)}
                />
              ))}
            </div>
          )}
        </section>

        {action.type === "LOCK" && (
          <ActionModal
            title="Lock User"
            subtitle={action.user?.email || action.user?.fullName}
            confirmLabel="Lock User"
            confirmTone="yellow"
            loading={actionLoading}
            error={modalError}
            onClose={closeActionModal}
            onConfirm={handleLockUser}
          >
            <div className="space-y-4">
              <NumberInput
                label="Lock Duration (minutes)"
                required
                value={lockForm.durationMinutes}
                error={fieldErrors.durationMinutes}
                onChange={(value) => {
                  setModalError("");
                  setFieldErrors((prev) => ({
                    ...prev,
                    durationMinutes: "",
                  }));
                  setLockForm((prev) => ({
                    ...prev,
                    durationMinutes: value,
                  }));
                }}
                placeholder="60"
              />

              <TextArea
                label="Lock Reason"
                required
                value={lockForm.reason}
                error={fieldErrors.reason}
                onChange={(value) => {
                  setModalError("");
                  setFieldErrors((prev) => ({
                    ...prev,
                    reason: "",
                  }));
                  setLockForm((prev) => ({
                    ...prev,
                    reason: value,
                  }));
                }}
                placeholder="Example: Suspicious activity detected."
              />
            </div>
          </ActionModal>
        )}

        {action.type === "UNLOCK" && (
          <ActionModal
            title="Unlock User"
            subtitle={action.user?.email || action.user?.fullName}
            confirmLabel="Unlock User"
            confirmTone="green"
            loading={actionLoading}
            error={modalError}
            onClose={closeActionModal}
            onConfirm={handleUnlockUser}
          >
            <TextArea
              label="Unlock Reason"
              required
              value={unlockForm.reason}
              error={fieldErrors.reason}
              onChange={(value) => {
                setModalError("");
                setFieldErrors((prev) => ({
                  ...prev,
                  reason: "",
                }));
                setUnlockForm((prev) => ({
                  ...prev,
                  reason: value,
                }));
              }}
              placeholder="Example: User identity has been verified."
            />
          </ActionModal>
        )}

        {action.type === "BAN" && (
          <ActionModal
            title="Ban User"
            subtitle={action.user?.email || action.user?.fullName}
            confirmLabel="Ban User"
            confirmTone="red"
            loading={actionLoading}
            error={modalError}
            onClose={closeActionModal}
            onConfirm={handleBanUser}
          >
            <TextArea
              label="Ban Reason"
              required
              value={banForm.reason}
              error={fieldErrors.reason}
              onChange={(value) => {
                setModalError("");
                setFieldErrors((prev) => ({
                  ...prev,
                  reason: "",
                }));
                setBanForm((prev) => ({
                  ...prev,
                  reason: value,
                }));
              }}
              placeholder="Example: Repeated platform policy violation."
            />
          </ActionModal>
        )}
      </div>
    </AdminLayout>
  );
}

function UserRow({ user, disabled, onView, onLock, onUnlock, onBan }) {
  const status = getUserStatus(user);
  const isLocked = status === "LOCKED";
  const isBanned = status === "BANNED";

  return (
    <article className="p-5 transition hover:bg-white/[0.02]">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_160px_160px_300px] xl:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-3">
            <UserAvatar
              name={user.fullName || user.email}
              avatarUrl={user.avatarUrl}
            />

            <div className="min-w-0">
              <h3 className="truncate font-bold text-white">
                {user.fullName || "Unknown User"}
              </h3>

              <p className="truncate text-sm text-gray-400">
                {user.email || "No email"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge label={user.authProvider || "Local"} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Role
          </p>
          <RoleBadge role={user.role} />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Status
          </p>
          <StatusBadge status={status} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
          <button
            type="button"
            onClick={onView}
            disabled={disabled}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Detail
          </button>

          {isLocked ? (
            <button
              type="button"
              onClick={onUnlock}
              disabled={disabled || isBanned}
              className="rounded-xl border border-green-400/40 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Unlock
            </button>
          ) : (
            <button
              type="button"
              onClick={onLock}
              disabled={disabled || isBanned}
              className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lock
            </button>
          )}

          <button
            type="button"
            onClick={onBan}
            disabled={disabled || isBanned}
            className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ban
          </button>
        </div>
      </div>

      {(user.lockReason || user.lockoutEnd || user.banReason) && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-gray-400">
          {user.lockReason && (
            <p>
              <span className="font-bold text-yellow-300">Lock reason:</span>{" "}
              {user.lockReason}
            </p>
          )}

          {user.lockoutEnd && (
            <p className="mt-1">
              <span className="font-bold text-yellow-300">Lock until:</span>{" "}
              {formatDateTime(user.lockoutEnd)}
            </p>
          )}

          {user.banReason && (
            <p className="mt-1">
              <span className="font-bold text-red-300">Ban reason:</span>{" "}
              {user.banReason}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function StatCard({ icon, label, value, description, tone = "cyan" }) {
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

      <p className="mt-2 text-3xl font-bold text-white">
        {formatNumber(value)}
      </p>

      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-[#0d1117] px-4 text-sm font-bold text-white outline-none focus:border-cyan-400/50"
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {formatLabel(item)}
          </option>
        ))}
      </select>
    </div>
  );
}

function ActionModal({
  title,
  subtitle,
  children,
  confirmLabel,
  confirmTone = "cyan",
  loading,
  error,
  onClose,
  onConfirm,
}) {
  const confirmClass =
    confirmTone === "red"
      ? "border-red-400/50 bg-red-400/10 text-red-300 hover:bg-red-400 hover:text-black"
      : confirmTone === "yellow"
      ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400 hover:text-black"
      : confirmTone === "green"
      ? "border-green-400/50 bg-green-400/10 text-green-300 hover:bg-green-400 hover:text-black"
      : "border-cyan-400/50 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-black";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151a22] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {children}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl border px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`h-12 w-full rounded-xl border bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-gray-600 ${
          error
            ? "border-red-400/70 focus:border-red-400"
            : "border-white/10 focus:border-cyan-400/50"
        }`}
      />

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>
      ) : (
        <p className="mt-2 text-xs leading-5 text-gray-500">
          Example: 60 minutes means the account will be locked for 1 hour.
        </p>
      )}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={placeholder}
        className={`w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 ${
          error
            ? "border-red-400/70 focus:border-red-400"
            : "border-white/10 focus:border-cyan-400/50"
        }`}
      />

      {error && (
        <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>
      )}
    </div>
  );
}

function UserAvatar({ name, avatarUrl }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "User"}
        className="h-11 w-11 rounded-full border border-white/10 object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-sm font-bold text-cyan-300">
      {getInitials(name)}
    </div>
  );
}

function Badge({ label, tone = "default" }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : tone === "yellow"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-white/10 bg-white/[0.04] text-gray-400";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}
    >
      {label}
    </span>
  );
}

function RoleBadge({ role }) {
  const value = String(role || "USER").toUpperCase();

  const className =
    value === "ADMIN"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : value === "EXPERT"
      ? "border-purple-400/30 bg-purple-400/10 text-purple-300"
      : value === "CLIENT"
      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
      : "border-white/10 bg-white/[0.04] text-gray-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${className}`}
    >
      {formatLabel(value)}
    </span>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "ACTIVE").toUpperCase();

  const className =
    value === "ACTIVE"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : value === "LOCKED"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : value === "BANNED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-gray-400/30 bg-gray-400/10 text-gray-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${className}`}
    >
      {formatLabel(value)}
    </span>
  );
}

function Alert({ type, title, message, onClose }) {
  const className =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-200"
      : "border-red-500/30 bg-red-500/10 text-red-200";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm opacity-90">{message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold opacity-70 hover:opacity-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-12 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        manage_accounts
      </span>

      <h3 className="text-lg font-bold text-white">No users found</h3>

      <p className="mt-2 text-sm text-gray-400">
        Try changing the search keyword or filters.
      </p>
    </div>
  );
}

function getUserStatus(user) {
  const rawStatus = String(user?.status || "").toUpperCase();

  if (rawStatus === "BANNED" || user?.bannedAt || user?.banReason) {
    return "BANNED";
  }

  if (
    rawStatus === "LOCKED" ||
    rawStatus === "SUSPENDED" ||
    user?.lockoutEnd ||
    user?.lockReason
  ) {
    return "LOCKED";
  }

  return rawStatus || "ACTIVE";
}

function getInitials(name) {
  if (!name) return "US";

  return String(name)
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((item) => item[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatLabel(value) {
  if (!value) return "N/A";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN").format(
    Number.isNaN(number) ? 0 : number
  );
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
  hour12: false,
});
}

function getFriendlyError(err, fallback = "Something went wrong.") {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "You do not have permission to manage user accounts.";
  }

  if (status === 404) {
    return "User management is temporarily unavailable. Please try again later.";
  }

  const data = err?.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.title) return data.title;
  if (data?.detail) return data.detail;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || fallback;
}