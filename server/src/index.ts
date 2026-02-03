import { config } from 'server\config.ts';
import { TrafficMonitor } from './services/trafficMonitor';
import { MonitoringSession, Location } from './types';

class TrafficApp {
  private trafficMonitor: TrafficMonitor;

//Creating monitoring session for user

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
    console.log(` Created monitoring session for user: ${userId}`);
    console.log(`   Home: (${homeLocation.lat}, ${homeLocation.long})`);
    console.log(`   Current: (${currentLocation.lat}, ${currentLocation.long})`);
    console.log(`   Threshold: ${session.notificationThreshold}%\n`);
  }

  
// Update a user's current location
   
  updateUserLocation(userId: string, location: Location): void {
    this.trafficMonitor.updateCurrentLocation(userId, location);
    console.log(`📍 Updated location for user ${userId}: (${location.lat}, ${location.long})`);
  }

  
   //Stop monitoring for a user
   
  stopMonitoring(userId: string): void {
    this.trafficMonitor.stopSession(userId);
    console.log(`🛑 Stopped monitoring for user: ${userId}`);
  }

  
}
 /*
   Sample data to show app functionality
   In a real app, you'd get this data from a database or API */

async function main() {
  const app = new TrafficApp();

  // Example: Create a monitoring session
  //TODO Replace these with real coordinates
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


}


main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});