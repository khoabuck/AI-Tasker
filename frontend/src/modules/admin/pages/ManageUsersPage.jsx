import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminUserService from "../../../services/adminUser.service";

import { formatDateTime } from "../../../utils/dateTime.utils";

// ===== Filter options and action form defaults =====
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

// ===== Admin user management page: search, filter, lock, unlock, ban =====
export default function ManageUsersPage() {
  // ===== Routing =====
  const navigate = useNavigate();

  // ===== User list and filters =====
  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ===== Loading and feedback state =====
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
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (!success) return;

    const timeoutId = window.setTimeout(() => {
      setSuccess("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [success]);

  useEffect(() => {
    loadUsers();
  }, []);

  // ===== Derived list and dashboard stats =====
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

  // ===== API loading: all non-admin users =====
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

  // ===== Action modal openers =====
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

  const executeLockUser = async () => {
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
      errors.reason = "Lock reason is required.";
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

  const executeUnlockUser = async () => {
    if (!action.user?.userId) return;

    const errors = {};

    if (!unlockForm.reason.trim()) {
      errors.reason = "Unlock reason is required.";
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

  const executeBanUser = async () => {
    if (!action.user?.userId) return;

    const errors = {};

    if (!banForm.reason.trim()) {
      errors.reason = "Ban reason is required.";
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

const requestLockUser = () => {
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
      errors.reason = "Lock reason is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setModalError("Please fix the highlighted fields.");
      return;
    }

    setFieldErrors({});
    setModalError("");
    setConfirmAction({
      type: "LOCK",
      title: "Confirm temporary account lock",
      description:
        "The user will be signed out and unable to access protected features until the lock expires or an admin unlocks the account.",
      confirmLabel: "Confirm Lock",
      tone: "yellow",
      rows: [
        {
          label: "User",
          value: action.user?.email || action.user?.fullName || "User",
        },
        { label: "Duration", value: `${durationText} minutes` },
        { label: "Reason", value: lockForm.reason.trim() },
      ],
    });
  };

  const requestUnlockUser = () => {
    if (!action.user?.userId) return;

    const errors = {};

    if (!unlockForm.reason.trim()) {
      errors.reason = "Unlock reason is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setModalError("Please fix the highlighted fields.");
      return;
    }

    setFieldErrors({});
    setModalError("");
    setConfirmAction({
      type: "UNLOCK",
      title: "Confirm account unlock",
      description:
        "The temporary restriction will be removed and the user can access the platform again.",
      confirmLabel: "Confirm Unlock",
      tone: "green",
      rows: [
        {
          label: "User",
          value: action.user?.email || action.user?.fullName || "User",
        },
        { label: "New Status", value: "Active" },
        { label: "Reason", value: unlockForm.reason.trim() },
      ],
    });
  };

  const requestBanUser = () => {
    if (!action.user?.userId) return;

    const errors = {};

    if (!banForm.reason.trim()) {
      errors.reason = "Ban reason is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setModalError("Please fix the highlighted fields.");
      return;
    }

    setFieldErrors({});
    setModalError("");
    setConfirmAction({
      type: "BAN",
      title: "Permanently ban this account?",
      description:
        "This is a high-impact restriction. The user will lose platform access and the ban remains until backend/admin policy provides a supported reversal.",
      confirmLabel: "Confirm Ban",
      tone: "red",
      rows: [
        {
          label: "User",
          value: action.user?.email || action.user?.fullName || "User",
        },
        { label: "Current Status", value: getUserStatus(action.user) },
        { label: "New Status", value: "Banned" },
        { label: "Reason", value: banForm.reason.trim() },
      ],
    });
  };

  const executeConfirmedUserAction = async () => {
    const type = confirmAction?.type;
    setConfirmAction(null);

    if (type === "LOCK") {
      await executeLockUser();
      return;
    }

    if (type === "UNLOCK") {
      await executeUnlockUser();
      return;
    }

    if (type === "BAN") {
      await executeBanUser();
    }
  };

  // ===== Main render =====
  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#00F0FF]">
              Users
            </p>

            <h1 className="text-3xl font-bold text-white md:text-3xl">
              User management
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Review client and expert accounts, filter by role/status, and
              apply temporary or permanent restrictions with a clear reason.
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

        {success && <SuccessToast message={success} onClose={() => setSuccess("")} />}

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon="groups"
            label="Visible users"
            value={stats.total}
            description={`${stats.clients} clients · ${stats.experts} experts`}
            tone="cyan"
          />

          <StatCard
            icon="verified_user"
            label="Active accounts"
            value={stats.active}
            description="Active accounts"
            tone="green"
          />

          <StatCard
            icon="lock"
            label="Temporarily locked"
            value={stats.locked}
            description="Temporary restrictions"
            tone="yellow"
          />

          <StatCard
            icon="block"
            label="Banned accounts"
            value={stats.banned}
            description="Permanent restrictions"
            tone="red"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px_180px]">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Search
              </label>

              <div className="flex h-14 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 transition focus-within:border-cyan-400/50 focus-within:ring-2 focus-within:ring-cyan-400/15">
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

        <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">User account list</h2>
              <p className="mt-1 text-sm text-gray-500">
                Showing {filteredUsers.length} of {users.length} accounts.
              </p>
            </div>
          </div>

          {loading ? (
            <ListSkeleton />
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
            title="Lock user account"
            subtitle={action.user?.email || action.user?.fullName}
            confirmLabel="Lock account"
            confirmTone="yellow"
            loading={actionLoading}
            error={modalError}
            onClose={closeActionModal}
            onConfirm={requestLockUser}
          >
            <div className="space-y-4">
              <NumberInput
                label="Lock duration (minutes)"
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
                label="Lock reason"
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
            title="Unlock user account"
            subtitle={action.user?.email || action.user?.fullName}
            confirmLabel="Unlock account"
            confirmTone="green"
            loading={actionLoading}
            error={modalError}
            onClose={closeActionModal}
            onConfirm={requestUnlockUser}
          >
            <TextArea
              label="Unlock reason"
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
            title="Ban user account"
            subtitle={action.user?.email || action.user?.fullName}
            confirmLabel="Ban account"
            confirmTone="red"
            loading={actionLoading}
            error={modalError}
            onClose={closeActionModal}
            onConfirm={requestBanUser}
          >
            <TextArea
              label="Ban reason"
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
        {confirmAction && (
          <ReviewConfirmationModal
            title={confirmAction.title}
            description={confirmAction.description}
            rows={confirmAction.rows}
            confirmLabel={confirmAction.confirmLabel}
            tone={confirmAction.tone}
            loading={actionLoading}
            warning={
              confirmAction.type === "BAN"
                ? "Verify the account and reason carefully before applying a permanent restriction."
                : ""
            }
            onCancel={() => !actionLoading && setConfirmAction(null)}
            onConfirm={executeConfirmedUserAction}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// ===== Final confirmation modal before applying user restriction actions =====
function ReviewConfirmationModal({
  title,
  description,
  rows = [],
  warning = "",
  confirmLabel,
  tone = "cyan",
  loading,
  onCancel,
  onConfirm,
}) {
  const toneMap = {
    cyan: {
      icon: "verified",
      iconClass: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
      button:
        "border-cyan-400/50 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-black",
    },
    green: {
      icon: "task_alt",
      iconClass: "border-green-400/30 bg-green-400/10 text-green-300",
      button:
        "border-green-400/50 bg-green-400/10 text-green-300 hover:bg-green-400 hover:text-black",
    },
    yellow: {
      icon: "lock_clock",
      iconClass: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
      button:
        "border-yellow-400/50 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400 hover:text-black",
    },
    red: {
      icon: "warning",
      iconClass: "border-red-400/30 bg-red-400/10 text-red-300",
      button:
        "border-red-400/50 bg-red-400/10 text-red-300 hover:bg-red-400 hover:text-black",
    },
  };

  const config = toneMap[tone] || toneMap.cyan;

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-confirmation-title"
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#151a22] p-5 shadow-[0_32px_110px_rgba(0,0,0,0.75)]"
      >
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl border ${config.iconClass}`}
        >
          <span className="material-symbols-outlined">{config.icon}</span>
        </div>

        <h2
          id="review-confirmation-title"
          className="text-xl font-black text-white"
        >
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>

        <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {rows.map((row, index) => (
            <div
              key={`${row.label}-${index}`}
              className="grid grid-cols-[125px_minmax(0,1fr)] gap-3 text-sm"
            >
              <span className="font-bold text-gray-500">{row.label}</span>
              <span className="break-words text-right font-semibold text-white">
                {row.value || "N/A"}
              </span>
            </div>
          ))}
        </div>

        {warning && (
          <div className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100/80">
            {warning}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`rounded-xl border px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${config.button}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessToast({ message, onClose }) {
  return (
    <div className="fixed right-4 top-4 z-[1200] w-[min(92vw,380px)] animate-[fadeIn_.2s_ease-out]">
      <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-[#111a16] p-4 shadow-[0_18px_56px_rgba(0,0,0,0.45)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-green-400/30 bg-green-400/10 text-green-300">
          <span className="material-symbols-outlined">check_circle</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Updated</p>
          <p className="mt-1 text-sm leading-5 text-green-100/75">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 transition hover:text-white"
          aria-label="Close notification"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
}



function ListSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-white/10">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse p-5">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_160px_160px_220px] xl:items-center">
            <div>
              <div className="h-5 w-48 rounded bg-white/10" />
              <div className="mt-3 h-4 w-72 max-w-full rounded bg-white/[0.06]" />
            </div>
            <div className="h-8 w-24 rounded-full bg-white/[0.06]" />
            <div className="h-8 w-24 rounded-full bg-white/[0.06]" />
            <div className="h-10 rounded-xl bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}



function PageSkeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 h-5 w-36 rounded-full bg-white/10" />
        <div className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-6 md:p-8">
          <div className="h-4 w-28 rounded bg-cyan-400/10" />
          <div className="mt-4 h-9 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/[0.07]" />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-20 rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="h-32 rounded-2xl border border-white/10 bg-[#151a22]"
              />
            ))}
          </div>
          <div className="h-72 rounded-2xl border border-white/10 bg-[#151a22]" />
        </div>
      </div>
    </div>
  );
}


// ===== User row with quick moderation actions =====
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
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            View
          </button>

          {isLocked ? (
            <button
              type="button"
              onClick={onUnlock}
              disabled={disabled || isBanned}
              className="rounded-xl border border-green-400/40 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Unlock
            </button>
          ) : (
            <button
              type="button"
              onClick={onLock}
              disabled={disabled || isBanned}
              className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lock
            </button>
          )}

          <button
            type="button"
            onClick={onBan}
            disabled={disabled || isBanned}
            className="rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
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

// ===== Dashboard statistic card =====
function StatCard({ icon, label, value, description, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
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

// ===== Filter select with larger tap target =====
function FilterSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 w-full rounded-xl border border-white/10 bg-[#0d1117] px-4 text-sm font-bold text-white outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/15"
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

// ===== Restriction action modal wrapper =====
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
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#151a22] shadow-2xl">
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

// ===== Numeric duration input for temporary locks =====
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
        className={`h-14 w-full rounded-xl border bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-cyan-400/15 ${
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

// ===== Shared textarea for moderation reasons =====
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
        rows={5}
        placeholder={placeholder}
        className={`min-h-[132px] w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-4 text-sm leading-6 text-white outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-cyan-400/15 ${
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
};

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
