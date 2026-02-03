import axios from 'axios';
import { Location, TrafficCondition, GoogleMapsDirectionsResponse } from '../types';

export class GoogleMapsService {
    private apiKey: string;
    private baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getTrafficCondition(
        origin: Location,
        destination: Location
    ): Promise<TrafficCondition> {
        try {
            const params = {
                origin: `${origin.lat},${origin.long}`,
                destination: `${destination.lat},${destination.long}`,
                departure_time: 'now', // Critical: enables traffic data
                key: this.apiKey,
            };

            const response = await axios.get<GoogleMapsDirectionsResponse>(
                this.baseUrl,
                { params }
            );

            // Fixed: Check status properly
            if (response.data.status !== 'OK' || !response.data.routes?.length) {
                throw new Error(`Google Maps API error: ${response.data.status || 'Unknown error'}`);
            }

            const leg = response.data.routes[0].legs[0];
            const duration = leg.duration.value;
            const durationInTraffic = leg.duration_in_traffic.value;
            const distance = leg.distance.value;

            // Calculate traffic status based on delay percentage
            const status = this.calculateTrafficStatus(duration, durationInTraffic);

            // Calculate ETA
            const eta = new Date(Date.now() + durationInTraffic * 1000);

            return {
                duration,
                durationInTraffic,
                distance,
                status,
                timestamp: new Date(),
                eta,
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to fetch traffic data: ${error.message}`);
            }
            throw error;
        }
    }

    private calculateTrafficStatus(
        normalDuration: number,
        currentDuration: number
    ): 'calm' | 'bookey' | 'GG\'s' {
        const delay = currentDuration - normalDuration;
        const delayPercentage = (delay / normalDuration) * 100;

        if (delayPercentage < 10) return 'calm';
        if (delayPercentage < 30) return 'bookey';
        return 'GG\'s';
    }

    formatDuration(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (hours > 0) {
            return `${hours}h ${remainingMinutes}min`;
        }
        return `${minutes}min`;
    }
}