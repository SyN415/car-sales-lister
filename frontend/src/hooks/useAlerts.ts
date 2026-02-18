import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsAPI } from '../services/api';
import { alertKeys } from '../lib/query-keys';

export const useAlerts = (unreadOnly: boolean = false) => {
  return useQuery({
    queryKey: alertKeys.all(unreadOnly),
    queryFn: () => alertsAPI.getAlerts(unreadOnly),
  });
};

export const useUnreadAlertCount = (enabled: boolean = true) => {
  return useQuery({
    queryKey: alertKeys.count,
    queryFn: alertsAPI.getUnreadCount,
    refetchInterval: 30000, // Poll every 30 seconds
    enabled,
  });
};

export const useMarkAlertRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: alertsAPI.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

export const useDismissAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: alertsAPI.dismissAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};
