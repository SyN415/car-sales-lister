import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useUnreadAlertCount } from '../../hooks/useAlerts';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthContext();
  const { mode, toggleTheme } = useThemeContext();
  const { data: unreadCount } = useUnreadAlertCount(isAuthenticated);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🚗</span>
            <span className="font-bold text-xl text-gray-900 dark:text-white">
              Car Sales Lister
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/listings" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">
              Listings
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">
                  Dashboard
                </Link>
                <Link to="/watchlists" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">
                  Watchlists
                </Link>
                <Link to="/alerts" className="relative text-gray-600 dark:text-gray-300 hover:text-primary-600">
                  Alerts
                  {unreadCount && unreadCount > 0 && (
                    <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle theme"
            >
              {mode === 'light' ? '🌙' : '☀️'}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="text-sm px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white"
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
