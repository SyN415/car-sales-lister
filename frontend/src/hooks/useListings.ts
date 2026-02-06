import { useQuery } from '@tanstack/react-query';
import { listingsAPI } from '../services/api';
import { listingKeys } from '../lib/query-keys';
import type { CarListingFilters } from '../types';

export const useListings = (filters?: CarListingFilters) => {
  return useQuery({
    queryKey: listingKeys.all(filters),
    queryFn: () => listingsAPI.getListings(filters),
  });
};

export const useListingDetail = (id: string) => {
  return useQuery({
    queryKey: listingKeys.detail(id),
    queryFn: () => listingsAPI.getListing(id),
    enabled: !!id,
  });
};

export const useSearchListings = (query: string) => {
  return useQuery({
    queryKey: listingKeys.search(query),
    queryFn: () => listingsAPI.searchListings(query),
    enabled: !!query && query.length > 2,
  });
};
