import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AdminNavbar() {
  const navigate = useNavigate();
  const { user, handleLogout: logoutContext } = useAuth();

  const handleLogout = () => {
    logoutContext();
    navigate("/login", { replace: true });
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-cyan-400/10 text-[#00F0FF] border border-cyan-400/30"
        : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
    }`;

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-white/10 bg-[#0b0f16] px-5 py-5 md:flex md:flex-col">
      <Link
        to="/admin/dashboard"
        className="mb-8 inline-flex items-center text-xl font-extrabold tracking-tight no-underline"
      >
        <span className="text-[#00F0FF]">AI</span>
        <span className="ml-1 text-white">Tasker</span>
        <span className="ml-3 rounded-full border border-red-400/30 bg-red-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
          Admin
        </span>
      </Link>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-400/40 bg-red-400/10 text-sm font-bold text-red-300">
            AD
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Administrator</p>
            <p className="truncate text-xs text-gray-500">
              {user?.email || "admin@aitasker.com"}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        <NavLink to="/admin/dashboard" className={navLinkClass}>
          <span className="material-symbols-outlined text-[20px]">
            dashboard
          </span>
          Dashboard
        </NavLink>

        <NavLink to="/admin/disputes" className={navLinkClass}>
          <span className="material-symbols-outlined text-[20px]">
            gavel
          </span>
          Disputes
        </NavLink>

        <NavLink to="/admin/withdrawals" className={navLinkClass}>
          <span className="material-symbols-outlined text-[20px]">
            account_balance
          </span>
          Withdrawals
        </NavLink>

        <NavLink to="/admin/skills" className={navLinkClass}>
          <span className="material-symbols-outlined text-[20px]">
            psychology
          </span>
          Skills
        </NavLink>
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-400 transition hover:bg-red-400/10 hover:text-red-400"
        >
          <span className="material-symbols-outlined text-[20px]">
            logout
          </span>
          Logout
        </button>
      </div>
    </aside>
  );
}