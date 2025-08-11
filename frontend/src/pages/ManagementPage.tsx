import { useEffect, useState } from 'react'
import axios from 'axios'
import { supabase } from '../lib/supabase'
import { Row, Col, Card, Form, Button, Alert } from 'react-bootstrap'

const API = import.meta.env.VITE_API_BASE_URL as string

export function ManagementPage() {
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    order_id: '', factory_id: '', customer_id: '', ship_name: '',
    departure_date: '', arrival_date: '', type: '', price: '', amount: 0, weight: ''
  })

  async function createOrder(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return setError('Please login')
    const headers = { Authorization: `Bearer ${session.session.access_token}` }
    try {
      await axios.post(`${API}/api/orders/`, form, { headers })
      setForm({ order_id: '', factory_id: '', customer_id: '', ship_name: '', departure_date: '', arrival_date: '', type: '', price: '', amount: 0, weight: '' })
      alert('Order created')
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="py-3">
      <Row className="mb-3"><Col><h2 className="mb-0">Management</h2></Col></Row>
      <Card>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={createOrder}>
            <Row className="g-3">
              {(['order_id','factory_id','customer_id','ship_name','departure_date','arrival_date','type','price','amount','weight'] as const).map(key => (
                <Col md={4} key={key}>
                  <Form.Group>
                    <Form.Label className="text-capitalize">{key.replace('_',' ')}</Form.Label>
                    <Form.Control
                      type={key.includes('date') ? 'date' : key==='amount' ? 'number' : 'text'}
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: key==='amount'? Number(e.target.value): e.target.value })}
                    />
                  </Form.Group>
                </Col>
              ))}
              <Col xs={12} className="d-flex justify-content-end">
                <Button type="submit">Create</Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
    </div>
  )
}


