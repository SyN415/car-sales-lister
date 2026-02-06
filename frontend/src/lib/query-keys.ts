export const authKeys = {
  currentUser: ['auth', 'me'] as const,
  status: ['auth', 'status'] as const,
} as const;

export const listingKeys = {
  all: (filters?: Record<string, any>) => {
    const key = ['listings'] as const;
    if (!filters) return key;
    const definedFilters = Object.entries(filters).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== '') acc[k] = v;
      return acc;
    }, {} as Record<string, any>);
    return [...key, definedFilters] as const;
  },
  detail: (id: string) => ['listing', id] as const,
  search: (query: string) => ['listings', 'search', query] as const,
} as const;

export const watchlistKeys = {
  all: ['watchlists'] as const,
  detail: (id: string) => ['watchlists', id] as const,
} as const;

export const alertKeys = {
  all: (unreadOnly?: boolean) => ['alerts', { unreadOnly }] as const,
  count: ['alerts', 'count'] as const,
} as const;

export const valuationKeys = {
  kbb: (params: Record<string, any>) => ['valuation', 'kbb', params] as const,
  vin: (vin: string) => ['valuation', 'vin', vin] as const,
} as const;
