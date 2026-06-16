import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ExpertNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, handleLogout: logoutContext } = useAuth();

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

            <div className="invisible absolute right-0 top-full z-50 w-64 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div className="rounded-xl border border-white/10 bg-[#151a22] p-2 shadow-2xl">
                <p className="truncate border-b border-white/10 px-3 py-2 text-xs text-gray-400">
                  {user?.email || "expert@aitasker.com"}
                </p>

                <DropdownLink to="/expert/profile" icon="person" label="Profile" />
                <DropdownLink to="/expert/wallet" icon="account_balance_wallet" label="Wallet" />

                <div className="my-2 border-t border-white/10" />

                <DropdownLink to="/expert/jobs" icon="work" label="Find Jobs" />
                <DropdownLink to="/expert/recommended-jobs" icon="auto_awesome" label="AI Jobs" />
                <DropdownLink to="/expert/proposals" icon="description" label="Proposals" />
                <DropdownLink to="/expert/projects" icon="folder_managed" label="Projects" />
                <DropdownLink to="/expert/disputes" icon="gavel" label="Disputes" />
                <DropdownLink to="/expert/messages" icon="chat" label="Messages" />

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