import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Find Your Perfect Car Deal
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Aggregate car listings from Facebook Marketplace and Craigslist. 
            Get KBB valuations, deal scores, and real-time alerts for the best prices.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/listings"
              className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-lg"
            >
              Browse Listings
            </Link>
            <Link
              to="/signup"
              className="px-8 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Multi-Platform Search</h3>
            <p className="text-gray-600 dark:text-gray-400">Search Facebook Marketplace and Craigslist simultaneously</p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">KBB Pricing</h3>
            <p className="text-gray-600 dark:text-gray-400">Instant Kelley Blue Book valuations to know if it's a good deal</p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">🔔</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deal Alerts</h3>
            <p className="text-gray-600 dark:text-gray-400">Get notified when cars matching your criteria appear below market value</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
