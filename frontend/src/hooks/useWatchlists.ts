import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistsAPI } from '../services/api';
import { watchlistKeys } from '../lib/query-keys';

export const useWatchlists = () => {
  return useQuery({
    queryKey: watchlistKeys.all,
    queryFn: watchlistsAPI.getWatchlists,
  });
};

export const useCreateWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: watchlistsAPI.createWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: watchlistKeys.all });
    },
  });
};

export const useUpdateWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      watchlistsAPI.updateWatchlist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: watchlistKeys.all });
    },
  });
};

export const useDeleteWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: watchlistsAPI.deleteWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: watchlistKeys.all });
    },
  });
};
