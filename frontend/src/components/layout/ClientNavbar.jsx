// src/components/layout/ClientNavbar.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../../services/auth.service";

const NAV_ITEMS = [
  {
    label: "POST JOB",
    to: "/client/post-job",
    dropdown: null,
  },
  {
    label: "FIND JOBS",
    dropdown: [
      { icon: "auto_awesome",  label: "AI Matching",   to: "/client/ai-matching" },
      { icon: "person_search", label: "Expert Search", to: "/client/experts" },
    ],
  },
  {
    label: "PROJECTS",
    active: true,
    dropdown: [
      { icon: "list",          label: "List Projects",      to: "/client/projects" },
      { icon: "chat_bubble",   label: "Messages",           to: "/client/messages" },
    ],
  },
  {
    label: "FINANCE",
    dropdown: [
      { icon: "account_balance_wallet", label: "Wallet",       to: "/client/wallet" },
      { icon: "receipt_long",           label: "Transactions", to: "/client/transactions" },
    ],
  },
];

function NavItem({ label, to, dropdown, active }) {
  const [open, setOpen] = useState(false);

  if (!dropdown) {
    return (
      <li>
        <Link to={to} className="flex items-center gap-2 h-full text-xs font-mono tracking-widest text-gray-400 hover:text-cyan-400 transition-colors">
          {label}
        </Link>
      </li>
    );
  }

  return (
    <li className="relative h-full" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className={`flex items-center gap-2 h-full text-xs font-mono tracking-widest transition-colors ${active ? "text-white border-b-2 border-cyan-400" : "text-gray-400 hover:text-cyan-400"}`}>
        {label}
        <span className="material-symbols-outlined text-sm">expand_more</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 w-52 bg-[#232A35] border border-white/10 rounded-b-xl shadow-2xl py-2 z-50">
          {dropdown.map((item) => (
            <Link key={item.label} to={item.to} className="flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/10 hover:text-cyan-400 transition-colors">
              <span className="material-symbols-outlined text-sm">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}

export default function ClientNavbar() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "CL";

  const handleLogout = async () => {
    await authService.logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-[#101319]/90 backdrop-blur-xl border-b border-white/10 flex justify-between items-center w-full px-4 md:px-12 py-4">

      {/* Logo */}
      <div className="flex items-center gap-6">
        <Link to="/client/dashboard">
          <h1 className="text-xl font-bold text-blue-400 tracking-tight">AI Tasker</h1>
        </Link>
        <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />
      </div>

      {/* Nav items */}
      <ul className="hidden lg:flex items-center gap-8 h-full justify-center mx-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.label} {...item} />
        ))}
      </ul>

      {/* Phải: notification + avatar */}
      <div className="flex items-center gap-4">
        <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />

        {/* Notification bell */}
        <button className="p-2 bg-white/5 rounded-lg border border-white/10 text-gray-400 hover:text-cyan-400 transition-all">
          <span className="material-symbols-outlined">notifications</span>
        </button>

        {/* Avatar + dropdown */}
        <div className="relative group">
          <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-gray-900 font-bold text-sm cursor-pointer">
            {initials}
          </div>

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-44 bg-[#232A35] border border-white/10 rounded-xl shadow-2xl py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            
            {/* Tên user */}
            <p className="px-4 py-2 text-xs text-gray-400 border-b border-white/10 truncate">
              {user?.fullName}
            </p>

            {/* Profile */}
            <Link
              to="/client/profile"
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 hover:text-cyan-400 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">person</span>
              Profile
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-white hover:bg-white/10 hover:text-red-400 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}