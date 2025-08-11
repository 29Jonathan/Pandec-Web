import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Navbar, Container, Nav, Badge, Button } from 'react-bootstrap'

export function NavBar() {
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const meta = data.user?.user_metadata as any
      setUsername(meta?.username || data.user?.email || null)
    })()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/user'
  }

  return (
    <Navbar expand="lg" bg="light" className="mb-3" data-bs-theme="light">
      <Container>
        <Navbar.Brand className="fw-bold">Pandec</Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/tracking">Tracking</Nav.Link>
            <Nav.Link as={NavLink} to="/management">Management</Nav.Link>
            <Nav.Link as={NavLink} to="/documents">Documents</Nav.Link>
            <Nav.Link as={NavLink} to="/user">User</Nav.Link>
          </Nav>
          <div className="d-flex align-items-center gap-2">
            {username ? <Badge bg="info" text="dark">{username}</Badge> : <span className="text-muted">Not signed in</span>}
            {username && <Button variant="outline-secondary" size="sm" onClick={logout}>Logout</Button>}
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}


