import { jobQueueService } from '../services/job-queue.service';

/**
 * Schedule periodic tasks
 */
export function startPeriodicTasks(): void {
  // Process job queue every 10 seconds
  jobQueueService.startPolling(10000);

  // Schedule watchlist matching every 30 minutes
  setInterval(async () => {
    try {
      await jobQueueService.enqueue('match_watchlists', {});
      console.log('Watchlist matching job enqueued');
    } catch (error) {
      console.error('Failed to enqueue watchlist matching:', error);
    }
  }, 30 * 60 * 1000);

  // Schedule listing cleanup daily
  setInterval(async () => {
    try {
      await jobQueueService.enqueue('cleanup_listings', { daysOld: 30 });
      console.log('Listing cleanup job enqueued');
    } catch (error) {
      console.error('Failed to enqueue listing cleanup:', error);
    }
  }, 24 * 60 * 60 * 1000);

  console.log('Periodic tasks scheduled');
}

export function stopPeriodicTasks(): void {
  jobQueueService.stopPolling();
  console.log('Periodic tasks stopped');
}
