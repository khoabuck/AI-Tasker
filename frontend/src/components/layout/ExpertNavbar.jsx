import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import notificationService from "../../services/notification.service";

export default function ExpertNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef(null);

  const { user, handleLogout: logoutContext } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationList, setNotificationList] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  useEffect(() => {
    loadUnreadCount();

    const intervalId = window.setInterval(loadUnreadCount, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(Number(count || 0));
    } catch (error) {
      console.error("LOAD UNREAD NOTIFICATION COUNT ERROR:", error);
    }
  };

  const loadNotificationPreview = async () => {
    try {
      setLoadingNotifications(true);

      const notifications = await notificationService.getMyNotifications();
      const list = Array.isArray(notifications) ? notifications : [];

      setNotificationList(list.slice(0, 6));
      setUnreadCount(list.filter((item) => !item.isRead).length);
    } catch (error) {
      console.error("LOAD NOTIFICATION PREVIEW ERROR:", error);
      setNotificationList([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleToggleNotifications = async () => {
    const nextOpen = !showNotifications;

    setShowNotifications(nextOpen);

    if (nextOpen) {
      await loadNotificationPreview();
    }
  };

  const updateNotificationReadState = (notificationId) => {
    setNotificationList((prev) =>
      prev.map((item) =>
        String(getNotificationId(item)) === String(notificationId)
          ? {
              ...item,
              isRead: true,
              readAt: item.readAt || new Date().toISOString(),
            }
          : item
      )
    );

    setUnreadCount((prev) => Math.max(Number(prev || 0) - 1, 0));
  };

  const handleMarkAsRead = async (notificationId) => {
    if (!notificationId) return;

    try {
      setMarkingId(notificationId);

      await notificationService.markAsRead(notificationId);
      updateNotificationReadState(notificationId);
    } catch (error) {
      console.error("MARK NOTIFICATION READ ERROR:", error);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount <= 0) return;

    try {
      setMarkingAll(true);

      await notificationService.markAllAsRead();

      setNotificationList((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("MARK ALL NOTIFICATIONS READ ERROR:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleOpenNotification = async (notification) => {
    const notificationId = getNotificationId(notification);
    const target =
      notification.target ||
      notificationService.getNotificationTarget(notification);

    try {
      setOpeningId(notificationId || target?.path || "/expert/notifications");

      if (notificationId && !notification.isRead) {
        await notificationService.markAsRead(notificationId);
        updateNotificationReadState(notificationId);
      }

      setShowNotifications(false);
      navigate(target?.path || "/expert/notifications");
    } catch (error) {
      console.error("OPEN NAVBAR NOTIFICATION ERROR:", error);
    } finally {
      setOpeningId(null);
    }
  };

  const handleGoToNotifications = () => {
    setShowNotifications(false);
    navigate("/expert/notifications");
  };

  const handleLogout = () => {
    logoutContext();
    navigate("/login", { replace: true });
  };

  const navLinkClass = ({ isActive }) =>
    `text-[11px] font-bold tracking-[0.16em] uppercase transition ${
      isActive ? "text-[#00F0FF]" : "text-gray-400 hover:text-white"
    }`;

  const isJobsActive =
    location.pathname.startsWith("/expert/jobs") ||
    location.pathname.startsWith("/expert/recommended-jobs");

  const isWorkActive =
    location.pathname.startsWith("/expert/proposals") ||
    location.pathname.startsWith("/expert/projects") ||
    location.pathname.startsWith("/expert/contracts") ||
    location.pathname.startsWith("/expert/milestones") ||
    location.pathname.startsWith("/expert/deliverables") ||
    location.pathname.startsWith("/expert/disputes") ||
    location.pathname.startsWith("/expert/reviews") ||
    location.pathname.startsWith("/expert/messages");

  const getInitials = () => {
    const name =
      user?.fullName ||
      user?.displayName ||
      user?.name ||
      user?.userName ||
      user?.email ||
      "Expert";

    return String(name)
      .split(" ")
      .map((item) => item[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d1117]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link
          to="/expert/dashboard"
          className="inline-flex items-center text-xl font-extrabold tracking-tight no-underline"
        >
          <span className="text-[#00F0FF]">AI</span>
          <span className="ml-1 text-white">Tasker</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/expert/dashboard" className={navLinkClass}>
            Home
          </NavLink>

          <NavLink to="/expert/profile" className={navLinkClass}>
            Profile
          </NavLink>

          <NavLink to="/expert/skills" className={navLinkClass}>
            Skills
          </NavLink>

          <NavDropdown
            label="Jobs"
            active={isJobsActive}
            items={[
              {
                to: "/expert/jobs",
                icon: "work",
                label: "Find Jobs",
                description: "Browse jobs manually",
              },
              {
                to: "/expert/recommended-jobs",
                icon: "auto_awesome",
                label: "AI Jobs",
                description: "Jobs recommended by AI",
              },
            ]}
          />

          <NavDropdown
            label="Work"
            active={isWorkActive}
            items={[
              {
                to: "/expert/proposals",
                icon: "description",
                label: "Proposals",
                description: "Your submitted proposals",
              },
              {
                to: "/expert/projects",
                icon: "folder_managed",
                label: "Projects",
                description: "Active and completed work",
              },
              {
                to: "/expert/disputes",
                icon: "gavel",
                label: "Disputes",
                description: "Project dispute cases",
              },
              {
                to: "/expert/reviews",
                icon: "reviews",
                label: "Reviews",
                description: "Client ratings and feedback",
              },
              {
                to: "/expert/messages",
                icon: "chat",
                label: "Messages",
                description: "Client conversations",
              },
            ]}
          />

          <NavLink to="/expert/wallet" className={navLinkClass}>
            Wallet
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                showNotifications ||
                location.pathname.startsWith("/expert/notifications")
                  ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                  : "border-white/10 bg-white/[0.04] text-gray-400 hover:border-cyan-400/40 hover:text-cyan-300"
              }`}
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">
                notifications
              </span>

              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#0d1117] bg-red-500 px-1 text-[10px] font-black text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationPopup
                notifications={notificationList}
                unreadCount={unreadCount}
                loading={loadingNotifications}
                markingAll={markingAll}
                markingId={markingId}
                openingId={openingId}
                onOpenNotification={handleOpenNotification}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                onViewAll={handleGoToNotifications}
              />
            )}
          </div>

          <div className="group relative">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-sm font-bold text-cyan-300"
            >
              {getInitials()}
            </button>

            <div className="invisible absolute right-0 top-full z-50 w-64 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div className="rounded-xl border border-white/10 bg-[#151a22] p-2 shadow-2xl">
                <p className="truncate border-b border-white/10 px-3 py-2 text-xs text-gray-400">
                  {user?.email || "expert@aitasker.com"}
                </p>

                <DropdownLink
                  to="/expert/profile"
                  icon="person"
                  label="Profile"
                />

                <DropdownLink
                  to="/expert/skills"
                  icon="psychology"
                  label="Skills"
                />

                <DropdownLink
                  to="/expert/notifications"
                  icon="notifications"
                  label={`Notifications${
                    unreadCount > 0 ? ` (${unreadCount})` : ""
                  }`}
                />

                <DropdownLink
                  to="/expert/wallet"
                  icon="account_balance_wallet"
                  label="Wallet"
                />

                <DropdownLink
                  to="/expert/reviews"
                  icon="reviews"
                  label="Reviews"
                />

                <div className="my-2 border-t border-white/10" />

                <DropdownLink to="/expert/jobs" icon="work" label="Find Jobs" />

                <DropdownLink
                  to="/expert/recommended-jobs"
                  icon="auto_awesome"
                  label="AI Jobs"
                />

                <DropdownLink
                  to="/expert/proposals"
                  icon="description"
                  label="Proposals"
                />

                <DropdownLink
                  to="/expert/projects"
                  icon="folder_managed"
                  label="Projects"
                />

                <DropdownLink
                  to="/expert/disputes"
                  icon="gavel"
                  label="Disputes"
                />

                <DropdownLink
                  to="/expert/messages"
                  icon="chat"
                  label="Messages"
                />

                <div className="my-2 border-t border-white/10" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/[0.05] hover:text-red-400"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    logout
                  </span>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function NotificationPopup({
  notifications,
  unreadCount,
  loading,
  markingAll,
  markingId,
  openingId,
  onOpenNotification,
  onMarkAsRead,
  onMarkAllAsRead,
  onViewAll,
}) {
  const unreadText =
    unreadCount > 0 ? `${unreadCount} unread` : "All caught up";

  return (
    <div className="absolute right-0 top-full z-[999] mt-2 w-[350px] overflow-hidden rounded-2xl border border-white/10 bg-[#111720] shadow-[0_24px_70px_rgba(0,0,0,0.7)]">
      <div className="border-b border-white/10 bg-gradient-to-r from-cyan-400/10 via-white/[0.03] to-purple-400/10 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
              <span className="material-symbols-outlined text-[17px]">
                notifications
              </span>
            </span>

            <div>
              <p className="text-[13px] font-black text-white">
                Notifications
              </p>
              <p className="text-[10px] font-medium text-gray-400">
                {unreadText}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onMarkAllAsRead}
            disabled={markingAll || unreadCount <= 0}
            className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold text-cyan-200 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {markingAll ? "Reading..." : "Read all"}
          </button>
        </div>
      </div>

      <div
        className="max-h-[330px] overflow-y-auto p-2 [&::-webkit-scrollbar]:hidden"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-300" />
            <p className="mt-3 text-xs font-semibold text-gray-300">
              Loading notifications...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <span className="material-symbols-outlined mb-2 block text-4xl text-gray-600">
              notifications_off
            </span>
            <p className="text-sm font-bold text-white">No notifications yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Updates will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {notifications.map((notification, index) => {
              const notificationId = getNotificationId(notification);
              const target =
                notification.target ||
                notificationService.getNotificationTarget(notification);

              const opening =
                String(openingId) === String(notificationId) ||
                String(openingId) === String(target?.path);

              return (
                <NotificationItem
                  key={notificationId || index}
                  notification={notification}
                  target={target}
                  opening={opening}
                  markingId={markingId}
                  onOpen={() => onOpenNotification(notification)}
                  onMarkAsRead={onMarkAsRead}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-white/[0.03] p-2">
        <button
          type="button"
          onClick={onViewAll}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          View all notifications
          <span className="material-symbols-outlined text-[16px]">
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  target,
  opening,
  markingId,
  onOpen,
  onMarkAsRead,
}) {
  const notificationId = getNotificationId(notification);
  const tone = getNotificationTone(notification.type, target?.kind);
  const isRead = Boolean(notification.isRead);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group w-full rounded-xl border px-3 py-2.5 text-left transition ${
        isRead
          ? "border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.04]"
          : "border-cyan-400/20 bg-cyan-400/[0.07] hover:border-cyan-300/50 hover:bg-cyan-400/[0.11]"
      }`}
    >
      <div className="flex gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tone.className}`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {tone.icon}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-extrabold text-white">
              {notification.title || "Notification"}
            </p>

            {!isRead && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-xs leading-4 text-gray-400">
            {notification.message ||
              notification.content ||
              "No message content."}
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-gray-400">
                {tone.label}
              </span>

              <span className="truncate text-[10px] font-medium text-gray-500">
                {notificationService.formatNotificationTime(
                  notification.createdAt || notification.createdAtUtc
                )}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {!isRead && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMarkAsRead(notificationId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.stopPropagation();
                      onMarkAsRead(notificationId);
                    }
                  }}
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-400/10"
                >
                  {markingId === notificationId ? "..." : "Read"}
                </span>
              )}

              <span className="flex items-center gap-0.5 text-[10px] font-bold text-cyan-300">
                {opening ? "Opening..." : target?.label || "Open"}
                <span className="material-symbols-outlined text-[14px] transition group-hover:translate-x-0.5">
                  chevron_right
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function NavDropdown({ label, active, items }) {
  return (
    <div className="group relative">
      <button
        type="button"
        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
          active ? "text-[#00F0FF]" : "text-gray-400 hover:text-white"
        }`}
      >
        {label}

        <span className="material-symbols-outlined text-[16px] leading-none">
          expand_more
        </span>
      </button>

      <div className="invisible absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-4 opacity-0 transition group-hover:visible group-hover:opacity-100">
        <div className="rounded-2xl border border-white/10 bg-[#151a22] p-2 shadow-2xl">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-start gap-3 rounded-xl px-3 py-3 text-gray-300 transition hover:bg-white/[0.05] hover:text-cyan-300"
            >
              <span className="material-symbols-outlined mt-0.5 text-[20px] text-cyan-300">
                {item.icon}
              </span>

              <span>
                <span className="block text-sm font-bold">{item.label}</span>

                <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                  {item.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function DropdownLink({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.05] hover:text-cyan-300"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </Link>
  );
}

function getNotificationId(notification) {
  return (
    notification?.notificationId ||
    notification?.NotificationId ||
    notification?.id ||
    notification?.Id ||
    notification?.raw?.notificationId ||
    notification?.raw?.NotificationId ||
    notification?.raw?.id ||
    notification?.raw?.Id ||
    ""
  );
}

function getNotificationTone(type, kind) {
  const value = String(type || "").toUpperCase();
  const targetKind = String(kind || "").toUpperCase();

  if (value.includes("PROPOSAL") || targetKind === "PROPOSAL") {
    return {
      label: "Proposal",
      icon: "description",
      className: "border-purple-400/20 bg-purple-400/10 text-purple-300",
    };
  }

  if (value.includes("CONTRACT") || targetKind === "CONTRACT") {
    return {
      label: "Agreement",
      icon: "contract",
      className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    };
  }

  if (value.includes("PROJECT") || targetKind === "PROJECT") {
    return {
      label: "Project",
      icon: "folder_managed",
      className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    };
  }

  if (value.includes("MILESTONE") || targetKind === "MILESTONE") {
    return {
      label: "Milestone",
      icon: "flag",
      className: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    };
  }

  if (
    value.includes("DELIVERABLE") ||
    value.includes("SUBMISSION") ||
    value.includes("REVISION") ||
    targetKind === "SUBMISSION"
  ) {
    return {
      label: value.includes("REVISION") ? "Changes Requested" : "Submission",
      icon: value.includes("REVISION") ? "edit_note" : "assignment",
      className: value.includes("REVISION")
        ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
        : "border-green-400/20 bg-green-400/10 text-green-300",
    };
  }

  if (
    value.includes("CHAT") ||
    value.includes("MESSAGE") ||
    targetKind === "MESSAGE"
  ) {
    return {
      label: "Message",
      icon: "chat",
      className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    };
  }

  if (
    value.includes("WALLET") ||
    value.includes("WITHDRAW") ||
    value.includes("ESCROW") ||
    value.includes("PAYMENT") ||
    targetKind === "WALLET"
  ) {
    return {
      label: "Wallet",
      icon: "account_balance_wallet",
      className: "border-green-400/20 bg-green-400/10 text-green-300",
    };
  }

  if (value.includes("REVIEW") || targetKind === "REVIEW") {
    return {
      label: "Review",
      icon: "reviews",
      className: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    };
  }

  if (value.includes("DISPUTE") || targetKind === "DISPUTE") {
    return {
      label: "Dispute",
      icon: "gavel",
      className: "border-red-400/20 bg-red-400/10 text-red-300",
    };
  }

  return {
    label: "Notification",
    icon: "notifications",
    className: "border-white/10 bg-white/[0.04] text-gray-300",
  };
} 