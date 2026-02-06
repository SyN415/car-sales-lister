import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useListingDetail } from '../hooks/useListings';
import { formatCurrency, formatMileage, formatDate, getDealColor } from '../lib/utils';

const ListingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading, error } = useListingDetail(id || '');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Listing Not Found</h2>
        <Link to="/listings" className="text-primary-600 hover:underline">Back to Listings</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/listings" className="text-sm text-primary-600 hover:underline mb-4 inline-block">← Back to Listings</Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Image Gallery */}
          {listing.images && listing.images.length > 0 ? (
            <div className="rounded-xl overflow-hidden mb-6">
              <img src={listing.images[0]} alt={listing.title} className="w-full h-80 object-cover" />
              {listing.images.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto">
                  {listing.images.slice(1, 5).map((img, i) => (
                    <img key={i} src={img} alt="" className="h-20 w-24 object-cover rounded-lg flex-shrink-0" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-80 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center text-6xl mb-6">🚗</div>
          )}

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{listing.title}</h1>

          <div className="flex flex-wrap gap-3 mb-6">
            <span className={`text-xs px-3 py-1 rounded-full ${
              listing.platform === 'facebook' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
            }`}>
              {listing.platform === 'facebook' ? 'Facebook Marketplace' : 'Craigslist'}
            </span>
            {listing.condition && (
              <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 capitalize">
                {listing.condition}
              </span>
            )}
            {listing.seller_location && (
              <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                📍 {listing.seller_location}
              </span>
            )}
          </div>

          {listing.description && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Description</h2>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{listing.description}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <p className="text-3xl font-bold text-primary-600 mb-2">{formatCurrency(listing.price)}</p>
            {listing.deal_score !== undefined && listing.deal_score !== null && (
              <div className="mb-4">
                <p className={`text-lg font-semibold ${getDealColor(listing.deal_score)}`}>
                  Deal Score: {listing.deal_score}/100
                </p>
              </div>
            )}
            {listing.url && (
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
              >
                View Original Listing
              </a>
            )}
          </div>

          {/* Vehicle Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Vehicle Details</h2>
            <dl className="space-y-3">
              {listing.year && <DetailRow label="Year" value={String(listing.year)} />}
              {listing.make && <DetailRow label="Make" value={listing.make} />}
              {listing.model && <DetailRow label="Model" value={listing.model} />}
              {listing.mileage && <DetailRow label="Mileage" value={formatMileage(listing.mileage)} />}
              {listing.transmission && <DetailRow label="Transmission" value={listing.transmission} />}
              {listing.fuel_type && <DetailRow label="Fuel Type" value={listing.fuel_type} />}
              {listing.drive_type && <DetailRow label="Drive Type" value={listing.drive_type} />}
              {listing.body_type && <DetailRow label="Body Type" value={listing.body_type} />}
              {listing.color && <DetailRow label="Color" value={listing.color} />}
              {listing.vin && <DetailRow label="VIN" value={listing.vin} />}
            </dl>
          </div>

          {/* Listing Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Listing Info</h2>
            <dl className="space-y-3">
              {listing.seller_name && <DetailRow label="Seller" value={listing.seller_name} />}
              <DetailRow label="Listed" value={formatDate(listing.created_at)} />
              <DetailRow label="Last Seen" value={formatDate(listing.scraped_at)} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between">
    <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="text-sm font-medium text-gray-900 dark:text-white">{value}</dd>
  </div>
);

export default ListingDetails;
