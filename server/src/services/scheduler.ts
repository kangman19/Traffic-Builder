import { TrafficMonitor } from './trafficMonitor';
import { NotificationService } from './notificationService';

/**
 * TrafficScheduler
 * 
 * Manages periodic traffic checks for all active monitoring sessions.
 * This is the "heartbeat" of your app - it runs on an interval and checks
 * traffic for each user who has an active session.
 * 
 * Think of it as a cron job that wakes up every X minutes and says:
 * "Let me check if traffic has changed for anyone"
 */
export class TrafficScheduler {
  private trafficMonitor: TrafficMonitor;
  private notificationService: NotificationService;
  private intervalId?: NodeJS.Timeout;
  private checkIntervalMs: number;

  constructor(
    trafficMonitor: TrafficMonitor,
    notificationService: NotificationService,
    checkIntervalMinutes: number = 5 // Default: check every 5 minutes
  ) {
    this.trafficMonitor = trafficMonitor;
    this.notificationService = notificationService;
    this.checkIntervalMs = checkIntervalMinutes * 60 * 1000;
  }

  /**
   * Start the scheduler - begins periodic traffic checks
   */
  start(): void {
    if (this.intervalId) {
      console.log('⚠️  Scheduler is already running');
      return;
    }

    console.log(`✅ Starting traffic scheduler (checking every ${this.checkIntervalMs / 60000} minutes)`);
    
    // Run immediately on start
    this.checkAllSessions();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.checkAllSessions();
    }, this.checkIntervalMs);
  }

  /**
   * Stop the scheduler - stops all traffic checks
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('🛑 Traffic scheduler stopped');
    }
  }

  /**
   * Check traffic for all active monitoring sessions
   */
  private async checkAllSessions(): Promise<void> {
    console.log(`\n⏰ Running scheduled traffic check at ${new Date().toLocaleTimeString()}`);

    // Get all active sessions
    // Note: You'll need to add a method to TrafficMonitor to get all sessions
    // For now, we'll need to track user IDs separately
    // This is a limitation we can fix in the next iteration
  }

  /**
   * Check traffic for a specific user
   */
  async checkUserTraffic(userId: string): Promise<void> {
    try {
      const result = await this.trafficMonitor.checkTraffic(userId);

      if (!result) {
        console.log(`No active session for user ${userId}`);
        return;
      }

      console.log(`📊 Traffic check for user ${userId}:`);
      console.log(`   Status: ${result.condition.status}`);
      console.log(`   ETA: ${result.condition.eta.toLocaleTimeString()}`);
      console.log(`   Duration in traffic: ${Math.floor(result.condition.durationInTraffic / 60)} min`);

      // Send notification if needed
      if (result.shouldNotify && result.notification) {
        await this.notificationService.sendNotification(userId, result.notification);
      }
    } catch (error) {
      console.error(`❌ Error checking traffic for user ${userId}:`, error);
    }
  }

  /**
   * Change the check interval (in minutes)
   */
  setCheckInterval(minutes: number): void {
    this.checkIntervalMs = minutes * 60 * 1000;
    
    // Restart if already running
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }
}