import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useWatchlists } from '../hooks/useWatchlists';
import { useAlerts } from '../hooks/useAlerts';
import { useListings } from '../hooks/useListings';
import { formatCurrency } from '../lib/utils';

const Dashboard: React.FC = () => {
  const { user } = useAuthContext();
  const { data: watchlists, isLoading: watchlistsLoading } = useWatchlists();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: listingsData, isLoading: listingsLoading } = useListings({ limit: 5, sort_by: 'created_at', sort_order: 'desc' });

  const unreadAlerts = alerts?.filter(a => !a.is_read) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back{user?.fullName ? `, ${user.fullName}` : ''}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Here's your car search overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="text-3xl mb-2">👁️</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {watchlistsLoading ? '...' : watchlists?.length || 0}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Active Watchlists</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="text-3xl mb-2">🔔</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {alertsLoading ? '...' : unreadAlerts.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Unread Alerts</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="text-3xl mb-2">🚗</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {listingsLoading ? '...' : listingsData?.pagination?.total || 0}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Listings</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="text-3xl mb-2">💰</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {alertsLoading ? '...' : alerts?.filter(a => a.deal_score >= 80).length || 0}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Great Deals Found</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Alerts</h2>
            <Link to="/alerts" className="text-sm text-primary-600 hover:text-primary-700">View All</Link>
          </div>
          <div className="p-6">
            {alertsLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : unreadAlerts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No new alerts. Set up watchlists to get notified!</p>
            ) : (
              <ul className="space-y-4">
                {unreadAlerts.slice(0, 5).map((alert) => (
                  <li key={alert.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {alert.car_listings?.title || 'Car listing'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Deal Score: {alert.deal_score} • {alert.car_listings?.price ? formatCurrency(alert.car_listings.price) : 'N/A'}
                      </p>
                    </div>
                    <Link to={`/listings/${alert.listing_id}`} className="text-primary-600 text-sm hover:underline">
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Watchlists */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Watchlists</h2>
            <Link to="/watchlists" className="text-sm text-primary-600 hover:text-primary-700">Manage</Link>
          </div>
          <div className="p-6">
            {watchlistsLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : !watchlists || watchlists.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No watchlists yet</p>
                <Link to="/watchlists" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
                  Create Watchlist
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {watchlists.slice(0, 5).map((wl) => (
                  <li key={wl.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{wl.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {[wl.make, wl.model, wl.min_year && `${wl.min_year}+`].filter(Boolean).join(' ') || 'All cars'}
                        {wl.max_price ? ` • Under ${formatCurrency(wl.max_price)}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${wl.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500'}`}>
                      {wl.is_active ? 'Active' : 'Paused'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
