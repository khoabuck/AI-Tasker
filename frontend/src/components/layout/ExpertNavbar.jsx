import { Link, NavLink, useNavigate } from "react-router-dom";
import authService from "../../services/auth.service";

export default function ExpertNavbar() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser?.();

  const handleLogout = () => {
    if (authService.logout) {
      authService.logout();
    }

    navigate("/login");
  };

  const navLinkClass = ({ isActive }) =>
    `text-[11px] font-bold tracking-[0.16em] uppercase transition ${
      isActive ? "text-[#00F0FF]" : "text-gray-400 hover:text-white"
    }`;

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

          <NavLink to="/expert/jobs" className={navLinkClass}>
            Find Jobs
          </NavLink>

          <NavLink to="/expert/recommended-jobs" className={navLinkClass}>
            AI Jobs
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gray-400 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            <span className="material-symbols-outlined text-[20px]">
              notifications
            </span>
          </button>

          <div className="group relative">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-sm font-bold text-cyan-300"
            >
              {getInitials()}
            </button>

            <div className="invisible absolute right-0 top-full z-50 w-56 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div className="rounded-xl border border-white/10 bg-[#151a22] p-2 shadow-2xl">
                <p className="truncate border-b border-white/10 px-3 py-2 text-xs text-gray-400">
                  {user?.email || "expert@aitasker.com"}
                </p>

                <DropdownLink to="/expert/profile" icon="person" label="Profile" />
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
                  to="/expert/messages"
                  icon="chat"
                  label="Messages"
                />
                <DropdownLink
                  to="/expert/wallet"
                  icon="account_balance_wallet"
                  label="Wallet"
                />

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