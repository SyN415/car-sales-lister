import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAlerts, useMarkAlertRead, useDismissAlert } from '../hooks/useAlerts';
import { formatCurrency, formatDate, getDealColor } from '../lib/utils';

const Alerts: React.FC = () => {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { data: alerts, isLoading, error } = useAlerts(showUnreadOnly);
  const markReadMutation = useMarkAlertRead();
  const dismissMutation = useDismissAlert();

  const handleMarkRead = (id: string) => markReadMutation.mutate(id);
  const handleDismiss = (id: string) => {
    if (window.confirm('Dismiss this alert?')) dismissMutation.mutate(id);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Deal Alerts</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={showUnreadOnly}
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
          />
          Unread only
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">Failed to load alerts.</div>
      ) : !alerts?.length ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="text-4xl mb-4">🔔</div>
          <p className="text-xl text-gray-500 dark:text-gray-400 mb-2">No alerts yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Create watchlists to get notified when matching deals appear
          </p>
          <Link to="/watchlists" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-block">
            Set Up Watchlists
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow p-6 border-l-4 ${
                !alert.is_read ? 'border-l-primary-500' : 'border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {!alert.is_read && (
                      <span className="h-2 w-2 bg-primary-500 rounded-full flex-shrink-0"></span>
                    )}
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {alert.car_listings?.title || 'Car Listing'}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {alert.car_listings?.price && (
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(alert.car_listings.price)}
                      </span>
                    )}
                    <span className={`font-semibold ${getDealColor(alert.deal_score)}`}>
                      Deal Score: {alert.deal_score}/100
                    </span>
                    {alert.price_vs_kbb && (
                      <span className={alert.price_vs_kbb < 0 ? 'text-green-600' : 'text-red-500'}>
                        {alert.price_vs_kbb < 0 ? `${Math.abs(alert.price_vs_kbb)}% below KBB` : `${alert.price_vs_kbb}% above KBB`}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {alert.car_watchlists?.name && (
                      <span>Watchlist: {alert.car_watchlists.name}</span>
                    )}
                    <span>{formatDate(alert.created_at)}</span>
                    {alert.car_listings?.platform && (
                      <span className={`px-2 py-0.5 rounded-full ${
                        alert.car_listings.platform === 'facebook'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {alert.car_listings.platform === 'facebook' ? 'Facebook' : 'Craigslist'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Link
                  to={`/listings/${alert.listing_id}`}
                  className="text-sm px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  View Listing
                </Link>
                {!alert.is_read && (
                  <button onClick={() => handleMarkRead(alert.id)}
                    className="text-sm px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                    Mark Read
                  </button>
                )}
                <button onClick={() => handleDismiss(alert.id)}
                  className="text-sm px-4 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Alerts;
