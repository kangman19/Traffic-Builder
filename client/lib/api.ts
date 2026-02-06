import axios from 'axios'

const API_URL = 'http://localhost:3001/api'

export interface Location {
  lat: number
  long: number
}

export interface TrafficCondition {
  duration: number
  durationInTraffic: number
  distance: number
  status: 'calm' | 'bookey' | "GG's"
  timestamp: Date
  eta: Date
}

export interface MonitoringSession {
  userId: string
  homeLocation: Location
  currentLocation: Location
  isActive: boolean
  lastCheck?: TrafficCondition
  notificationThreshold: number
}

export const trafficApi = {
  // Create a new monitoring session
  createSession: async (data: {
    userId: string
    homeLocation: Location
    currentLocation: Location
    notificationThreshold?: number
  }) => {
    const response = await axios.post(`${API_URL}/session`, data)
    return response.data
  },

  // Get session status
  getSession: async (userId: string) => {
    const response = await axios.get(`${API_URL}/session/${userId}`)
    return response.data.session as MonitoringSession
  },

  // Update user location
  updateLocation: async (userId: string, location: Location) => {
    const response = await axios.put(`${API_URL}/session/${userId}/location`, {
      location,
    })
    return response.data
  },

  // Get current traffic status
  getTraffic: async (userId: string) => {
    const response = await axios.get(`${API_URL}/traffic/${userId}`)
    return response.data.traffic as TrafficCondition
  },

  // Stop monitoring
  stopSession: async (userId: string) => {
    const response = await axios.delete(`${API_URL}/session/${userId}`)
    return response.data
  },

  // Update session settings
  updateSettings: async (
    userId: string,
    settings: {
      homeLocation?: Location
      notificationThreshold?: number
    }
  ) => {
    const response = await axios.put(`${API_URL}/session/${userId}/settings`, settings)
    return response.data
  },

  // Health check
  health: async () => {
    const response = await axios.get(`${API_URL}/health`)
    return response.data
  },
}