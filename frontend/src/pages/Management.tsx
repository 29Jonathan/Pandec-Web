import { useState } from 'react'
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_BASE_URL as string

type OrderForm = {
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
  total_packages: string
  freight_terms: string
  includes_container: boolean
  number_of_containers: string
  container_1_number: string
  container_2_number: string
  container_3_number: string
  container_4_number: string
  container_5_number: string
  other_remarks: string
}

const initialForm: OrderForm = {
  order_id: '',
  shipper: '',
  shipper_freight_number: '',
  customer: '',
  shipment_type: '',
  carrier_company: '',
  carrier_tracking_number: '',
  carrier_bl_number: '',
  vessel_flight_name: '',
  loading_date: '',
  loading_location: '',
  departure_date: '',
  port_airport_departure: '',
  arrival_date: '',
  port_airport_arrival: '',
  packaging_type: '',
  total_packages: '',
  freight_terms: '',
  includes_container: false,
  number_of_containers: '',
  container_1_number: '',
  container_2_number: '',
  container_3_number: '',
  container_4_number: '',
  container_5_number: '',
  other_remarks: ''
}

export function Management() {
  const [form, setForm] = useState<OrderForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleInputChange = (field: keyof OrderForm, value: string | boolean) => {
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
        total_packages: parseInt(form.total_packages) || 0,
        number_of_containers: parseInt(form.number_of_containers) || 0
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
    return form.order_id && form.shipper && form.customer && form.shipment_type &&
           form.carrier_company && form.loading_date && form.departure_date && 
           form.arrival_date && form.packaging_type && form.total_packages && 
           form.freight_terms
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-3">Order Management</h2>
          <p className="text-muted">Create new logistics orders in the system</p>
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
        <Col lg={10} xl={8}>
          <Card>
            <Card.Body>
              <Card.Title>Create New Logistics Order</Card.Title>
              <Form onSubmit={handleSubmit}>
                <Row className="g-3">
                  {/* Basic Information */}
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
                      <Form.Label>Shipper *</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.shipper}
                        onChange={(e) => handleInputChange('shipper', e.target.value)}
                        placeholder="Enter Shipper Name"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Shipper's Freight Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.shipper_freight_number}
                        onChange={(e) => handleInputChange('shipper_freight_number', e.target.value)}
                        placeholder="Enter Freight Number"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Customer *</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.customer}
                        onChange={(e) => handleInputChange('customer', e.target.value)}
                        placeholder="Enter Customer Name"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Shipment Type *</Form.Label>
                      <Form.Select
                        value={form.shipment_type}
                        onChange={(e) => handleInputChange('shipment_type', e.target.value)}
                        required
                      >
                        <option value="">Select Shipment Type</option>
                        <option value="air_freight">Air Freight</option>
                        <option value="sea_freight">Sea Freight</option>
                        <option value="rail_freight">Rail Freight</option>
                        <option value="post">Post</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Carrier Company *</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.carrier_company}
                        onChange={(e) => handleInputChange('carrier_company', e.target.value)}
                        placeholder="Enter Carrier Company"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Carrier Tracking Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.carrier_tracking_number}
                        onChange={(e) => handleInputChange('carrier_tracking_number', e.target.value)}
                        placeholder="Enter Tracking Number"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Carrier BL Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.carrier_bl_number}
                        onChange={(e) => handleInputChange('carrier_bl_number', e.target.value)}
                        placeholder="Enter BL Number"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Vessel/Flight Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.vessel_flight_name}
                        onChange={(e) => handleInputChange('vessel_flight_name', e.target.value)}
                        placeholder="Enter Vessel/Flight Name"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Loading Date *</Form.Label>
                      <Form.Control
                        type="date"
                        value={form.loading_date}
                        onChange={(e) => handleInputChange('loading_date', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Loading Location</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.loading_location}
                        onChange={(e) => handleInputChange('loading_location', e.target.value)}
                        placeholder="Enter Loading Location"
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
                      <Form.Label>Port/Airport of Departure</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.port_airport_departure}
                        onChange={(e) => handleInputChange('port_airport_departure', e.target.value)}
                        placeholder="Enter Departure Port/Airport"
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
                      <Form.Label>Port/Airport of Arrival</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.port_airport_arrival}
                        onChange={(e) => handleInputChange('port_airport_arrival', e.target.value)}
                        placeholder="Enter Arrival Port/Airport"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Packaging Type *</Form.Label>
                      <Form.Select
                        value={form.packaging_type}
                        onChange={(e) => handleInputChange('packaging_type', e.target.value)}
                        required
                      >
                        <option value="">Select Packaging Type</option>
                        <option value="pallet">Pallet</option>
                        <option value="cartons">Cartons</option>
                        <option value="pieces">Pieces</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Total Number of Packages *</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        value={form.total_packages}
                        onChange={(e) => handleInputChange('total_packages', e.target.value)}
                        placeholder="Enter total packages"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Freight Terms *</Form.Label>
                      <Form.Select
                        value={form.freight_terms}
                        onChange={(e) => handleInputChange('freight_terms', e.target.value)}
                        required
                      >
                        <option value="">Select Freight Terms</option>
                        <option value="exw">EXW</option>
                        <option value="fob">FOB</option>
                        <option value="cif">CIF</option>
                        <option value="cfr">CFR</option>
                        <option value="dap">DAP</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Check
                        type="checkbox"
                        label="Includes Container"
                        checked={form.includes_container}
                        onChange={(e) => handleInputChange('includes_container', e.target.checked)}
                      />
                    </Form.Group>
                  </Col>

                  {form.includes_container && (
                    <>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Number of Containers</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            value={form.number_of_containers}
                            onChange={(e) => handleInputChange('number_of_containers', e.target.value)}
                            placeholder="Enter number of containers"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Container 1 Number</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.container_1_number}
                            onChange={(e) => handleInputChange('container_1_number', e.target.value)}
                            placeholder="Enter container number"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Container 2 Number</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.container_2_number}
                            onChange={(e) => handleInputChange('container_2_number', e.target.value)}
                            placeholder="Enter container number"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Container 3 Number</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.container_3_number}
                            onChange={(e) => handleInputChange('container_3_number', e.target.value)}
                            placeholder="Enter container number"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Container 4 Number</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.container_4_number}
                            onChange={(e) => handleInputChange('container_4_number', e.target.value)}
                            placeholder="Enter container number"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Container 5 Number</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.container_5_number}
                            onChange={(e) => handleInputChange('container_5_number', e.target.value)}
                            placeholder="Enter container number"
                          />
                        </Form.Group>
                      </Col>
                    </>
                  )}

                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Other Remarks/Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={form.other_remarks}
                        onChange={(e) => handleInputChange('other_remarks', e.target.value)}
                        placeholder="Enter any additional remarks or notes"
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

        <Col lg={2} xl={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Order Information</Card.Title>
              <div className="text-muted">
                <p>Fill out all required fields to create a new logistics order. The order will be immediately available in the tracking system.</p>
                
                <h6 className="mt-4">Required Fields:</h6>
                <ul className="small">
                  <li>Order ID - Unique identifier</li>
                  <li>Shipper - Source company</li>
                  <li>Customer - Destination company</li>
                  <li>Shipment Type - Transportation method</li>
                  <li>Carrier Company - Transport provider</li>
                  <li>Dates - Loading, departure, and arrival</li>
                  <li>Packaging Type - Package classification</li>
                  <li>Total Packages - Quantity</li>
                  <li>Freight Terms - Delivery terms</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
