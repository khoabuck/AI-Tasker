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
    `text-[11px] font-bold tracking-[0.18em] uppercase transition ${
      isActive ? "text-[#00F0FF]" : "text-gray-400 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d1117]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center text-xl font-extrabold tracking-tight no-underline"
        >
          <span className="text-[#00F0FF]">AI</span>
          <span className="ml-1 text-white">Tasker</span>
          <span className="ml-3 rounded-full border border-red-400/30 bg-red-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
            Admin
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavLink to="/admin/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>

          <NavLink to="/admin/disputes" className={navLinkClass}>
            Disputes
          </NavLink>

          <NavLink to="/admin/projects" className={navLinkClass}>
            Projects
          </NavLink>

          <NavLink to="/admin/experts" className={navLinkClass}>
            Experts
          </NavLink>

          <NavLink to="/admin/users" className={navLinkClass}>
            Users
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
              className="flex h-9 w-9 items-center justify-center rounded-full border border-red-400/40 bg-red-400/10 text-sm font-bold text-red-300"
            >
              AD
            </button>

            <div className="invisible absolute right-0 top-12 w-48 rounded-xl border border-white/10 bg-[#151a22] p-2 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
              <p className="truncate border-b border-white/10 px-3 py-2 text-xs text-gray-400">
                {user?.email || "admin@aitasker.com"}
              </p>

              <Link
                to="/admin/dashboard"
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
          </div>
        </div>
      </div>
    </header>
  );
}