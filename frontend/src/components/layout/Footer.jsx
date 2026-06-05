const LINK_GROUPS = [
  {
    heading: 'For Clients',
    links: ['Find AI Talent', 'Post a Project', 'Enterprise Solutions', 'Hire Managed Teams'],
  },
  {
    heading: 'For Experts',
    links: ['Browse Projects', 'AI Expert Benefits', 'Vetting Process', 'Community Hub'],
  },
  {
    heading: 'Company',
    links: ['About Us', 'Careers', 'Support', 'Blog'],
  },
];

const LEGAL_LINKS = ['Privacy Policy', 'Terms of Service', 'Cookie Policy'];

export default function Footer() {
  return (
    <footer className="bg-surface-container-lowest border-t border-glass-border pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 md:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <div className="text-2xl font-display font-bold text-on-surface mb-6">
              AI <span className="text-neon-cyan">Tasker</span>
            </div>
            <p className="text-on-surface-variant text-sm max-w-xs leading-relaxed mb-6">
              The premier infrastructure for hiring AI talent and managing deep-tech projects at scale.
            </p>
            <div className="flex gap-4">
              {['public', 'code'].map((icon) => (
                <a
                  key={icon}
                  href="#"
                  className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-neon-cyan transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">{icon}</span>
                </a>
              ))}
            </div>
          </div>

          {LINK_GROUPS.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="font-bold text-sm mb-6 uppercase tracking-wider text-on-surface">{heading}</h4>
              <ul className="space-y-4 text-sm text-on-surface-variant">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="hover:text-neon-cyan transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-glass-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-on-surface-variant">
          <p>© 2024 AI Tasker Inc. All rights reserved.</p>
          <div className="flex gap-8">
            {LEGAL_LINKS.map((link) => (
              <a key={link} href="#" className="hover:text-neon-cyan transition-colors">{link}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
