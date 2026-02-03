export interface Location {
    lat: number;
    long: number;
}

export interface TrafficCondition {
    duration: number;
    durationInTraffic: number;
    distance: number;
    status: 'calm' | 'bookey' | 'GG\'s';
    timestamp: Date;
    eta: Date;
}

export interface MonitoringSession {
    userId: string;
    homeLocation: Location;
    //    workLocation: Location;      could be implemented another time if scaled
    currentLocation: Location;
    isActive: boolean;
    lastCheck?: TrafficCondition;
    notificationThreshold: number; // Percentage increase to trigger notification (default 20)
}

export interface GoogleMapsDirectionsResponse {
    routes: Array<{
        legs: Array<{
            duration: {
                value: number;
                text: string;
            };
            duration_in_traffic: {
                value: number;
                text: string;
            };
            distance: {
                value: number;
                text: string;
            }
        }>;
    }>;
    status: string;
}

export interface NotificationPayload {
    type: 'get_cozy_twin' | 'start_your_engines';
    currentETA: string;
    normalETA: string;
    delay: string;
    status: 'calm' | 'bookey' | 'GG\'s';
}