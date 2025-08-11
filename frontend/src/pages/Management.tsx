import { useState } from 'react'
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_BASE_URL as string

type OrderForm = {
  order_id: string
  factory_id: string
  customer_id: string
  ship_name: string
  departure_date: string
  arrival_date: string
  type: string
  price: string
  amount: string
  weight: string
}

const initialForm: OrderForm = {
  order_id: '',
  factory_id: '',
  customer_id: '',
  ship_name: '',
  departure_date: '',
  arrival_date: '',
  type: '',
  price: '',
  amount: '',
  weight: ''
}

export function Management() {
  const [form, setForm] = useState<OrderForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleInputChange = (field: keyof OrderForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        setError('Please login to create orders')
        return
      }

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      
      // Convert form data to match backend expectations
      const orderData = {
        ...form,
        price: parseFloat(form.price) || 0,
        amount: parseInt(form.amount) || 0,
        weight: parseFloat(form.weight) || 0
      }

      await axios.post(`${API}/api/orders/`, orderData, { headers })
      
      setSuccess('Order created successfully!')
      setForm(initialForm)
      
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    return form.order_id && form.factory_id && form.customer_id && form.ship_name &&
           form.departure_date && form.arrival_date && form.type && form.price && 
           form.amount && form.weight
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-3">Order Management</h2>
          <p className="text-muted">Create new orders in the system</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Row>
        <Col lg={8} xl={6}>
          <Card>
            <Card.Body>
              <Card.Title>Create New Order</Card.Title>
              <Form onSubmit={handleSubmit}>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Order ID *</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.order_id}
                        onChange={(e) => handleInputChange('order_id', e.target.value)}
                        placeholder="Enter Order ID"
                        required
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Factory ID *</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.factory_id}
                        onChange={(e) => handleInputChange('factory_id', e.target.value)}
                        placeholder="Enter Factory ID"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Customer ID *</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.customer_id}
                        onChange={(e) => handleInputChange('customer_id', e.target.value)}
                        placeholder="Enter Customer ID"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Ship Name *</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.ship_name}
                        onChange={(e) => handleInputChange('ship_name', e.target.value)}
                        placeholder="Enter Ship Name"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Departure Date *</Form.Label>
                      <Form.Control
                        type="date"
                        value={form.departure_date}
                        onChange={(e) => handleInputChange('departure_date', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Arrival Date *</Form.Label>
                      <Form.Control
                        type="date"
                        value={form.arrival_date}
                        onChange={(e) => handleInputChange('arrival_date', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Type *</Form.Label>
                      <Form.Select
                        value={form.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        required
                      >
                        <option value="">Select Type</option>
                        <option value="cargo">Cargo</option>
                        <option value="passenger">Passenger</option>
                        <option value="mixed">Mixed</option>
                        <option value="special">Special</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Price ($) *</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Amount *</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        value={form.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        placeholder="Enter amount"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Weight (kg) *</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.001"
                        min="0"
                        value={form.weight}
                        onChange={(e) => handleInputChange('weight', e.target.value)}
                        placeholder="0.000"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <hr />
                    <div className="d-flex justify-content-end gap-2">
                      <Button
                        variant="outline-secondary"
                        onClick={() => setForm(initialForm)}
                        disabled={loading}
                      >
                        Reset
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={!isFormValid() || loading}
                      >
                        {loading ? 'Creating...' : 'Create Order'}
                      </Button>
                    </div>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} xl={6}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Order Information</Card.Title>
              <div className="text-muted">
                <p>Fill out all required fields to create a new order. The order will be immediately available in the tracking system.</p>
                
                <h6 className="mt-4">Required Fields:</h6>
                <ul className="small">
                  <li>Order ID - Unique identifier</li>
                  <li>Factory ID - Source factory</li>
                  <li>Customer ID - Destination customer</li>
                  <li>Ship Name - Vessel name</li>
                  <li>Dates - Departure and arrival</li>
                  <li>Type - Cargo classification</li>
                  <li>Price - Order value</li>
                  <li>Amount - Quantity</li>
                  <li>Weight - Total weight</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
