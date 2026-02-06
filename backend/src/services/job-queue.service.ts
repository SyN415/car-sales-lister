import supabaseAdmin from '../config/supabase';

export interface Job {
  id: string;
  type: string;
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: Record<string, any>;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

class JobQueueService {
  private processing = false;
  private pollInterval: NodeJS.Timeout | null = null;

  /**
   * Add a job to the queue
   */
  async enqueue(type: string, payload: Record<string, any>): Promise<Job> {
    const { data, error } = await supabaseAdmin
      .from('job_queue')
      .insert({ type, payload, status: 'pending' })
      .select()
      .single();

    if (error) throw new Error(`Failed to enqueue job: ${error.message}`);
    return data as Job;
  }

  /**
   * Process the next pending job
   */
  async processNext(): Promise<Job | null> {
    if (this.processing) return null;
    this.processing = true;

    try {
      // Get next pending job
      const { data: job, error } = await supabaseAdmin
        .from('job_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error || !job) {
        this.processing = false;
        return null;
      }

      // Mark as processing
      await supabaseAdmin
        .from('job_queue')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', job.id);

      try {
        const result = await this.executeJob(job as Job);

        await supabaseAdmin
          .from('job_queue')
          .update({ status: 'completed', result, completed_at: new Date().toISOString() })
          .eq('id', job.id);
      } catch (execError: any) {
        await supabaseAdmin
          .from('job_queue')
          .update({ status: 'failed', error: execError.message, completed_at: new Date().toISOString() })
          .eq('id', job.id);
      }

      this.processing = false;
      return job as Job;
    } catch (error) {
      this.processing = false;
      return null;
    }
  }

  /**
   * Execute a job based on its type
   */
  private async executeJob(job: Job): Promise<Record<string, any>> {
    switch (job.type) {
      case 'scrape_facebook':
        // TODO: Import and call scraper service
        return { message: 'Facebook scrape job executed' };
      case 'scrape_craigslist':
        return { message: 'Craigslist scrape job executed' };
      case 'match_watchlists':
        return { message: 'Watchlist matching job executed' };
      case 'send_alerts':
        return { message: 'Alert sending job executed' };
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Start polling for jobs
   */
  startPolling(intervalMs: number = 10000): void {
    if (this.pollInterval) return;
    console.log(`Job queue polling started (every ${intervalMs}ms)`);
    this.pollInterval = setInterval(() => this.processNext(), intervalMs);
  }

  /**
   * Stop polling for jobs
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('Job queue polling stopped');
    }
  }
}

export const jobQueueService = new JobQueueService();
