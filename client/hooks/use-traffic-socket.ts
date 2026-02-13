import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { TrafficCondition } from '@/lib/api'

// Define the structure of the update received from the server
export interface TrafficUpdate {
    userId: string
    condition: TrafficCondition
    notification?: {
        type: string
        currentETA: string
        delay: string
    }
}

export function useTrafficSocket() {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [latestUpdate, setLatestUpdate] = useState<TrafficUpdate | null>(null)

    useEffect(() => {
        // In a real app, URL might come from env vars
        const socketInstance = io('http://localhost:3001', {
            transports: ['websocket'],
            autoConnect: true,
        })

        socketInstance.on('connect', () => {
            console.log('Socket connected')
            setIsConnected(true)
        })

        socketInstance.on('disconnect', () => {
            console.log('Socket disconnected')
            setIsConnected(false)
        })

        socketInstance.on('traffic_update', (data: TrafficUpdate) => {
            console.log('Received traffic update:', data)
            setLatestUpdate(data)
        })

        setSocket(socketInstance)

        return () => {
            socketInstance.disconnect()
        }
    }, [])

    const requestTrafficCheck = useCallback((userId: string) => {
        if (socket && isConnected) {
            socket.emit('check_traffic', { userId })
        }
    }, [socket, isConnected])

    return {
        socket,
        isConnected,
        latestUpdate,
        requestTrafficCheck
    }
}
