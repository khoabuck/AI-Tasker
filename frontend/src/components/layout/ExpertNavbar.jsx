import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import authService from "../../services/auth.service";

export default function ExpertNavbar() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser?.();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    if (authService.logout) {
      authService.logout();
    }

    setIsMenuOpen(false);
    setIsPinned(false);
    navigate("/login");
  };

  const navLinkClass = ({ isActive }) =>
    `text-[11px] font-bold tracking-[0.18em] uppercase transition ${isActive ? "text-[#00F0FF]" : "text-gray-400 hover:text-white"
    }`;

  const getInitials = () => {
    if (user?.fullName) {
      return user.fullName
        .split(" ")
        .map((item) => item[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }

    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }

    return "EX";
  };

  const handleMouseEnter = () => {
    setIsMenuOpen(true);
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsMenuOpen(false);
    }
  };

  const handleAvatarClick = () => {
    if (isPinned) {
      setIsPinned(false);
      setIsMenuOpen(false);
    } else {
      setIsPinned(true);
      setIsMenuOpen(true);
    }
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsPinned(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d1117]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        {/* Logo */}
        <Link
          to="/expert/dashboard"
          className="inline-flex items-center text-xl font-extrabold tracking-tight no-underline"
        >
          <span className="text-[#00F0FF]">AI</span>
          <span className="ml-1 text-white">Tasker</span>
        </Link>

        {/* Navbar */}
        <nav className="hidden items-center gap-8 md:flex">
          <NavLink to="/expert/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>

          <NavLink to="/expert/profile" className={navLinkClass}>
            Profile
          </NavLink>

          <NavLink to="/expert/jobs" className={navLinkClass}>
            Find Jobs
          </NavLink>

          <NavLink to="/expert/proposals" className={navLinkClass}>
            Proposals
          </NavLink>

          <NavLink to="/expert/projects" className={navLinkClass}>
            Projects
          </NavLink>

          <NavLink to="/expert/messages" className={navLinkClass}>
            Messages
          </NavLink>

          <NavLink to="/expert/wallet" className={navLinkClass}>
            Wallet
          </NavLink>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gray-400 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            <span className="material-symbols-outlined text-[20px]">
              notifications
            </span>
          </button>

          <div
            ref={menuRef}
            className="relative -my-3 px-3 py-3"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={handleAvatarClick}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/20"
            >
              {getInitials()}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-11 z-[9999] w-56 rounded-xl border border-white/10 bg-[#151a22] p-2 shadow-2xl">
                <p className="truncate border-b border-white/10 px-3 py-2 text-xs text-gray-400">
                  {user?.email || "expert@aitasker.com"}
                </p>

                <Link
                  to="/expert/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.05] hover:text-cyan-300"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    person
                  </span>
                  Profile
                </Link>

                <Link
                  to="/expert/dashboard"
                  onClick={closeMenu}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.05] hover:text-cyan-300"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    dashboard
                  </span>
                  Dashboard
                </Link>

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
            )}
          </div>
        </div>
      </div>
    </header>
  );
}