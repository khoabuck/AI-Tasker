import { Link } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";

export default function ExpertDashboard() {
  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)] transition hover:border-cyan-400/40 hover:shadow-[0_0_35px_rgba(0,240,255,0.08)]";

  const quickActions = [
    {
      title: "Expert Profile",
      desc: "Set up your skills, certificates and portfolio.",
      icon: "person",
      to: "/expert/profile",
      tag: "Required",
    },
    {
      title: "Browse Jobs",
      desc: "Find open jobs that match your expert profile.",
      icon: "work",
      to: "/expert/jobs",
      tag: "Open jobs",
    },
    {
      title: "Recommended Jobs",
      desc: "View AI recommended jobs for your skills.",
      icon: "auto_awesome",
      to: "/expert/recommended-jobs",
      tag: "AI match",
    },
  ];

  const workItems = [
    {
      title: "My Proposals",
      desc: "Track proposals you sent to clients.",
      icon: "description",
      to: "/expert/proposals",
      tag: "Proposal",
    },
    {
      title: "My Projects",
      desc: "View active projects and milestones.",
      icon: "folder_open",
      to: "/expert/projects",
      tag: "Project",
    },
    {
      title: "Deliverables",
      desc: "Submit your project deliverables.",
      icon: "upload_file",
      to: "/expert/deliverables",
      tag: "Submit",
    },
  ];

  const supportItems = [
    {
      title: "Messages",
      desc: "Chat with clients in real time.",
      icon: "chat",
      to: "/expert/messages",
      tag: "Chat",
    },
    {
      title: "Disputes",
      desc: "Open or track project disputes.",
      icon: "gavel",
      to: "/expert/disputes",
      tag: "Support",
    },
    {
      title: "Wallet",
      desc: "Check simulated balance and payments.",
      icon: "account_balance_wallet",
      to: "/expert/wallet",
      tag: "Finance",
    },
  ];

  const renderSection = (title, icon, items) => (
    <section className="mb-10">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-7 w-1 rounded-full bg-[#00F0FF]" />

        <h2 className="text-xl font-bold text-white">{title}</h2>

        <span className="material-symbols-outlined text-[20px] text-[#00F0FF]">
          {icon}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {items.map((item) => (
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

            <h3 className="text-lg font-bold text-white">{item.title}</h3>

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
  );

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              AI Expert Workspace
            </p>

            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
              Manage your expert work in one place
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
              Complete your profile, find jobs, send proposals, manage projects
              and track deliverables in the AI Tasker expert workspace.
            </p>
          </section>

          <section className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-4">
            <div className={cardStyle}>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Open Jobs
              </p>
              <p className="mt-2 text-3xl font-bold text-white">0</p>
              <p className="mt-2 text-xs text-gray-500">Ready to apply</p>
            </div>

            <div className={cardStyle}>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Proposals
              </p>
              <p className="mt-2 text-3xl font-bold text-white">0</p>
              <p className="mt-2 text-xs text-gray-500">Submitted</p>
            </div>

            <div className={cardStyle}>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Projects
              </p>
              <p className="mt-2 text-3xl font-bold text-white">0</p>
              <p className="mt-2 text-xs text-gray-500">Active now</p>
            </div>

            <div className={cardStyle}>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Disputes
              </p>
              <p className="mt-2 text-3xl font-bold text-white">0</p>
              <p className="mt-2 text-xs text-gray-500">Need action</p>
            </div>
          </section>

          <section className="mb-10 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-bold text-yellow-300">
                  Complete your expert profile first
                </h2>
                <p className="mt-1 text-sm text-yellow-100/70">
                  Your profile helps the system match you with suitable AI
                  projects.
                </p>
              </div>

              <Link
                to="/expert/profile"
                className="rounded-xl border border-yellow-300/40 px-5 py-3 text-center text-sm font-bold text-yellow-200 transition hover:bg-yellow-300 hover:text-black"
              >
                Setup Profile
              </Link>
            </div>
          </section>

          {renderSection("Top Expert Actions", "bolt", quickActions)}
          {renderSection("Work Management", "folder_open", workItems)}
          {renderSection("Support & Finance", "support_agent", supportItems)}
        </div>
      </div>
    </ExpertLayout>
  );
}