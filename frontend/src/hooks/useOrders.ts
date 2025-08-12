import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_BASE_URL as string

type Order = {
  id: number
  order_id: string
  factory_id: string
  customer_id: string
  ship_name: string
  departure_date: string
  arrival_date: string
  type: string
  price: string
  amount: number
  weight: string
  status: string
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
      await axios.patch(`${API}/api/orders/${orderId}/status/`, { status: newStatus }, { headers })
      
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
