import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminUserService from "../../../services/adminUser.service";

const EMPTY_ACTION = {
  type: "",
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

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);

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

  const userStatus = useMemo(() => getUserStatus(user), [user]);
  const isLocked = userStatus === "LOCKED";
  const isBanned = userStatus === "BANNED";

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadUserWallet = async () => {
    try {
      const response = await axiosInstance.get("/admin/dashboard/user-wallets", {
        params: {
          take: 500,
        },
      });

      const raw = response?.data?.data || response?.data || [];
      const wallets = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.Items)
        ? raw.Items
        : [];

      const foundWallet = wallets.find(
        (item) => String(item.userId || item.UserId) === String(userId)
      );

      setWallet(foundWallet || null);
    } catch (err) {
      console.error("LOAD USER WALLET ERROR:", err?.response?.data || err);
      setWallet(null);
    }
  };

  const loadUser = async ({ keepMessage = false } = {}) => {
    try {
      setLoading(true);
      setError("");

      if (!keepMessage) {
        setSuccess("");
      }

      const [data] = await Promise.all([
        adminUserService.getUserById(userId),
        loadUserWallet(),
      ]);

      setUser(data);
    } catch (err) {
      console.error("LOAD ADMIN USER DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load user detail."));
    } finally {
      setLoading(false);
    }
  };

  const openLockModal = () => {
    setAction({ type: "LOCK" });
    setLockForm(EMPTY_LOCK_FORM);
    setModalError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
  };

  const openUnlockModal = () => {
    setAction({ type: "UNLOCK" });
    setUnlockForm(EMPTY_UNLOCK_FORM);
    setModalError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
  };

  const openBanModal = () => {
    setAction({ type: "BAN" });
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
    if (!user?.userId) return;

    const errors = {};
    const durationText = String(lockForm.durationMinutes ?? "").trim();

    if (!durationText) {
      errors.durationMinutes = "Duration Minutes is required.";
    } else if (!/^\d+$/.test(durationText)) {
      errors.durationMinutes = "Duration Minutes must be a number.";
    } else if (Number(durationText) <= 0) {
      errors.durationMinutes = "Duration Minutes must be greater than 0.";
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

      await adminUserService.lockUser(user.userId, {
        durationMinutes: Number(durationText),
        reason: lockForm.reason.trim(),
      });

      closeActionModal();
      await loadUser({ keepMessage: true });
      setSuccess("User has been locked successfully.");
    } catch (err) {
      console.error("LOCK USER ERROR:", err?.response?.data || err);
      setModalError(getFriendlyError(err, "Cannot lock user."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockUser = async () => {
    if (!user?.userId) return;

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

      await adminUserService.unlockUser(user.userId, {
        reason: unlockForm.reason.trim(),
      });

      closeActionModal();
      await loadUser({ keepMessage: true });
      setSuccess("User has been unlocked successfully.");
    } catch (err) {
      console.error("UNLOCK USER ERROR:", err?.response?.data || err);
      setModalError(getFriendlyError(err, "Cannot unlock user."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!user?.userId) return;

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

      await adminUserService.banUser(user.userId, {
        reason: banForm.reason.trim(),
      });

      closeActionModal();
      await loadUser({ keepMessage: true });
      setSuccess("User has been banned successfully.");
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
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              Back to Users
            </button>

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              User Detail
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Account information
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Review account status, role, wallet balance, profile links,
              security status, and administrative restrictions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadUser()}
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

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-12 text-center text-gray-400 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
            <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
              hourglass_empty
            </span>
            Loading user detail...
          </div>
        ) : !user ? (
          <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-12 text-center text-gray-400 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
            <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
              person_off
            </span>

            <h2 className="text-xl font-bold text-white">User not found</h2>

            <p className="mt-2 text-sm text-gray-400">
              The requested user does not exist or cannot be loaded.
            </p>
          </div>
        ) : (
          <>
            <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                  <UserAvatar
                    name={user.fullName || user.email}
                    avatarUrl={user.avatarUrl}
                  />

                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <RoleBadge role={user.role} />
                      <StatusBadge status={userStatus} />
                    </div>

                    <h2 className="truncate text-2xl font-black text-white">
                      {user.fullName || "Unknown User"}
                    </h2>

                    <p className="mt-1 break-all text-sm text-gray-400">
                      {user.email || "No email"}
                    </p>

                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                  {isLocked ? (
                    <button
                      type="button"
                      onClick={openUnlockModal}
                      disabled={actionLoading || isBanned}
                      className="rounded-xl border border-green-400/40 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Unlock User
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openLockModal}
                      disabled={actionLoading || isBanned}
                      className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Lock User
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={openBanModal}
                    disabled={actionLoading || isBanned}
                    className="rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Ban User
                  </button>
                </div>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard
                icon="badge"
                label="Role"
                value={formatLabel(user.role)}
                tone="cyan"
              />

              <InfoCard
                icon="verified_user"
                label="Status"
                value={formatLabel(userStatus)}
                tone={userStatus === "ACTIVE" ? "green" : "yellow"}
              />

              <InfoCard
                icon="login"
                label="Last Login"
                value={formatDateTime(user.lastLoginAt)}
                tone="purple"
              />

              <InfoCard
                icon="calendar_month"
                label="Joined"
                value={formatDateTime(user.createdAt)}
                tone="cyan"
              />
            </section>

            <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Wallet Summary
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    Current wallet balances from admin dashboard user-wallets
                    API.
                  </p>
                </div>

                <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  {wallet ? "Wallet Found" : "No Wallet"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <InfoCard
                  icon="account_balance_wallet"
                  label="Available Balance"
                  value={formatMoney(getWalletValue(wallet, "availableBalance"))}
                  tone="green"
                />

                <InfoCard
                  icon="lock"
                  label="Locked Balance"
                  value={formatMoney(getWalletValue(wallet, "lockedBalance"))}
                  tone="yellow"
                />

                <InfoCard
                  icon="payments"
                  label="Withdrawable"
                  value={formatMoney(
                    getWalletValue(wallet, "withdrawableBalance")
                  )}
                  tone="cyan"
                />

                <InfoCard
                  icon="pending_actions"
                  label="Pending Earnings"
                  value={formatMoney(
                    getWalletValue(wallet, "pendingEarningsBalance")
                  )}
                  tone="purple"
                />

                <InfoCard
                  icon="savings"
                  label="Total Earning"
                  value={formatMoney(getWalletValue(wallet, "totalEarning"))}
                  tone="green"
                />
              </div>

              {!wallet && (
                <p className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">
                  No wallet data found for this user.
                </p>
              )}
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
              <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                <h2 className="mb-5 text-xl font-bold text-white">
                  Account Details
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DetailItem label="Full Name" value={user.fullName} />
                  <DetailItem label="Email" value={user.email} />
                  <DetailItem label="Phone Number" value={user.phoneNumber} />
                  <DetailItem
                    label="Auth Provider"
                    value={user.authProvider || "Local"}
                  />
                  <DetailItem
                    label="Email Verification"
                    value={user.isEmailVerified ? "Verified" : "Not Verified"}
                  />
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                  <h2 className="mb-5 text-xl font-bold text-white">
                    Restriction Status
                  </h2>

                  <div className="space-y-4">
                    <DetailItem
                      label="Lockout End"
                      value={formatDateTime(user.lockoutEnd)}
                    />

                    <DetailItem
                      label="Last Locked At"
                      value={formatDateTime(user.lastLockedAt)}
                    />

                    <DetailItem
                      label="Banned At"
                      value={formatDateTime(user.bannedAt)}
                    />
                  </div>
                </section>

                {(user.lockReason || user.banReason) && (
                  <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                    <h2 className="mb-5 text-xl font-bold text-white">
                      Admin Notes
                    </h2>

                    {user.lockReason && (
                      <ReasonBox
                        title="Lock Reason"
                        value={user.lockReason}
                        tone="yellow"
                      />
                    )}

                    {user.banReason && (
                      <ReasonBox
                        title="Ban Reason"
                        value={user.banReason}
                        tone="red"
                      />
                    )}
                  </section>
                )}
              </aside>
            </div>
          </>
        )}

        {action.type === "LOCK" && (
          <ActionModal
            title="Lock User"
            subtitle={user?.email || user?.fullName}
            confirmLabel="Lock User"
            confirmTone="yellow"
            loading={actionLoading}
            error={modalError}
            onClose={closeActionModal}
            onConfirm={handleLockUser}
          >
            <div className="space-y-4">
              <NumberInput
                label="Duration Minutes"
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
            subtitle={user?.email || user?.fullName}
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
            subtitle={user?.email || user?.fullName}
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
function UserAvatar({ name, avatarUrl }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "User"}
        className="h-24 w-24 rounded-3xl border border-white/10 object-cover"
      />
    );
  }

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-cyan-400/30 bg-cyan-400/10 text-3xl font-black text-cyan-300">
      {getInitials(name)}
    </div>
  );
}

function InfoCard({ icon, label, value, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-300",
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

      <p className="mt-2 break-words text-lg font-bold text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function ReasonBox({ title, value, tone = "yellow" }) {
  const className =
    tone === "red"
      ? "border-red-400/30 bg-red-400/10 text-red-100"
      : "border-yellow-400/30 bg-yellow-400/10 text-yellow-100";

  return (
    <div className={`mb-4 rounded-xl border p-4 last:mb-0 ${className}`}>
      <p className="text-sm font-bold">{title}</p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 opacity-80">
        {value}
      </p>
    </div>
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
          Backend expects duration in minutes. Example: 60 means 1 hour.
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

function getWalletValue(wallet, key) {
  if (!wallet) return 0;

  const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);

  return wallet[key] ?? wallet[pascalKey] ?? 0;
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

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatLabel(value) {
  if (!value) return "N/A";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
    return "Backend blocked this request because the current token does not have ADMIN permission.";
  }

  if (status === 404) {
    return "Admin user detail API was not found. Please check backend route.";
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