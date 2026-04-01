interface Location {
  lat: number;
  long: number;
}

export interface TrafficCondition {
  duration: number;
  durationInTraffic: number;
  distance: number;
  status: 'calm' | 'bookey' | "GG's";
  timestamp: Date;
  eta: Date;
}

export interface MonitoringSession {
  userId: string;
  homeLocation: Location;
  currentLocation: Location;
  isActive: boolean;
  lastCheck?: TrafficCondition;
  notificationThreshold: number;
}

class MockTrafficService {
  private sessions: Map<string, MonitoringSession> = new Map();
  private interval: NodeJS.Timeout | null = null;
  private io: any;

  // Normal time is ~30 mins (1800 seconds), distance ~5 miles (8000 meters)
  private readonly BASE_DURATION = 1800;
  private readonly BASE_DISTANCE = 8000;

  public initialize(io: any) {
    this.io = io;
    // Tick every 10 seconds for testing
    this.interval = setInterval(() => this.tick(), 10000);
  }

  public createSession(data: { userId: string; homeLocation: Location; currentLocation: Location; notificationThreshold?: number }) {
    const session: MonitoringSession = {
      userId: data.userId,
      homeLocation: data.homeLocation,
      currentLocation: data.currentLocation,
      isActive: true,
      notificationThreshold: data.notificationThreshold || 20,
      lastCheck: this.generateRandomTraffic()
    };
    this.sessions.set(data.userId, session);
    return session;
  }

  public getSession(userId: string) {
    return this.sessions.get(userId);
  }

  public updateLocation(userId: string, location: Location) {
    const session = this.sessions.get(userId);
    if (session) {
      session.currentLocation = location;
      this.sessions.set(userId, session);
    }
    return session;
  }

  public getTraffic(userId: string) {
    const session = this.sessions.get(userId);
    return session?.lastCheck;
  }

  public stopSession(userId: string) {
    this.sessions.delete(userId);
  }

  public updateSettings(userId: string, settings: any) {
    const session = this.sessions.get(userId);
    if (session) {
      if (settings.homeLocation) session.homeLocation = settings.homeLocation;
      if (settings.notificationThreshold) session.notificationThreshold = settings.notificationThreshold;
      this.sessions.set(userId, session);
    }
    return session;
  }

  private generateRandomTraffic(): TrafficCondition {
    // Random factor to simulate traffic building up or clearing out
    // Multiplier between 1.0 (calm) and 2.5 (GG's)
    const trafficMultiplier = 1.0 + Math.random() * 1.5; 
    const durationInTraffic = Math.floor(this.BASE_DURATION * trafficMultiplier);
    
    let status: 'calm' | 'bookey' | "GG's" = 'calm';
    if (trafficMultiplier >= 1.8) {
      status = "GG's";
    } else if (trafficMultiplier >= 1.3) {
      status = 'bookey';
    }

    const eta = new Date();
    eta.setSeconds(eta.getSeconds() + durationInTraffic);

    return {
      duration: this.BASE_DURATION,
      durationInTraffic,
      distance: this.BASE_DISTANCE,
      status,
      timestamp: new Date(),
      eta
    };
  }

  private tick() {
    if (!this.io) return;

    for (const [userId, session] of this.sessions.entries()) {
      if (!session.isActive) continue;

      const previousStatus = session.lastCheck?.status || 'calm';
      const newTraffic = this.generateRandomTraffic();
      session.lastCheck = newTraffic;

      let notification = undefined;

      // Determine if a notification boundary was crossed
      if (previousStatus !== newTraffic.status) {
        if (newTraffic.status === "GG's" || newTraffic.status === 'bookey') {
          notification = {
            type: 'start_getting_cozy',
            currentETA: `${Math.floor(newTraffic.durationInTraffic / 60)} mins`,
            delay: `+${Math.floor((newTraffic.durationInTraffic - newTraffic.duration) / 60)} mins`
          };
        } else if (newTraffic.status === 'calm') {
          notification = {
            type: 'traffic_clearing',
            currentETA: `${Math.floor(newTraffic.durationInTraffic / 60)} mins`,
            delay: '0 mins'
          };
        }
      }

      console.log(`Sending traffic update to ${userId} - Status: ${newTraffic.status}`);
      
      this.io.emit('traffic_update', {
        userId: session.userId,
        condition: newTraffic,
        notification
      });
    }
  }

  public forceCheck(userId: string) {
    const session = this.sessions.get(userId);
    if (!session || !this.io) return;
    
    const condition = session.lastCheck || this.generateRandomTraffic();
    this.io.emit('traffic_update', {
      userId,
      condition,
      // Force checking usually doesn't trigger a push notification, just UI update
    });
  }
}

export const mockTrafficService = new MockTrafficService();
