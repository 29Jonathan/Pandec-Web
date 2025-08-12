import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Form, Button, Table, Modal, Alert, Badge } from 'react-bootstrap'
import { useLocation, useNavigate } from 'react-router-dom'
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

export function Tracking() {
  const [orders, setOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showNotFound, setShowNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    loadOrders()
    
    // Check if we should show an order modal (e.g., from notification click)
    if (location.state?.orderId && location.state?.showModal) {
      const order = orders.find(o => o.order_id === location.state.orderId)
      if (order) {
        setSelectedOrder(order)
        setShowModal(true)
        // Clear the state to prevent showing modal on refresh
        navigate(location.pathname, { replace: true })
      }
    }
  }, [orders, location.state, navigate, location.pathname])

  const loadOrders = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        setError('Please login to view orders')
        setLoading(false)
        return
      }

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      const response = await axios.get(`${API}/api/orders/`, { headers })
      setOrders(response.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        setError('Please login to search orders')
        return
      }

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      const response = await axios.get(`${API}/api/orders/`, { 
        headers, 
        params: { order_id: searchQuery.trim() } 
      })
      
      if (response.data.length > 0) {
        setSelectedOrder(response.data[0])
        setShowModal(true)
      } else {
        setShowNotFound(true)
      }
    } catch (err: any) {
      setError(err.message || 'Search failed')
    }
  }

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingStatus(orderId)
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        setError('Please login to update order status')
        return
      }

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      await axios.patch(`${API}/api/orders/${orderId}/status/`, { status: newStatus }, { headers })
      
      // Reload orders to get updated data
      await loadOrders()
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to update status')
    } finally {
      setUpdatingStatus(null)
    }
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-3">Order Tracking</h2>
          <p className="text-muted">View and search for orders in the system</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Search Orders</Card.Title>
              <Form onSubmit={handleSearch}>
                <Row className="g-2">
                  <Col>
                    <Form.Control
                      type="text"
                      placeholder="Enter Order ID"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </Col>
                  <Col xs="auto">
                    <Button type="submit" variant="primary">
                      Search
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">All Orders</h5>
            <Badge bg="secondary">{orders.length} orders</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Order ID</th>
                  <th>Factory ID</th>
                  <th>Customer ID</th>
                  <th>Ship Name</th>
                  <th>Departure Date</th>
                  <th>Arrival Date</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Amount</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} onClick={() => {
                    setSelectedOrder(order)
                    setShowModal(true)
                  }} style={{ cursor: 'pointer' }}>
                    <td>{order.order_id}</td>
                    <td>{order.factory_id}</td>
                    <td>{order.customer_id}</td>
                    <td>{order.ship_name}</td>
                    <td>{new Date(order.departure_date).toLocaleDateString()}</td>
                    <td>{new Date(order.arrival_date).toLocaleDateString()}</td>
                    <td>{order.type}</td>
                    <td>${order.price}</td>
                    <td>{order.amount}</td>
                    <td>{order.weight} kg</td>
                    <td>
                      <Badge 
                        bg={
                          order.status === 'preparing' ? 'warning' :
                          order.status === 'shipping' ? 'info' :
                          order.status === 'arrived' ? 'success' :
                          'secondary'
                        }
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td>{order.created_by}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={13} className="text-center text-muted py-4">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Order Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Order Details - {selectedOrder?.order_id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <div>
              <Row>
                <Col md={6}>
                  <p><strong>Order ID:</strong> {selectedOrder.order_id}</p>
                  <p><strong>Factory ID:</strong> {selectedOrder.factory_id}</p>
                  <p><strong>Customer ID:</strong> {selectedOrder.customer_id}</p>
                  <p><strong>Ship Name:</strong> {selectedOrder.ship_name}</p>
                  <p><strong>Departure Date:</strong> {new Date(selectedOrder.departure_date).toLocaleDateString()}</p>
                  <p><strong>Arrival Date:</strong> {new Date(selectedOrder.arrival_date).toLocaleDateString()}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Type:</strong> {selectedOrder.type}</p>
                  <p><strong>Price:</strong> ${selectedOrder.price}</p>
                  <p><strong>Amount:</strong> {selectedOrder.amount}</p>
                  <p><strong>Weight:</strong> {selectedOrder.weight} kg</p>
                  <p><strong>Created By:</strong> {selectedOrder.created_by}</p>
                  <p><strong>Created At:</strong> {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label><strong>Status:</strong></Form.Label>
                    <Form.Select 
                      value={selectedOrder.status} 
                      onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                      disabled={updatingStatus === selectedOrder.id}
                    >
                      <option value="preparing">Preparing</option>
                      <option value="shipping">Shipping</option>
                      <option value="arrived">Arrived</option>
                      <option value="complete">Complete</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Not Found Modal */}
      <Modal show={showNotFound} onHide={() => setShowNotFound(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Order Not Found</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <div className="mb-3">
              <i className="bi bi-search text-muted" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5>Order ID: {searchQuery}</h5>
            <p className="text-muted">No order was found with this ID. Please check the ID and try again.</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowNotFound(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
