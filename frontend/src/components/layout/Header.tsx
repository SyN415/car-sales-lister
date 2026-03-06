import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useUnreadAlertCount } from '../../hooks/useAlerts';
import { Gauge, Sun, Moon } from 'lucide-react';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthContext();
  const { mode, toggleTheme } = useThemeContext();
  const { data: unreadCount } = useUnreadAlertCount(isAuthenticated);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinkClass =
    'text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors';

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200/60 dark:border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <Gauge className="w-5 h-5 text-cyan-500 group-hover:text-cyan-400 transition-colors" />
            <span className="font-bold text-base tracking-tight text-gray-900 dark:text-white">
              CSL
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-5">
            <Link to="/listings" className={navLinkClass}>Listings</Link>
            {isAuthenticated && (
              <>
                <Link to="/dashboard" className={navLinkClass}>Dashboard</Link>
                <Link to="/watchlists" className={navLinkClass}>Watchlists</Link>
                <Link to="/alerts" className={`relative ${navLinkClass}`}>
                  Alerts
                  {unreadCount && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-3.5 bg-cyan-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-gray-400 transition-colors"
              aria-label="Toggle theme"
            >
              {mode === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-600 dark:text-gray-300 font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs px-3 py-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="text-xs px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
