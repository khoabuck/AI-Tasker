import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminUserService from "../../../services/adminUser.service";

import { formatDateTime } from "../../../utils/dateTime.utils";
const EMPTY_ACTION = {
  type: "",
};

const EMPTY_LOCK_FORM = {
  durationMinutes: "",
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
  const [confirmAction, setConfirmAction] = useState(null);

  const userStatus = useMemo(() => getUserStatus(user), [user]);
  const userRole = String(user?.role || "").trim().toUpperCase();
  const isExpert = userRole === "EXPERT";
  const isLocked = userStatus === "LOCKED";
  const isBanned = userStatus === "BANNED";

  useEffect(() => {
    if (!success) return;

    const timeoutId = window.setTimeout(() => {
      setSuccess("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [success]);

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

  const executeLockUser = async () => {
    if (!user?.userId) return;

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

  const executeUnlockUser = async () => {
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

  const executeBanUser = async () => {
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

const requestLockUser = () => {
    if (!user?.userId) return;

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
          value: user?.email || user?.fullName || "User",
        },
        { label: "Duration", value: `${durationText} minutes` },
        { label: "Reason", value: lockForm.reason.trim() },
      ],
    });
  };

  const requestUnlockUser = () => {
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
          value: user?.email || user?.fullName || "User",
        },
        { label: "New Status", value: "Active" },
        { label: "Reason", value: unlockForm.reason.trim() },
      ],
    });
  };

  const requestBanUser = () => {
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
          value: user?.email || user?.fullName || "User",
        },
        { label: "Current Status", value: getUserStatus(user) },
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
              Review account status, wallet balances, security information,
              and administrative restrictions.
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

        {success && <SuccessToast message={success} onClose={() => setSuccess("")} />}

        {loading ? (
          <PageSkeleton rows={4} />
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

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    Current wallet balances recorded for this account.
                  </p>
                </div>

                <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  {wallet ? "Wallet Available" : "No Wallet Data"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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

                  {!isExpert && (
                    <DetailItem
                      label="Phone Number"
                      value={user.phoneNumber}
                    />
                  )}

                  <DetailItem
                    label="Sign-in Method"
                    value={
                      user.authProvider
                        ? formatLabel(user.authProvider)
                        : "Not available"
                    }
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
            onConfirm={requestLockUser}
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
                placeholder="Enter duration in minutes"
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
            onConfirm={requestUnlockUser}
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
            onConfirm={requestBanUser}
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
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Review Again
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`rounded-xl border px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${config.button}`}
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
      <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-[#111a16] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-green-400/30 bg-green-400/10 text-green-300">
          <span className="material-symbols-outlined">check_circle</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Action completed</p>
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
        <div className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8">
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
  const value = String(role || "UNKNOWN").toUpperCase();

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
  const value = String(status || "UNKNOWN").toUpperCase();

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
          Enter how long the account should remain locked. Example: 60 minutes equals 1 hour.
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

  return rawStatus || "UNKNOWN";
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
};




function getFriendlyError(err, fallback = "Something went wrong.") {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to manage this account.";
  }

  if (status === 404) {
    return "User details are temporarily unavailable. Please try again later.";
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