'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
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
  onCurrentLocationChange?: (lat: number, long: number) => void
  onHomeLocationChange?: (lat: number, long: number) => void
  isSessionActive?: boolean
}

function MapUpdater({ currentLocation, homeLocation }: { currentLocation: {lat: number, long: number}, homeLocation: {lat: number, long: number} }) {
  const map = useMap()
  useEffect(() => {
    const bounds = L.latLngBounds([
      [currentLocation.lat, currentLocation.long],
      [homeLocation.lat, homeLocation.long]
    ])
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true })
  }, [currentLocation.lat, currentLocation.long, homeLocation.lat, homeLocation.long, map])
  return null
}

function MapEvents({ setClickedPos }: { setClickedPos: (pos: L.LatLng | null) => void }) {
  useMapEvents({
    click(e) {
      setClickedPos(e.latlng)
    }
  })
  return null
}

export default function TrafficMap({ 
  currentLocation, 
  homeLocation, 
  trafficStatus,
  onCurrentLocationChange,
  onHomeLocationChange,
  isSessionActive
}: TrafficMapProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [clickedPos, setClickedPos] = useState<L.LatLng | null>(null)

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
      <MapUpdater currentLocation={currentLocation} homeLocation={homeLocation} />
      <MapEvents setClickedPos={setClickedPos} />

      {clickedPos && (
        <Popup position={clickedPos} eventHandlers={{ remove: () => setClickedPos(null) }}>
          <div className="flex flex-col gap-2 p-1">
            <strong className="text-sm border-b pb-1">Set Location Here</strong>
            <button 
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
              onClick={() => {
                onCurrentLocationChange?.(clickedPos.lat, clickedPos.lng)
                setClickedPos(null)
              }}
            >
              📍 Set Current Location
            </button>
            <button 
              className="px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSessionActive}
              onClick={() => {
                onHomeLocationChange?.(clickedPos.lat, clickedPos.lng)
                setClickedPos(null)
              }}
            >
              🏠 Set Home Location
            </button>
          </div>
        </Popup>
      )}

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
      <Marker 
        position={[currentLocation.lat, currentLocation.long]} 
        icon={currentIcon}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const position = e.target.getLatLng()
            onCurrentLocationChange?.(position.lat, position.lng)
          }
        }}
      >
        <Popup>
          <strong>Your Current Location</strong>
          <br />
          {currentLocation.lat.toFixed(4)}, {currentLocation.long.toFixed(4)}
          <br />
          <span className="text-xs text-black/60 italic">Drag to move pin</span>
        </Popup>
      </Marker>

      {/* Home location marker */}
      <Marker 
        position={[homeLocation.lat, homeLocation.long]} 
        icon={homeIcon}
        draggable={!isSessionActive}
        eventHandlers={{
          dragend: (e) => {
            const position = e.target.getLatLng()
            onHomeLocationChange?.(position.lat, position.lng)
          }
        }}
      >
        <Popup>
          <strong>🏠 Home</strong>
          <br />
          {homeLocation.lat.toFixed(4)}, {homeLocation.long.toFixed(4)}
          {!isSessionActive && (
            <>
              <br />
              <span className="text-xs text-black/60 italic">Drag to move pin</span>
            </>
          )}
        </Popup>
      </Marker>
    </MapContainer>
  )
}