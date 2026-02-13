'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState } from 'react'

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icons
const homeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const currentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

interface TrafficMapProps {
  currentLocation: { lat: number; long: number }
  homeLocation: { lat: number; long: number }
  trafficStatus: 'calm' | 'bookey' | "GG's"
}

export default function TrafficMap({ currentLocation, homeLocation, trafficStatus }: TrafficMapProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  // Calculate center point between current and home
  const center: [number, number] = [
    (currentLocation.lat + homeLocation.lat) / 2,
    (currentLocation.long + homeLocation.long) / 2,
  ]

  // Route line coordinates
  const routeCoords: [number, number][] = [
    [currentLocation.lat, currentLocation.long],
    [homeLocation.lat, homeLocation.long],
  ]

  // Line color based on traffic status
  const lineColor = {
    calm: '#10b981', // green
    bookey: '#eab308', // yellow
    "GG's": '#ef4444', // red
  }[trafficStatus]

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Route line */}
      <Polyline
        positions={routeCoords}
        color={lineColor}
        weight={4}
        opacity={0.7}
      />

      {/* Current location marker */}
      <Marker position={[currentLocation.lat, currentLocation.long]} icon={currentIcon}>
        <Popup>
          <strong>Your Current Location</strong>
          <br />
          {currentLocation.lat.toFixed(4)}, {currentLocation.long.toFixed(4)}
        </Popup>
      </Marker>

      {/* Home location marker */}
      <Marker position={[homeLocation.lat, homeLocation.long]} icon={homeIcon}>
        <Popup>
          <strong>🏠 Home</strong>
          <br />
          {homeLocation.lat.toFixed(4)}, {homeLocation.long.toFixed(4)}
        </Popup>
      </Marker>
    </MapContainer>
  )
}