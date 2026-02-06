import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useListings } from '../hooks/useListings';
import { formatCurrency, formatMileage, getDealColor } from '../lib/utils';
import type { CarListingFilters, Platform } from '../types';

const MAKES = ['Any', 'Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz', 'Audi', 'Nissan', 'Hyundai', 'Kia', 'Subaru', 'Volkswagen', 'Mazda', 'Jeep', 'Ram', 'GMC', 'Dodge', 'Tesla', 'Lexus'];

const Listings: React.FC = () => {
  const [filters, setFilters] = useState<CarListingFilters>({
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const { data, isLoading, error } = useListings(filters);

  const updateFilter = (key: keyof CarListingFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Car Listings</h1>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Platform</label>
            <select
              value={filters.platform || ''}
              onChange={(e) => updateFilter('platform', e.target.value as Platform)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            >
              <option value="">All</option>
              <option value="facebook">Facebook</option>
              <option value="craigslist">Craigslist</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Make</label>
            <select
              value={filters.make || ''}
              onChange={(e) => updateFilter('make', e.target.value === 'Any' ? '' : e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            >
              {MAKES.map(m => <option key={m} value={m === 'Any' ? '' : m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Min Year</label>
            <input
              type="number" placeholder="2015" value={filters.min_year || ''}
              onChange={(e) => updateFilter('min_year', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Max Price</label>
            <input
              type="number" placeholder="25000" value={filters.max_price || ''}
              onChange={(e) => updateFilter('max_price', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Max Mileage</label>
            <input
              type="number" placeholder="100000" value={filters.max_mileage || ''}
              onChange={(e) => updateFilter('max_mileage', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sort By</label>
            <select
              value={filters.sort_by || 'created_at'}
              onChange={(e) => updateFilter('sort_by', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            >
              <option value="created_at">Newest</option>
              <option value="price">Price</option>
              <option value="year">Year</option>
              <option value="mileage">Mileage</option>
              <option value="deal_score">Deal Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">Failed to load listings. Please try again.</div>
      ) : !data?.items?.length ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p className="text-xl mb-2">No listings found</p>
          <p>Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {data.pagination.total} listings found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.items.map((listing) => (
              <Link
                key={listing.id}
                to={`/listings/${listing.id}`}
                className="bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                {listing.images?.[0] ? (
                  <img src={listing.images[0]} alt={listing.title} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-4xl">🚗</div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">{listing.title}</h3>
                    <span className="text-lg font-bold text-primary-600 whitespace-nowrap ml-2">
                      {formatCurrency(listing.price)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {listing.year && <span>{listing.year}</span>}
                    {listing.make && <span>• {listing.make}</span>}
                    {listing.model && <span>{listing.model}</span>}
                    {listing.mileage && <span>• {formatMileage(listing.mileage)}</span>}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      listing.platform === 'facebook' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {listing.platform === 'facebook' ? 'Facebook' : 'Craigslist'}
                    </span>
                    {listing.deal_score !== undefined && listing.deal_score !== null && (
                      <span className={`text-sm font-semibold ${getDealColor(listing.deal_score)}`}>
                        Deal: {listing.deal_score}/100
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setFilters(f => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))}
                disabled={filters.page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 text-sm text-gray-700 dark:text-gray-300"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                Page {filters.page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters(f => ({ ...f, page: Math.min(data.pagination.totalPages, (f.page || 1) + 1) }))}
                disabled={filters.page === data.pagination.totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 text-sm text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Listings;
