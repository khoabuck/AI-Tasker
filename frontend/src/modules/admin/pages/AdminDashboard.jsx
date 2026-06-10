import { Link } from "react-router-dom";
import AdminLayout from "../../../components/layout/AdminLayout";

export default function AdminDashboardPage() {
  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)] transition hover:border-cyan-400/40 hover:shadow-[0_0_35px_rgba(0,240,255,0.08)]";

  const adminActions = [
    {
      title: "Dispute Management",
      desc: "Review project disputes and make final decisions.",
      icon: "gavel",
      to: "/admin/disputes",
      tag: "Important",
    },
    {
      title: "Expert Verification",
      desc: "Check expert profiles, certificates and skills.",
      icon: "verified_user",
      to: "/admin/experts",
      tag: "Review",
    },
    {
      title: "Project Management",
      desc: "Monitor projects, milestones and deliverables.",
      icon: "folder_open",
      to: "/admin/projects",
      tag: "Projects",
    },
    {
      title: "User Management",
      desc: "View clients, experts and account status.",
      icon: "groups",
      to: "/admin/users",
      tag: "Users",
    },
    {
      title: "Payment & Escrow",
      desc: "Track escrow money and payment transactions.",
      icon: "account_balance_wallet",
      to: "/admin/payments",
      tag: "Finance",
    },
    {
      title: "Chat Monitoring",
      desc: "View communication history when needed for dispute review.",
      icon: "forum",
      to: "/admin/chats",
      tag: "Chat",
    },
  ];

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Admin Workspace
            </p>

            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
              Manage AI Tasker system
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
              Review expert profiles, manage projects, handle disputes, monitor
              deliverables and support platform operations.
            </p>
          </section>

          <section className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-4">
            <div className={cardStyle}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10">
                <span className="material-symbols-outlined text-yellow-300">
                  gavel
                </span>
              </div>

              <p className="text-xs uppercase tracking-wider text-gray-500">
                Open Disputes
              </p>
              <p className="mt-2 text-3xl font-bold text-white">0</p>
              <p className="mt-2 text-xs text-gray-500">Need admin review</p>
            </div>

            <div className={cardStyle}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                <span className="material-symbols-outlined text-[#00F0FF]">
                  verified_user
                </span>
              </div>

              <p className="text-xs uppercase tracking-wider text-gray-500">
                Pending Experts
              </p>
              <p className="mt-2 text-3xl font-bold text-white">0</p>
              <p className="mt-2 text-xs text-gray-500">Profile checking</p>
            </div>

            <div className={cardStyle}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-green-400/20 bg-green-400/10">
                <span className="material-symbols-outlined text-green-300">
                  folder_open
                </span>
              </div>

              <p className="text-xs uppercase tracking-wider text-gray-500">
                Active Projects
              </p>
              <p className="mt-2 text-3xl font-bold text-white">0</p>
              <p className="mt-2 text-xs text-gray-500">Running now</p>
            </div>

            <div className={cardStyle}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10">
                <span className="material-symbols-outlined text-red-300">
                  warning
                </span>
              </div>

              <p className="text-xs uppercase tracking-wider text-gray-500">
                Reports
              </p>
              <p className="mt-2 text-3xl font-bold text-white">0</p>
              <p className="mt-2 text-xs text-gray-500">Need attention</p>
            </div>
          </section>

          <section className="mb-10 rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-bold text-red-300">
                  Admin review is important
                </h2>
                <p className="mt-1 text-sm text-red-100/70">
                  Disputes and expert verification affect user trust, payment,
                  and project quality.
                </p>
              </div>

              <Link
                to="/admin/disputes"
                className="rounded-xl border border-red-300/40 px-5 py-3 text-center text-sm font-bold text-red-200 transition hover:bg-red-300 hover:text-black"
              >
                Review Disputes
              </Link>
            </div>
          </section>

          <section>
            <div className="mb-5 flex items-center gap-3">
              <div className="h-7 w-1 rounded-full bg-[#00F0FF]" />
              <h2 className="text-xl font-bold text-white">Admin Actions</h2>
              <span className="material-symbols-outlined text-[20px] text-[#00F0FF]">
                admin_panel_settings
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {adminActions.map((item) => (
                <Link key={item.title} to={item.to} className={cardStyle}>
                  <div className="mb-5 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                      <span className="material-symbols-outlined text-2xl text-[#00F0FF]">
                        {item.icon}
                      </span>
                    </div>

                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white">
                    {item.title}
                  </h3>

                  <p className="mt-2 min-h-[48px] text-sm leading-6 text-gray-400">
                    {item.desc}
                  </p>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <button className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300">
                      Details
                    </button>

                    <button className="flex-1 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black">
                      Open
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}