import { Link, NavLink, useNavigate } from "react-router-dom";
import authService from "../../services/auth.service";

export default function AdminNavbar() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser?.();

  const handleLogout = () => {
    if (authService.logout) {
      authService.logout();
    }

    navigate("/login");
  };

  const navLinkClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
      isActive
        ? "border border-cyan-400/40 bg-cyan-400/10 text-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.12)]"
        : "border border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
    }`;

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-72 border-r border-white/10 bg-[#0b0f16] md:flex md:flex-col">
      {/* Logo */}
      <div className="border-b border-white/10 px-6 py-6">
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center text-2xl font-extrabold tracking-tight no-underline"
        >
          <span className="text-[#00F0FF]">AI</span>
          <span className="ml-1 text-white">Tasker</span>
        </Link>

        <div className="mt-3 w-fit rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">
          Admin Panel
        </div>
      </div>

      {/* Admin info */}
      <div className="px-5 py-5">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/40 bg-red-400/10 text-sm font-extrabold text-red-300">
              AD
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Administrator</p>
              <p className="mt-1 truncate text-xs text-gray-500">
                {user?.email || "admin@aitasker.com"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex flex-1 flex-col gap-2 px-5">
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
          Main Menu
        </p>

        <NavLink to="/admin/dashboard" className={navLinkClass}>
          <span className="material-symbols-outlined text-[21px]">
            dashboard
          </span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/admin/disputes" className={navLinkClass}>
          <span className="material-symbols-outlined text-[21px]">gavel</span>
          <span>Disputes</span>
        </NavLink>

        <NavLink to="/admin/jobs" className={navLinkClass}>
          <span className="material-symbols-outlined text-[21px]">work</span>
          <span>Jobs</span>
        </NavLink>

        <NavLink to="/admin/users" className={navLinkClass}>
          <span className="material-symbols-outlined text-[21px]">groups</span>
          <span>Users</span>
        </NavLink>

        <NavLink to="/admin/transactions" className={navLinkClass}>
          <span className="material-symbols-outlined text-[21px]">
            receipt_long
          </span>
          <span>Transactions</span>
        </NavLink>
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/10 p-5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Logout
        </button>

        <p className="mt-4 text-center text-[11px] text-gray-600">
          AI Tasker Admin © 2026
        </p>
      </div>
    </aside>
  );
}