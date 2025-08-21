import { useState, useEffect, useCallback } from 'react'
import { Container, Row, Col, Card, Form, Button, Table, Modal, Alert, Badge } from 'react-bootstrap'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { supabase } from '../lib/supabase'
import { useOrders } from '../hooks/useOrders'

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

export function Tracking() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showNotFound, setShowNotFound] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  
  // Use centralized orders hook
  const { orders, loading, error, updateOrderStatus, clearError } = useOrders()

  // Debounced search function
  const debouncedSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return

      setSearchLoading(true)
      try {
        const { data: session } = await supabase.auth.getSession()
        if (!session.session) {
          // Use the hook's error handling
          return
        }

        const headers = { Authorization: `Bearer ${session.session.access_token}` }
        const response = await axios.get(`${API}/api/orders/`, { 
          headers, 
          params: { order_id: query.trim() } 
        })
        
        if (response.data.length > 0) {
          setSelectedOrder(response.data[0])
          setShowModal(true)
        } else {
          setShowNotFound(true)
        }
      } catch (err: any) {
        // Search errors are handled locally, not through the hook
        console.error('Search failed:', err)
      } finally {
        setSearchLoading(false)
      }
    },
    []
  )

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        debouncedSearch(searchQuery)
      }
    }, 500) // 500ms delay

    return () => clearTimeout(timeoutId)
  }, [searchQuery, debouncedSearch])

  useEffect(() => {
    // Check if we should show an order modal (e.g., from notification click)
    if (location.state?.orderId && location.state?.showModal) {
      // We'll handle this after orders are loaded
      setShowModal(true)
      // Clear the state to prevent showing modal on refresh
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, navigate, location.pathname])

  // Handle showing modal after orders are loaded
  useEffect(() => {
    if (location.state?.orderId && showModal && orders.length > 0) {
      const order = orders.find(o => o.order_id === location.state.orderId)
      if (order) {
        setSelectedOrder(order)
      }
    }
  }, [orders, location.state?.orderId, showModal])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search is now handled by the debounced effect
  }

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingStatus(orderId)
    try {
      await updateOrderStatus(orderId, newStatus)
    } catch (err: any) {
      // Error is handled by the hook
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

  const getShipmentTypeDisplay = (type: string) => {
    switch (type) {
      case 'air_freight': return 'Air Freight'
      case 'sea_freight': return 'Sea Freight'
      case 'rail_freight': return 'Rail Freight'
      case 'post': return 'Post'
      default: return type
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
          <p className="text-muted">View and search for logistics orders in the system</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={clearError}>
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
                      placeholder="Enter Order ID to search automatically..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchLoading && (
                      <small className="text-muted mt-1 d-block">
                        Searching...
                      </small>
                    )}
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
                  <th>Shipper</th>
                  <th>Customer</th>
                  <th>Shipment Type</th>
                  <th>Logistics Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} onClick={() => {
                    setSelectedOrder(order)
                    setShowModal(true)
                  }} style={{ cursor: 'pointer' }}>
                    <td className="fw-medium">{order.order_id}</td>
                    <td>{order.shipper}</td>
                    <td>{order.customer}</td>
                    <td>{getShipmentTypeDisplay(order.shipment_type)}</td>
                    <td>
                      <Badge 
                        bg={
                          order.logistics_status === 'preparing' ? 'warning' :
                          order.logistics_status === 'shipping' ? 'info' :
                          order.logistics_status === 'arrived' ? 'success' :
                          'secondary'
                        }
                      >
                        {order.logistics_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
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
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>Order Details - {selectedOrder?.order_id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <div>
              <Row>
                <Col md={6}>
                  <h6 className="text-primary mb-3">Basic Information</h6>
                  <p><strong>Order ID:</strong> {selectedOrder.order_id}</p>
                  <p><strong>Shipper:</strong> {selectedOrder.shipper}</p>
                  <p><strong>Shipper's Freight Number:</strong> {selectedOrder.shipper_freight_number || 'N/A'}</p>
                  <p><strong>Customer:</strong> {selectedOrder.customer}</p>
                  <p><strong>Shipment Type:</strong> {getShipmentTypeDisplay(selectedOrder.shipment_type)}</p>
                  
                  <h6 className="text-primary mb-3 mt-4">Carrier Information</h6>
                  <p><strong>Carrier Company:</strong> {selectedOrder.carrier_company}</p>
                  <p><strong>Carrier Tracking Number:</strong> {selectedOrder.carrier_tracking_number || 'N/A'}</p>
                  <p><strong>Carrier BL Number:</strong> {selectedOrder.carrier_bl_number || 'N/A'}</p>
                  <p><strong>Vessel/Flight Name:</strong> {selectedOrder.vessel_flight_name || 'N/A'}</p>
                </Col>
                
                <Col md={6}>
                  <h6 className="text-primary mb-3">Dates and Locations</h6>
                  <p><strong>Loading Date:</strong> {new Date(selectedOrder.loading_date).toLocaleDateString()}</p>
                  <p><strong>Loading Location:</strong> {selectedOrder.loading_location || 'N/A'}</p>
                  <p><strong>Departure Date:</strong> {new Date(selectedOrder.departure_date).toLocaleDateString()}</p>
                  <p><strong>Port/Airport of Departure:</strong> {selectedOrder.port_airport_departure || 'N/A'}</p>
                  <p><strong>Arrival Date:</strong> {new Date(selectedOrder.arrival_date).toLocaleDateString()}</p>
                  <p><strong>Port/Airport of Arrival:</strong> {selectedOrder.port_airport_arrival || 'N/A'}</p>
                  
                  <h6 className="text-primary mb-3 mt-4">Packaging and Freight</h6>
                  <p><strong>Packaging Type:</strong> {selectedOrder.packaging_type}</p>
                  <p><strong>Total Packages:</strong> {selectedOrder.total_packages}</p>
                  <p><strong>Freight Terms:</strong> {selectedOrder.freight_terms.toUpperCase()}</p>
                </Col>
              </Row>

              {selectedOrder.includes_container && (
                <Row className="mt-3">
                  <Col xs={12}>
                    <h6 className="text-primary mb-3">Container Information</h6>
                    <p><strong>Number of Containers:</strong> {selectedOrder.number_of_containers}</p>
                    {selectedOrder.container_1_number && <p><strong>Container 1:</strong> {selectedOrder.container_1_number}</p>}
                    {selectedOrder.container_2_number && <p><strong>Container 2:</strong> {selectedOrder.container_2_number}</p>}
                    {selectedOrder.container_3_number && <p><strong>Container 3:</strong> {selectedOrder.container_3_number}</p>}
                    {selectedOrder.container_4_number && <p><strong>Container 4:</strong> {selectedOrder.container_4_number}</p>}
                    {selectedOrder.container_5_number && <p><strong>Container 5:</strong> {selectedOrder.container_5_number}</p>}
                  </Col>
                </Row>
              )}

              {selectedOrder.other_remarks && (
                <Row className="mt-3">
                  <Col xs={12}>
                    <h6 className="text-primary mb-3">Other Remarks</h6>
                    <p>{selectedOrder.other_remarks}</p>
                  </Col>
                </Row>
              )}

              <Row className="mt-3">
                <Col md={6}>
                  <h6 className="text-primary mb-3">Status and Metadata</h6>
                  <p><strong>Created By:</strong> {selectedOrder.created_by}</p>
                  <p><strong>Created At:</strong> {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                </Col>
                
                <Col md={6}>
                  <h6 className="text-primary mb-3">Update Logistics Status</h6>
                  <Form.Group>
                    <Form.Label><strong>Logistics Status:</strong></Form.Label>
                    <Form.Select 
                      value={selectedOrder.logistics_status} 
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
