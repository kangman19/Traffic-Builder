import { MonitoringSession, TrafficCondition, NotificationPayload } from '../types';
import { GoogleMapsService } from './googleMaps';

export class TrafficMonitor {
  private sessions: Map<string, MonitoringSession> = new Map();
  private googleMapsService: GoogleMapsService;

  constructor(googleApiKey: string) {
    this.googleMapsService = new GoogleMapsService(googleApiKey);
  }

  createSession(session: MonitoringSession): void {
    this.sessions.set(session.userId, session);
  }

  getSession(userId: string): MonitoringSession | undefined {
    return this.sessions.get(userId);
  }

  stopSession(userId: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.isActive = false;
    }
  }

  async checkTraffic(userId: string): Promise<{
    condition: TrafficCondition;
    shouldNotify: boolean;
    notification?: NotificationPayload;
  } | null> {
    const session = this.sessions.get(userId);

    if (!session || !session.isActive) {
      return null;
    }

    // Get current traffic condition
    const currentCondition = await this.googleMapsService.getTrafficCondition(
      session.currentLocation,
      session.homeLocation
    );

    // Determine if we should send a notification
    const { shouldNotify, notification } = this.evaluateNotification(
      session,
      currentCondition
    );

    // Update session with latest check
    session.lastCheck = currentCondition;
    this.sessions.set(userId, session);

    return {
      condition: currentCondition,
      shouldNotify,
      notification,
    };
  }

  private evaluateNotification(
    session: MonitoringSession,
    currentCondition: TrafficCondition
  ): { shouldNotify: boolean; notification?: NotificationPayload } {
    const { lastCheck, notificationThreshold } = session;

    // First check - no comparison possible
    if (!lastCheck) {
      return { shouldNotify: false };
    }

    const previousDuration = lastCheck.durationInTraffic;
    const currentDuration = currentCondition.durationInTraffic;
    const threshold = previousDuration * (1 + notificationThreshold / 100);

    // Traffic building up
    if (currentDuration >= threshold && lastCheck.status !== 'bookey') {
      const delay = currentDuration - currentCondition.duration;
      return {
        shouldNotify: true,
        notification: {
          type: 'get_cozy_twin',
          currentETA: this.googleMapsService.formatDuration(currentDuration),
          normalETA: this.googleMapsService.formatDuration(
            currentCondition.duration
          ),
          delay: this.googleMapsService.formatDuration(delay),
          status: currentCondition.status,
        },
      };
    }

    // Traffic clearing up
    if (
      currentDuration < previousDuration * 0.8 &&
      lastCheck.status !== 'calm' &&
      currentCondition.status === 'calm'
    ) {
      return {
        shouldNotify: true,
        notification: {
          type: 'start_your_engines',
          currentETA: this.googleMapsService.formatDuration(currentDuration),
          normalETA: this.googleMapsService.formatDuration(
            currentCondition.duration
          ),
          delay: '0min',
          status: currentCondition.status,
        },
      };
    }

    return { shouldNotify: false };
  }

  updateCurrentLocation(userId: string, location: { lat: number; long: number }): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.currentLocation = location;
      this.sessions.set(userId, session);
    }
  }
}