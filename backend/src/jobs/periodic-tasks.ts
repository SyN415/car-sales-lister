import { jobQueueService } from '../services/job-queue.service';
import { listingService } from '../services/listing.service';

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

  // Mark disappeared listings as sold every 6 hours
  // This populates sold_at + days_on_market for the comps engine
  setInterval(async () => {
    try {
      const count = await listingService.markDisappearedListingsAsSold(48);
      console.log(`Mark-as-sold sweep complete: ${count} listings marked`);
    } catch (error) {
      console.error('Failed to mark disappeared listings:', error);
    }
  }, 6 * 60 * 60 * 1000);

  // Clean up old sold listings weekly (retain 90 days of comps data)
  setInterval(async () => {
    try {
      const count = await listingService.cleanupOldSoldListings(90);
      console.log(`Old sold listings cleanup: ${count} removed`);
    } catch (error) {
      console.error('Failed to cleanup old sold listings:', error);
    }
  }, 7 * 24 * 60 * 60 * 1000);

  console.log('Periodic tasks scheduled');
}

export function stopPeriodicTasks(): void {
  jobQueueService.stopPolling();
  console.log('Periodic tasks stopped');
}
