import { Link } from "react-router-dom";
import ExpertNavbar from "./ExpertNavbar";

export default function ExpertLayout({ children }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-[#0d1117] text-[#e1e2eb]">
      <ExpertNavbar />

      <main className="min-h-0 flex-1">{children}</main>

      <footer className="border-t border-white/10 bg-[#0b0f15]">
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
            <div>
              <Link
                to="/expert/dashboard"
                className="inline-flex items-center text-lg font-extrabold tracking-tight no-underline"
              >
                <span className="text-cyan-300">AI</span>
                <span className="ml-1 text-white">Tasker</span>
              </Link>

              <p className="mt-3 max-w-sm text-sm leading-6 text-gray-500">
                Find AI projects, submit proposals, manage your work, and track
                your earnings in one place.
              </p>
            </div>

            <FooterSection title="Find Work">
              <FooterLink to="/expert/jobs">Browse Jobs</FooterLink>

              <FooterLink to="/expert/recommended-jobs">
                Recommended Jobs
              </FooterLink>

              <FooterLink to="/expert/proposals">
                My Proposals
              </FooterLink>

              <FooterLink to="/expert/proposal/drafts">
                Saved Proposals
              </FooterLink>
            </FooterSection>

            <FooterSection title="My Work">
              <FooterLink to="/expert/projects">Projects</FooterLink>

              <FooterLink to="/expert/disputes">Disputes</FooterLink>

              <FooterLink to="/expert/messages">Messages</FooterLink>

              <FooterLink to="/expert/reviews">Reviews</FooterLink>
            </FooterSection>

            <FooterSection title="Account">
              <FooterLink to="/expert/profile">Profile</FooterLink>

              <FooterLink to="/expert/skills">Skills</FooterLink>

              <FooterLink to="/expert/wallet">Wallet</FooterLink>

              <FooterLink to="/expert/notifications">
                Notifications
              </FooterLink>
            </FooterSection>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <p>© {currentYear} AI Tasker. All rights reserved.</p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link
                to="/expert/dashboard"
                className="transition hover:text-cyan-300"
              >
                Dashboard
              </Link>

              <Link
                to="/expert/messages"
                className="transition hover:text-cyan-300"
              >
                Messages
              </Link>

              <Link
                to="/expert/notifications"
                className="transition hover:text-cyan-300"
              >
                Notifications
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterSection({ title, children }) {
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-gray-300">
        {title}
      </h3>

      <div className="flex flex-col items-start gap-2.5 text-sm">
        {children}
      </div>
    </div>
  );
}

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      className="text-gray-500 transition hover:text-cyan-300"
    >
      {children}
    </Link>
  );
}