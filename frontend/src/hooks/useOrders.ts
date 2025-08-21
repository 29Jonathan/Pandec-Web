import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_BASE_URL as string

type Order = {
  id: number
  order_id: string
  shipper: string
  shipper_freight_number: string
  customer: string
  shipment_type: string
  carrier_company: string
  carrier_tracking_number: string
  carrier_bl_number: string
  vessel_flight_name: string
  loading_date: string
  loading_location: string
  departure_date: string
  port_airport_departure: string
  arrival_date: string
  port_airport_arrival: string
  packaging_type: string
  total_packages: number
  freight_terms: string
  includes_container: boolean
  number_of_containers: number
  container_1_number: string
  container_2_number: string
  container_3_number: string
  container_4_number: string
  container_5_number: string
  logistics_status: string
  other_remarks: string
  created_by: string
  created_at: string
}

// Global cache to prevent duplicate API calls
let ordersCache: Order[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 30000 // 30 seconds

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadOrders = useCallback(async (forceRefresh = false) => {
    // Check cache first
    const now = Date.now()
    if (!forceRefresh && ordersCache && (now - lastFetchTime) < CACHE_DURATION) {
      setOrders(ordersCache)
      setLoading(false)
      return
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      setLoading(true)
      setError('')

      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        setError('Please login to view orders')
        setLoading(false)
        return
      }

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      const response = await axios.get(`${API}/api/orders/`, { 
        headers,
        signal: abortControllerRef.current.signal
      })
      
      const newOrders = response.data
      setOrders(newOrders)
      
      // Update cache
      ordersCache = newOrders
      lastFetchTime = now
    } catch (err: any) {
      if (err.name !== 'CanceledError') {
        setError(err.message || 'Failed to load orders')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateOrderStatus = useCallback(async (orderId: number, newStatus: string) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        throw new Error('Please login to update order status')
      }

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      await axios.patch(`${API}/api/orders/${orderId}/status/`, { logistics_status: newStatus }, { headers })
      
      // Force refresh orders to get updated data
      await loadOrders(true)
    } catch (err: any) {
      throw err
    }
  }, [loadOrders])

  // Initial load
  useEffect(() => {
    loadOrders()
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadOrders])

  return {
    orders,
    loading,
    error,
    loadOrders,
    updateOrderStatus,
    clearError: () => setError('')
  }
}
