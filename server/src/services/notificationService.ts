import { NotificationPayload } from '../types';

/**
 * NotificationService
 * 
 * Handles sending notifications to users about traffic conditions.
 * Right now it just logs to console, but you can extend this to:
 * - Send push notifications (Firebase, OneSignal, etc.)
 * - Send SMS (Twilio)
 * - Send emails
 * - Trigger webhooks
 */
export class NotificationService {
  
  /**
   * Send a notification to a user
   * @param userId - The user to notify
   * @param payload - The notification content
   */
  async sendNotification(userId: string, payload: NotificationPayload): Promise<void> {
    // For now, just log it - you'll replace this with actual notification logic
    console.log(`\n🔔 Notification for user ${userId}:`);
    console.log(`   Type: ${payload.type}`);
    console.log(`   Status: ${payload.status}`);
    console.log(`   Current ETA: ${payload.currentETA}`);
    console.log(`   Normal ETA: ${payload.normalETA}`);
    console.log(`   Delay: ${payload.delay}`);
    console.log(`   Message: ${this.formatMessage(payload)}\n`);

    // TODO: Add your notification implementation here
    // Examples:
    // - await this.sendPushNotification(userId, payload);
    // - await this.sendSMS(userId, payload);
    // - await this.sendEmail(userId, payload);
  }

  /**
   * Format the notification payload into a user-friendly message
   */
  private formatMessage(payload: NotificationPayload): string {
    if (payload.type === 'get_cozy_twin') {
      return `🚗 Traffic is building up! Current ETA: ${payload.currentETA} (${payload.delay} delay). Might wanna chill a bit before heading out.`;
    } else {
      return `✅ Traffic is clearing up! Current ETA: ${payload.currentETA}. Get moving gang!`;
    }
  }
}