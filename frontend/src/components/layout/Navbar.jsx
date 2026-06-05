import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-glass-border">
      <div className="max-w-7xl mx-auto px-4 md:px-12 h-16 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="text-2xl font-bold text-on-surface tracking-tight">
          AI <span className="text-neon-cyan">Tasker</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-5 py-2 rounded-lg text-sm font-bold border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 transition-all"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-5 py-2 rounded-lg text-sm font-bold bg-primary-container text-white hover:scale-105 transition-all"
            style={{ boxShadow: '0 0 20px rgba(0,240,255,0.2)' }}
          >
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}
