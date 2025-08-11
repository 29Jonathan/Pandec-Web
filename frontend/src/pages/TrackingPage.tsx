import { useEffect, useState } from 'react'
import axios from 'axios'
import { Container, Row, Col, Card, Form, Button, Table, Modal, Badge } from 'react-bootstrap'
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

export function TrackingPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<Order | null>(null)
  const [notFoundId, setNotFoundId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      try {
        const o = await axios.get(`${API}/api/orders/`, { headers })
        setOrders(o.data)
      } catch (e: any) {
        setError(e.message)
      }
    })()
  }, [])

  async function search() {
    setError('')
    setNotFoundId(null)
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return setError('Please login')
    const headers = { Authorization: `Bearer ${session.session.access_token}` }
    try {
      const res = await axios.get(`${API}/api/orders/`, { headers, params: { order_id: query } })
      const list: Order[] = res.data
      if (list.length > 0) {
        setModal(list[0])
      } else {
        setNotFoundId(query)
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <Container className="py-3">
      <Row className="align-items-center mb-3">
        <Col><h2 className="mb-0">Tracking</h2></Col>
        <Col xs="12" md="6">
          <Form className="d-flex" onSubmit={(e) => { e.preventDefault(); search(); }}>
            <Form.Control placeholder="Search by Order ID" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button className="ms-2" onClick={search}>Search</Button>
          </Form>
        </Col>
      </Row>
      {error && <div className="text-danger mb-3">{error}</div>}
      <Card>
        <Card.Body className="p-0">
          <div className="table-wrap">
            <Table hover responsive className="mb-0">
              <thead>
                <tr>
                  {['order_id','factory_id','customer_id','ship_name','departure_date','arrival_date','type','price','amount','weight','created_by'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>{o.order_id}</td>
                    <td>{o.factory_id}</td>
                    <td>{o.customer_id}</td>
                    <td>{o.ship_name}</td>
                    <td>{o.departure_date}</td>
                    <td>{o.arrival_date}</td>
                    <td>{o.type}</td>
                    <td>{o.price}</td>
                    <td>{o.amount}</td>
                    <td>{o.weight}</td>
                    <td>{o.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Modal show={!!modal} onHide={() => setModal(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Order {modal?.order_id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="gy-2">
            {modal && ([
              ['factory_id', modal.factory_id],
              ['customer_id', modal.customer_id],
              ['ship_name', modal.ship_name],
              ['departure_date', modal.departure_date],
              ['arrival_date', modal.arrival_date],
              ['type', modal.type],
              ['price', modal.price],
              ['amount', String(modal.amount)],
              ['weight', modal.weight],
              ['created_by', modal.created_by],
            ] as const).map(([k,v]) => (
              <Col xs={12} key={k} className="d-flex">
                <strong style={{width:140}} className="me-2 text-capitalize">{k}</strong>
                <span>{v}</span>
              </Col>
            ))}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModal(null)}>Close</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!notFoundId} onHide={() => setNotFoundId(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Order not found</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex align-items-center gap-2">
            <strong>Order ID:</strong> <Badge bg="secondary">{notFoundId}</Badge>
          </div>
          <div className="text-muted mt-2">No order matched the provided ID. Check the ID and try again.</div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setNotFoundId(null)}>OK</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}


