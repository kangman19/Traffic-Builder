'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTrafficSocket } from '@/hooks/use-traffic-socket'
import { trafficApi, type Location, type TrafficCondition } from '@/lib/api'
import { Navigation, MapPin, Home, Bell, Settings, RefreshCw, LocateFixed } from 'lucide-react'
import dynamic from 'next/dynamic'
import AddressSearch from '@/components/AddressSearch'

// Dynamically import map component (Leaflet doesn't work with SSR)
const TrafficMap = dynamic(() => import('@/components/TrafficMap'), {
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
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'detecting' | 'found' | 'denied'>('idle')
  const [homeAddress, setHomeAddress] = useState<string>('')
  const [notificationFrequency, setNotificationFrequency] = useState<5 | 7 | 10 | 15 | 20>(7)

  const { isConnected, latestUpdate, requestTrafficCheck } = useTrafficSocket()

  // Silently detect real location on mount; LA coords remain active as fallback
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setGpsStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({ lat: pos.coords.latitude, long: pos.coords.longitude })
        setGpsStatus('found')
      },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  useEffect(() => { detectLocation() }, [detectLocation])

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
        notificationFrequencyMinutes: notificationFrequency,
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

  const handleFrequencyChange = async (mins: 5 | 7 | 10 | 15 | 20) => {
    setNotificationFrequency(mins)
    if (isSessionActive) {
      try {
        await trafficApi.updateSettings(userId, { notificationFrequencyMinutes: mins })
      } catch (error) {
        console.error('Failed to update notification frequency:', error)
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
              Traffic Builder
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
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <label
                        htmlFor="notif-freq"
                        className="text-xs font-normal text-white/80 whitespace-nowrap"
                      >
                        Notify every
                      </label>
                      <select
                        id="notif-freq"
                        value={notificationFrequency}
                        onChange={(e) => handleFrequencyChange(parseInt(e.target.value) as 5 | 7 | 10 | 15 | 20)}
                        className="text-xs py-1 px-2 rounded border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/40 cursor-pointer"
                      >
                        {([5, 7, 10, 15, 20] as const).map((m) => (
                          <option key={m} value={m} className="text-gray-900 bg-white">
                            {m} min
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      onClick={refreshTraffic}
                      variant="ghost"
                      size="sm"
                      disabled={!isSessionActive}
                      className="text-white hover:bg-white/20 hover:text-white"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
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
                          {(trafficCondition.distance / 1000).toFixed(1)} km
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
                    onCurrentLocationChange={(lat, long) => updateCurrentLocationManually(lat, long)}
                    onHomeLocationChange={(lat, long) => {
                      if (!isSessionActive) {
                        setHomeLocation({ lat, long })
                        setHomeAddress('') // clear address label when pin is dragged manually
                      }
                    }}
                    isSessionActive={isSessionActive}
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
                      <div key={idx} className="p-3 bg-gray-100 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{notif.time}</p>
                        <p className="text-sm mt-1 font-medium text-gray-900 dark:text-gray-100">{notif.message}</p>
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
                  <AddressSearch
                    placeholder="Search for your home address…"
                    initialValue={homeAddress}
                    disabled={isSessionActive}
                    onSelect={(lat, long, displayName) => {
                      setHomeLocation({ lat, long })
                      setHomeAddress(displayName)
                    }}
                  />
                  {/* Coordinates shown after selection or pin drag */}
                  {homeAddress === '' && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Or drag the red pin (📍) on the map
                    </p>
                  )}
                  {homeAddress !== '' && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {homeLocation.lat.toFixed(4)}, {homeLocation.long.toFixed(4)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" />
                    Current Location
                    {gpsStatus === 'detecting' && <span className="text-xs text-blue-500 font-normal animate-pulse">detecting…</span>}
                    {gpsStatus === 'found' && <span className="text-xs text-green-500 font-normal">● GPS</span>}
                    {gpsStatus === 'denied' && <span className="text-xs text-amber-500 font-normal">(permission denied)</span>}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.0001"
                      value={currentLocation.lat}
                      onChange={(e) => updateCurrentLocationManually(parseFloat(e.target.value), currentLocation.long)}
                      className="px-3 py-2 border rounded-md text-sm font-semibold text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                      placeholder="Latitude"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      value={currentLocation.long}
                      onChange={(e) => updateCurrentLocationManually(currentLocation.lat, parseFloat(e.target.value))}
                      className="px-3 py-2 border rounded-md text-sm font-semibold text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                      placeholder="Longitude"
                    />
                  </div>
                  <button
                    onClick={detectLocation}
                    disabled={gpsStatus === 'detecting'}
                    className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40"
                  >
                    <LocateFixed className="h-3 w-3" />
                    {gpsStatus === 'detecting' ? 'Detecting…' : 'Re-detect my location'}
                  </button>
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