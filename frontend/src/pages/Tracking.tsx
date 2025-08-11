import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Form, Button, Table, Modal, Alert, Badge } from 'react-bootstrap'
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
  created_by: string
}

export function Tracking() {
  const [orders, setOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showNotFound, setShowNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadOrders()
  }, [])

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

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container fluid>
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
                  <th>Type</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => {
                    setSelectedOrder(order)
                    setShowModal(true)
                  }}>
                    <td className="fw-medium">{order.order_id}</td>
                    <td>{order.factory_id}</td>
                    <td>{order.customer_id}</td>
                    <td>{order.ship_name}</td>
                    <td>
                      <Badge bg="info" text="dark">{order.type}</Badge>
                    </td>
                    <td>${order.price}</td>
                    <td>
                      <Badge bg="success">Active</Badge>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
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
            <Row className="g-3">
              <Col md={6}>
                <div className="mb-3">
                  <strong>Order ID:</strong>
                  <div className="text-muted">{selectedOrder.order_id}</div>
                </div>
                <div className="mb-3">
                  <strong>Factory ID:</strong>
                  <div className="text-muted">{selectedOrder.factory_id}</div>
                </div>
                <div className="mb-3">
                  <strong>Customer ID:</strong>
                  <div className="text-muted">{selectedOrder.customer_id}</div>
                </div>
                <div className="mb-3">
                  <strong>Ship Name:</strong>
                  <div className="text-muted">{selectedOrder.ship_name}</div>
                </div>
              </Col>
              <Col md={6}>
                <div className="mb-3">
                  <strong>Departure Date:</strong>
                  <div className="text-muted">{selectedOrder.departure_date}</div>
                </div>
                <div className="mb-3">
                  <strong>Arrival Date:</strong>
                  <div className="text-muted">{selectedOrder.arrival_date}</div>
                </div>
                <div className="mb-3">
                  <strong>Type:</strong>
                  <div><Badge bg="info" text="dark">{selectedOrder.type}</Badge></div>
                </div>
                <div className="mb-3">
                  <strong>Price:</strong>
                  <div className="text-muted">${selectedOrder.price}</div>
                </div>
                <div className="mb-3">
                  <strong>Amount:</strong>
                  <div className="text-muted">{selectedOrder.amount}</div>
                </div>
                <div className="mb-3">
                  <strong>Weight:</strong>
                  <div className="text-muted">{selectedOrder.weight}</div>
                </div>
              </Col>
            </Row>
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
    </Container>
  )
}
