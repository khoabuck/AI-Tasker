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
    `group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
      isActive
        ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"
        : "border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
    }`;

  const adminInitials = getInitials(user?.fullName || user?.name || "Admin");

  return (
    <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 border-r border-white/10 bg-[#0b0f15] md:flex md:flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center text-xl font-extrabold tracking-tight no-underline"
        >
          <span className="text-cyan-300">AI</span>
          <span className="ml-1 text-white">Tasker</span>
          <span className="ml-3 rounded-full border border-red-400/25 bg-red-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-red-300">
            Admin
          </span>
        </Link>
      </div>

      <div className="px-4 py-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-400/30 bg-red-400/10 text-sm font-black text-red-300">
              {adminInitials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">
                {user?.fullName || user?.name || "Administrator"}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {user?.email || "admin@aitasker.com"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <NavItem to="/admin/dashboard" icon="dashboard" label="Dashboard" className={navLinkClass} />
        <NavItem to="/admin/users" icon="groups" label="Users" className={navLinkClass} />
        <NavItem to="/admin/disputes" icon="gavel" label="Disputes" className={navLinkClass} />
        <NavItem to="/admin/review-reports" icon="rate_review" label="Review reports" className={navLinkClass} />
        <NavItem to="/admin/audit-logs" icon="history" label="Audit logs" className={navLinkClass} />

        <NavSection label="Policies" />

        <NavItem to="/admin/expert-profile-scoring-policy" icon="rule_settings" label="Expert scoring" className={navLinkClass} />
        <NavItem to="/admin/workflow-policy" icon="settings_suggest" label="Workflow" className={navLinkClass} />
        <NavItem to="/admin/login-security-policy" icon="shield_lock" label="Login security" className={navLinkClass} />
        <NavItem to="/admin/job-posting-ai-policy" icon="smart_toy" label="Job AI" className={navLinkClass} />
        <NavItem to="/admin/platform-fee-policy" icon="payments" label="Platform fees" className={navLinkClass} />

        <NavSection label="Platform" />

        <NavItem to="/admin/ai-management" icon="hub" label="AI management" className={navLinkClass} />
        <NavItem to="/admin/job-credit-packages" icon="inventory_2" label="Job credit plans" className={navLinkClass} />
        <NavItem to="/admin/proposal-credit-packages" icon="workspace_premium" label="Proposal plans" className={navLinkClass} />
        <NavItem to="/admin/proposal-credits" icon="account_balance_wallet" label="Proposal credits" className={navLinkClass} />
        <NavItem to="/admin/jobs" icon="work" label="Jobs" className={navLinkClass} />
        <NavItem to="/admin/withdrawals" icon="account_balance" label="Withdrawals" className={navLinkClass} />
        <NavItem to="/admin/skills" icon="psychology" label="Skills" className={navLinkClass} />
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-semibold text-gray-400 transition hover:border-red-400/20 hover:bg-red-400/10 hover:text-red-300"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}

function NavItem({ to, icon, label, className }) {
  return (
    <NavLink to={to} className={className}>
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

function NavSection({ label }) {
  return (
    <div className="mb-1 mt-3 flex items-center gap-3 px-3">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">
        {label}
      </span>
      <span className="h-px flex-1 bg-white/[0.07]" />
    </div>
  );
}

function getInitials(name) {
  if (!name) return "AD";

  return String(name)
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((item) => item[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}