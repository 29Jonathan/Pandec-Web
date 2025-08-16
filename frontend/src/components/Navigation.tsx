import { useState, useEffect } from 'react'
import { Navbar, Container, Nav, Button, Badge } from 'react-bootstrap'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { NotificationDropdown } from './NotificationDropdown'

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

export function Navigation() {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState<string>('')
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user?.user_metadata?.username) {
        setUsername(user.user_metadata.username)
      } else if (user?.email) {
        setUsername(user.email)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user?.user_metadata?.username) {
        setUsername(session.user.user_metadata.username)
      } else if (session?.user?.email) {
        setUsername(session.user.email)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const handleOrderClick = (order: Order) => {
    // Navigate to tracking page with order data in state
    navigate('/tracking', { 
      state: { 
        orderId: order.order_id,
        showModal: true 
      } 
    })
  }

  if (!user) {
    return (
      <Navbar bg="white" expand="lg" className="shadow-sm">
        <Container>
          <Navbar.Brand as={Link} to="/" className="fw-bold text-primary">
            Pandec
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/auth" className="fw-medium">
                Sign In
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    )
  }

  return (
    <Navbar bg="white" expand="lg" className="shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold text-primary">
          Pandec
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link 
              as={Link} 
              to="/tracking" 
              className={location.pathname === '/tracking' ? 'active fw-medium' : 'fw-medium'}
            >
              Tracking
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/documents" 
              className={location.pathname === '/documents' ? 'active fw-medium' : 'fw-medium'}
            >
              Documents
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/management" 
              className={location.pathname === '/management' ? 'active fw-medium' : 'fw-medium'}
            >
              Management
            </Nav.Link>
          </Nav>
          <div className="d-flex align-items-center gap-3">
            <NotificationDropdown onOrderClick={handleOrderClick} />
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">Welcome,</small>
              <Badge 
                bg="info" 
                text="dark" 
                className="px-2 py-1"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/user')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate('/user')
                  }
                }}
              >
                {username}
              </Badge>
            </div>
            <Button variant="outline-secondary" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}
