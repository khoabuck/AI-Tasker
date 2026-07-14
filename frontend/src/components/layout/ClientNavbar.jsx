// src/components/layout/ClientNavbar.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationDropdown from "./NotificationDropdown";

const NAV_ITEMS = [
  {
    label: "HOME",
    icon: "home",
    to: "/client/dashboard",
    dropdown: null,
  },
  {
    label: "POST JOB",
    icon: "post_add",
    to: "/client/post-job",
    dropdown: null,
  },
  {
    label: "FIND AI EXPERT",
    icon: "person_search",
    dropdown: [
      {
        icon: "auto_awesome",
        label: "AI MATCHING",
        to: "/client/ai-matching",
      },
      {
        icon: "person_search",
        label: "EXPERT SEARCH",
        to: "/client/experts",
      },
    ],
  },
  {
    label: "MY JOBS",
    icon: "work",
    to: "/client/jobs",
    dropdown: null,
  },
  {
    label: "MY PROJECTS",
    icon: "folder_open",
    to: "/client/projects",
    dropdown: null,
  },
  {
    label: "MESSAGES",
    icon: "chat",
    to: "/client/messages",
    dropdown: null,
  },
  {
    label: "FINANCE",
    icon: "account_balance_wallet",
    to: "/client/wallet",
    dropdown: null,
  },
];

const AVATAR_NAV_ITEMS = NAV_ITEMS.flatMap((item) => {
  if (Array.isArray(item.dropdown) && item.dropdown.length > 0) {
    return item.dropdown;
  }

  return [
    {
      icon: item.icon,
      label: item.label,
      to: item.to,
    },
  ];
});

function NavItem({ label, to, dropdown, active }) {
  const [open, setOpen] = useState(false);

  if (!dropdown) {
    return (
      <li>
        <Link
          to={to}
          className="relative flex items-center gap-2 h-full 
                      text-xs font-mono tracking-widest
                      text-gray-400 hover:text-cyan-400
                      transition-all duration-300
                      after:absolute after:-bottom-4 after:left-0
                      after:h-[2px] after:w-0
                      after:bg-cyan-400
                      after:shadow-[0_0_10px_#00F0FF]
                      after:transition-all after:duration-300
                      hover:after:w-full"
        >
          {label}
        </Link>
      </li>
    );
  }

  return (
    <li
      className="relative h-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`
          relative flex items-center gap-2 h-full
          text-xs font-mono tracking-widest
          transition-all duration-300
          ${active ? "text-cyan-400" : "text-gray-400 hover:text-cyan-400"}
          after:absolute after:-bottom-4 after:left-0
          after:h-[2px]
          after:bg-cyan-400
          after:shadow-[0_0_12px_#00F0FF]
          after:transition-all after:duration-300
          ${active ? "after:w-full" : "after:w-0 hover:after:w-full"}
        `}
      >
        {label}
        <span className="material-symbols-outlined text-sm">expand_more</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#151922]/95 p-2 shadow-2xl shadow-cyan-400/10 backdrop-blur-xl">
          <div className="absolute left-6 top-[-6px] h-3 w-3 rotate-45 border-l border-t border-cyan-400/20 bg-[#151922]" />

          {dropdown.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-300 transition-all duration-200 hover:bg-cyan-400/10 hover:text-cyan-400 hover:shadow-[0_0_14px_rgba(0,240,255,0.12)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gray-400 transition-all group-hover:border-cyan-400/40 group-hover:bg-cyan-400/10 group-hover:text-cyan-400">
                <span className="material-symbols-outlined text-[18px]">
                  {item.icon}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="font-medium">{item.label}</span>
                <span className="text-[11px] text-gray-500 group-hover:text-cyan-300/70">
                  Open {item.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}

export default function ClientNavbar() {
  const navigate = useNavigate();

  const {
    user,
    handleLogout: logoutFromContext,
  } = useAuth();

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const avatarAreaRef = useRef(null);
  const avatarDropdownRef = useRef(null);

  const avatarUrl = user?.avatarUrl || "";

  

  const initials = user?.fullName
    ? user.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "CL";

    useEffect(() => {
  if (!avatarOpen) {
    return undefined;
  }

  const handleOutsideClick = (event) => {
    const clickedInsideAvatar =
      avatarAreaRef.current?.contains(event.target);

    if (clickedInsideAvatar) {
      return;
    }

    if (avatarDropdownRef.current) {
      avatarDropdownRef.current.scrollTop = 0;
    }

    setAvatarOpen(false);
  };

  const handleEscapeKey = (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (avatarDropdownRef.current) {
      avatarDropdownRef.current.scrollTop = 0;
    }

    setAvatarOpen(false);
  };

  document.addEventListener("pointerdown", handleOutsideClick);
  document.addEventListener("keydown", handleEscapeKey);

  return () => {
    document.removeEventListener("pointerdown", handleOutsideClick);
    document.removeEventListener("keydown", handleEscapeKey);
  };
}, [avatarOpen]);

  const handleLogout = async () => {
  if (loggingOut) {
    return;
  }

  setAvatarOpen(false);
  setLoggingOut(true);

  try {
    await logoutFromContext();
    navigate("/login", { replace: true });
  } finally {
    setLoggingOut(false);
  }
};

  return (
    <header className="sticky top-0 z-50 bg-[#101319]/90 backdrop-blur-xl border-b border-white/10 flex justify-between items-center w-full px-4 md:px-12 py-4">
      {/* Logo */}
      <Link to="/client/dashboard">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-cyan-400 drop-shadow-[0_0_10px_#00F0FF]">
            AI
          </span>
          <span className="ml-1 text-white">Tasker</span>
        </h1>
      </Link>

      {/* Nav items */}
      <ul className="hidden lg:flex items-center gap-14 h-full justify-center mx-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.label} {...item} />
        ))}
      </ul>

      {/* Right: notification + avatar */}
      <div className="flex items-center gap-8">
        <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />

        <NotificationDropdown />

        <div ref={avatarAreaRef} className="relative">
          <button
            type="button"
            onClick={() => setAvatarOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 transition-all hover:border-cyan-400/40 hover:shadow-[0_0_14px_rgba(0,240,255,0.2)]"
          >
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-cyan-400 text-sm font-bold text-gray-900">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <span
              className={`material-symbols-outlined text-[18px] text-gray-400 transition-transform duration-200 ${avatarOpen ? "rotate-180 text-cyan-400" : ""
                }`}
            >
              expand_more
            </span>
          </button>

          {avatarOpen && (
            <div ref={avatarDropdownRef} className="absolute right-0 top-full z-50 mt-3 max-h-[320px] w-72 overflow-y-auto overscroll-contain rounded-2xl border border-cyan-400/20 bg-[#151922]/95 p-2 shadow-2xl shadow-cyan-400/10 backdrop-blur-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="absolute right-6 top-[-6px] h-3 w-3 rotate-45 border-l border-t border-cyan-400/20 bg-[#151922]" />

              <div className="border-b border-white/10 px-3 py-3">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.fullName || "Client"}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Client Account
                </p>
              </div>

              <div className="border-b border-white/10 py-2">
                

                <div className="space-y-1">
                  {AVATAR_NAV_ITEMS.map((item) => (
                    <Link
                      key={`${item.label}-${item.to}`}
                      to={item.to}
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-300 transition-all hover:bg-cyan-400/10 hover:text-cyan-400"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {item.icon}
                      </span>

                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="py-2">
                <Link
                  to="/client/profile"
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-300 transition-all hover:bg-cyan-400/10 hover:text-cyan-400"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    person
                  </span>

                  Profile
                </Link>

                <Link
                  to="/client/job-credit-packages"
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-300 transition-all hover:bg-cyan-400/10 hover:text-cyan-400"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    local_activity
                  </span>

                  Job Credit Packages
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-300 transition-all hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    logout
                  </span>

                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}