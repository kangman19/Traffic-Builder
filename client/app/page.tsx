'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTrafficSocket } from '@/hooks/use-traffic-socket'
import { trafficApi, type Location, type TrafficCondition } from '@/lib/api'
import { Navigation, MapPin, Home, Bell, Settings, RefreshCw } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import map component (Leaflet doesn't work with SSR)
const TrafficMap = dynamic(() => import('@/components/traffic-map'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-muted animate-pulse rounded-lg" />,
})

export default function Dashboard() {
  const [userId] = useState('user123') // In a real app, get from auth
  const [homeLocation, setHomeLocation] = useState<Location>({
    lat: 34.0522,
    long: -118.2437,
  })
  const [currentLocation, setCurrentLocation] = useState<Location>({
    lat: 34.0689,
    long: -118.4452,
  })
  const [trafficCondition, setTrafficCondition] = useState<TrafficCondition | null>(null)
  const [notificationThreshold, setNotificationThreshold] = useState(20)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [notifications, setNotifications] = useState<Array<{ time: string; message: string; type: string }>>([])
  const [isLoading, setIsLoading] = useState(false)

  const { isConnected, latestUpdate, requestTrafficCheck } = useTrafficSocket()

  // Handle WebSocket updates
  useEffect(() => {
    if (latestUpdate && latestUpdate.userId === userId) {
      setTrafficCondition(latestUpdate.condition)
      
      if (latestUpdate.notification) {
        const message = latestUpdate.notification.type === 'start_getting_cozy'
          ? `🟡 Traffic building up! ETA: ${latestUpdate.notification.currentETA} (${latestUpdate.notification.delay} delay)`
          : `🟢 Traffic clearing! ETA: ${latestUpdate.notification.currentETA}`
        
        setNotifications(prev => [
          {
            time: new Date().toLocaleTimeString(),
            message,
            type: latestUpdate.notification!.type,
          },
          ...prev.slice(0, 9), // Keep last 10
        ])
      }
    }
  }, [latestUpdate, userId])

  const startMonitoring = async () => {
    setIsLoading(true)
    try {
      await trafficApi.createSession({
        userId,
        homeLocation,
        currentLocation,
        notificationThreshold,
      })
      setIsSessionActive(true)
      
      // Get initial traffic
      const traffic = await trafficApi.getTraffic(userId)
      setTrafficCondition(traffic)
    } catch (error) {
      console.error('Failed to start monitoring:', error)
      alert('Failed to start monitoring. Make sure the server is running!')
    } finally {
      setIsLoading(false)
    }
  }

  const stopMonitoring = async () => {
    try {
      await trafficApi.stopSession(userId)
      setIsSessionActive(false)
      setTrafficCondition(null)
    } catch (error) {
      console.error('Failed to stop monitoring:', error)
    }
  }

  const refreshTraffic = () => {
    if (isSessionActive) {
      requestTrafficCheck(userId)
    }
  }

  const updateCurrentLocationManually = async (newLat: number, newLong: number) => {
    const newLocation = { lat: newLat, long: newLong }
    setCurrentLocation(newLocation)
    
    if (isSessionActive) {
      try {
        await trafficApi.updateLocation(userId, newLocation)
      } catch (error) {
        console.error('Failed to update location:', error)
      }
    }
  }

  const getStatusBadge = (status: 'calm' | 'bookey' | "GG's") => {
    const variants = {
      calm: 'calm' as const,
      bookey: 'bookey' as const,
      "GG's": 'ggs' as const,
    }
    
    const icons = {
      calm: '🟢',
      bookey: '🟡',
      "GG's": '🔴',
    }

    return (
      <Badge variant={variants[status]} className="text-lg px-4 py-2">
        {icons[status]} {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Navigation className="h-10 w-10 text-blue-600" />
              Traffic Monitor
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Real-time traffic monitoring to your home
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <><span className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Connected</span></>
              ) : (
                <><span className="h-3 w-3 bg-red-500 rounded-full" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Disconnected</span></>
              )}
            </div>
            
            {isSessionActive ? (
              <Button onClick={stopMonitoring} variant="destructive">
                Stop Monitoring
              </Button>
            ) : (
              <Button onClick={startMonitoring} disabled={isLoading}>
                {isLoading ? 'Starting...' : 'Start Monitoring'}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Traffic Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Traffic Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Traffic Status</span>
                  <Button
                    onClick={refreshTraffic}
                    variant="outline"
                    size="sm"
                    disabled={!isSessionActive}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardTitle>
                <CardDescription>
                  Live traffic conditions from your location to home
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trafficCondition ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      {getStatusBadge(trafficCondition.status)}
                      <div className="text-right">
                        <p className="text-3xl font-bold">
                          {Math.floor(trafficCondition.durationInTraffic / 60)} min
                        </p>
                        <p className="text-sm text-muted-foreground">ETA</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Normal Time</p>
                        <p className="text-lg font-semibold">
                          {Math.floor(trafficCondition.duration / 60)} min
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Delay</p>
                        <p className="text-lg font-semibold text-red-600">
                          +{Math.floor((trafficCondition.durationInTraffic - trafficCondition.duration) / 60)} min
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Distance</p>
                        <p className="text-lg font-semibold">
                          {(trafficCondition.distance / 1609).toFixed(1)} mi
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Last updated: {new Date(trafficCondition.timestamp).toLocaleTimeString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Estimated arrival: {new Date(trafficCondition.eta).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {isSessionActive ? 'Loading traffic data...' : 'Start monitoring to see traffic status'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Map Card */}
            <Card>
              <CardHeader>
                <CardTitle>Route Map</CardTitle>
                <CardDescription>Your current location to home</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <TrafficMap
                    currentLocation={currentLocation}
                    homeLocation={homeLocation}
                    trafficStatus={trafficCondition?.status || 'calm'}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Notifications & Settings */}
          <div className="space-y-6">
            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>Recent traffic alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">{notif.time}</p>
                        <p className="text-sm mt-1">{notif.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No notifications yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Home className="h-4 w-4" />
                    Home Location
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.0001"
                      value={homeLocation.lat}
                      onChange={(e) => setHomeLocation({ ...homeLocation, lat: parseFloat(e.target.value) })}
                      className="px-3 py-2 border rounded-md text-sm"
                      placeholder="Latitude"
                      disabled={isSessionActive}
                    />
                    <input
                      type="number"
                      step="0.0001"
                      value={homeLocation.long}
                      onChange={(e) => setHomeLocation({ ...homeLocation, long: parseFloat(e.target.value) })}
                      className="px-3 py-2 border rounded-md text-sm"
                      placeholder="Longitude"
                      disabled={isSessionActive}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" />
                    Current Location
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.0001"
                      value={currentLocation.lat}
                      onChange={(e) => updateCurrentLocationManually(parseFloat(e.target.value), currentLocation.long)}
                      className="px-3 py-2 border rounded-md text-sm"
                      placeholder="Latitude"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      value={currentLocation.long}
                      onChange={(e) => updateCurrentLocationManually(currentLocation.lat, parseFloat(e.target.value))}
                      className="px-3 py-2 border rounded-md text-sm"
                      placeholder="Longitude"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Notification Threshold: {notificationThreshold}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={notificationThreshold}
                    onChange={(e) => setNotificationThreshold(parseInt(e.target.value))}
                    className="w-full"
                    disabled={isSessionActive}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Notify when traffic increases by this percentage
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}