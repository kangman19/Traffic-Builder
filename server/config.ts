import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface Config {
  googleMapsApiKey: string;
  checkIntervalMinutes: number;
  defaultNotificationThreshold: number;
  port: number;
}

function getConfig(): Config {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is required in .env file');
  }

  return {
    googleMapsApiKey,
    checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '5', 10),
    defaultNotificationThreshold: parseInt(process.env.NOTIFICATION_THRESHOLD || '20', 10),
    port: parseInt(process.env.PORT || '3000', 10),
  };
}

export const config = getConfig();