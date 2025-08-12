import { useState, useEffect, useCallback } from 'react'
import { Dropdown, Badge, ListGroup, Button } from 'react-bootstrap'
import { Bell, Clock, ArrowClockwise } from 'react-bootstrap-icons'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_BASE_URL as string

type Notification = {
  id: number
  order_id: string
  order_status: string
  message: string
  is_read: boolean
  created_at: string
}

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

interface NotificationDropdownProps {
  onOrderClick: (order: Order) => void
}

export function NotificationDropdown({ onOrderClick }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now())

  // Memoize the load functions to prevent unnecessary re-renders
  const loadNotifications = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      const response = await axios.get(`${API}/api/notifications`, { headers })
      setNotifications(response.data)
      setLastRefresh(Date.now())
    } catch (err: any) {
      console.error('Failed to load notifications:', err)
    }
  }, [])

  const loadUnreadCount = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      const response = await axios.get(`${API}/api/notifications/unread-count`, { headers })
      setUnreadCount(response.data.count)
    } catch (err: any) {
      console.error('Failed to load unread count:', err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
  }, [loadNotifications, loadUnreadCount])

  // Reduced polling frequency - every 2 minutes instead of 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if the dropdown is closed (to avoid interrupting user interaction)
      if (!show) {
        loadNotifications()
        loadUnreadCount()
      }
    }, 120000) // 2 minutes
    
    return () => clearInterval(interval)
  }, [show, loadNotifications, loadUnreadCount])

  const markAsRead = async (notificationId: number) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      await axios.patch(`${API}/api/notifications/${notificationId}/read`, {}, { headers })
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      await axios.patch(`${API}/api/notifications/read-all`, {}, { headers })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err: any) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const handleToggle = async (nextShow: boolean, _event: any, _metadata: any) => {
    setShow(nextShow)
    if (nextShow) {
      // Refresh notifications when opening the dropdown
      await loadNotifications()
      await loadUnreadCount()
      
      // Mark all as read when opening
      if (unreadCount > 0) {
        await markAllAsRead()
      }
    }
  }

  const handleManualRefresh = async () => {
    setLoading(true)
    await Promise.all([loadNotifications(), loadUnreadCount()])
    setLoading(false)
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      const response = await axios.get(`${API}/api/orders/`, { 
        headers, 
        params: { order_id: notification.order_id } 
      })
      
      if (response.data.length > 0) {
        onOrderClick(response.data[0])
      }
    } catch (err: any) {
      console.error('Failed to fetch order details:', err)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    const hour = date.getHours()
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    
    return `${month} ${day}, ${displayHour}${ampm}`
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'preparing': return 'warning'
      case 'shipping': return 'info'
      case 'arrived': return 'success'
      case 'complete': return 'secondary'
      default: return 'light'
    }
  }

  return (
    <Dropdown align="end" onToggle={handleToggle} show={show}>
      <Dropdown.Toggle variant="outline-secondary" className="position-relative">
        <Bell size={20} />
        {unreadCount > 0 && (
          <Badge 
            bg="danger" 
            className="position-absolute top-0 start-100 translate-middle rounded-pill"
            style={{ fontSize: '0.7rem', minWidth: '18px' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu style={{ width: '350px', maxHeight: '400px', overflowY: 'auto' }}>
        <Dropdown.Header className="d-flex justify-content-between align-items-center">
          <span>Notifications</span>
          <div className="d-flex align-items-center gap-2">
            {unreadCount > 0 && (
              <Badge bg="danger" className="ms-2">
                {unreadCount} new
              </Badge>
            )}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleManualRefresh}
              disabled={loading}
              className="p-1"
            >
              <ArrowClockwise size={14} className={loading ? 'spinner-border spinner-border-sm' : ''} />
            </Button>
          </div>
        </Dropdown.Header>
        
        {notifications.length === 0 ? (
          <Dropdown.Item disabled className="text-center text-muted py-3">
            No notifications
          </Dropdown.Item>
        ) : (
          <ListGroup variant="flush">
            {notifications.map((notification) => (
              <ListGroup.Item 
                key={notification.id}
                action
                onClick={() => handleNotificationClick(notification)}
                className={`border-0 ${!notification.is_read ? 'bg-light' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg={getStatusBadgeColor(notification.order_status)} size="sm">
                      {notification.order_status}
                    </Badge>
                    <strong>Order {notification.order_id}</strong>
                  </div>
                  <small className="text-muted d-flex align-items-center gap-1">
                    <Clock size={12} />
                    {formatTime(notification.created_at)}
                  </small>
                </div>
                <p className="mb-1 small">{notification.message}</p>
                {!notification.is_read && (
                  <small className="text-primary">Click to view order details</small>
                )}
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
        
        {notifications.length > 0 && (
          <>
            <Dropdown.Divider />
            <div className="px-3 py-2">
              <small className="text-muted">
                Showing the latest 50 notifications.
              </small>
            </div>
          </>
        )}
        
        <Dropdown.Divider />
        <div className="px-3 py-2">
          <small className="text-muted">
            Last updated: {formatTime(lastRefresh.toString())}
          </small>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  )
}
