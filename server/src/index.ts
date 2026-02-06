/**
 * Traffic Monitor App - Main Entry Point
 * 
 * This is where everything starts! Think of this as the control center.
 * It creates all the services, wires them together, and starts monitoring.
 * 
 * Flow:
 * 1. Load configuration (API keys, etc.)
 * 2. Create services (Google Maps, Traffic Monitor, Notifications, Scheduler)
 * 3. Create user sessions
 * 4. Start the scheduler to check traffic periodically
 */

import { config } from './config';
import { TrafficMonitor } from './services/trafficMonitor';
import { NotificationService } from './services/notificationService';
import { TrafficScheduler } from './services/scheduler';
import { MonitoringSession, Location } from './types';

/**
 * Main application class
 */
class TrafficApp {
  private trafficMonitor: TrafficMonitor;
  private notificationService: NotificationService;
  private scheduler: TrafficScheduler;

  constructor() {
    // Initialize all services
    console.log('🚀 Initializing Traffic Monitor App...\n');

    this.trafficMonitor = new TrafficMonitor(config.googleMapsApiKey);
    this.notificationService = new NotificationService();
    this.scheduler = new TrafficScheduler(
      this.trafficMonitor,
      this.notificationService,
      config.checkIntervalMinutes
    );

    console.log('✅ All services initialized\n');
  }

  /**
   * Create a monitoring session for a user
   */
  createMonitoringSession(
    userId: string,
    homeLocation: Location,
    currentLocation: Location,
    notificationThreshold?: number
  ): void {
    const session: MonitoringSession = {
      userId,
      homeLocation,
      currentLocation,
      isActive: true,
      notificationThreshold: notificationThreshold || config.defaultNotificationThreshold,
    };

    this.trafficMonitor.createSession(session);
    console.log(`✅ Created monitoring session for user: ${userId}`);
    console.log(`   Home: (${homeLocation.lat}, ${homeLocation.long})`);
    console.log(`   Current: (${currentLocation.lat}, ${currentLocation.long})`);
    console.log(`   Threshold: ${session.notificationThreshold}%\n`);
  }

  /**
   * Update a user's current location
   */
  updateUserLocation(userId: string, location: Location): void {
    this.trafficMonitor.updateCurrentLocation(userId, location);
    console.log(`📍 Updated location for user ${userId}: (${location.lat}, ${location.long})`);
  }

  /**
   * Stop monitoring for a user
   */
  stopMonitoring(userId: string): void {
    this.trafficMonitor.stopSession(userId);
    console.log(`🛑 Stopped monitoring for user: ${userId}`);
  }

  /**
   * Start the traffic monitoring scheduler
   */
  start(): void {
    this.scheduler.start();
  }

  /**
   * Stop the traffic monitoring scheduler
   */
  stop(): void {
    this.scheduler.stop();
  }

  /**
   * Manually trigger a traffic check for a specific user
   */
  async checkTrafficNow(userId: string): Promise<void> {
    await this.scheduler.checkUserTraffic(userId);
  }
}

/**
 * Example usage - This shows how to use the app
 * In a real app, you'd get this data from a database or API
 */
async function main() {
  const app = new TrafficApp();

  // Example: Create a monitoring session
  // Replace these with real coordinates
  const exampleHomeLocation: Location = {
    lat: 34.0522,  // Los Angeles
    long: -118.2437
  };

  const exampleCurrentLocation: Location = {
    lat: 34.0689,  // Slightly north
    long: -118.4452
  };

  // Create a session for user "user123"
  app.createMonitoringSession(
    'user123',
    exampleHomeLocation,
    exampleCurrentLocation,
    20 // Notify when traffic increases by 20%
  );

  // Start the scheduler
  app.start();

  // Example: Manually check traffic immediately
  console.log('🔍 Running initial traffic check...\n');
  await app.checkTrafficNow('user123');

  // Keep the app running
  console.log('\n✅ App is running! Press Ctrl+C to stop.\n');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    app.stop();
    process.exit(0);
  });
}

// Run the app
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});