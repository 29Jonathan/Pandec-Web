import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { Container, Row, Col, Card } from 'react-bootstrap'

export function UserPage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    })()
  }, [])

  if (!user) {
    return (
      <Container className="py-3">
        <Row className="g-3">
          <Col md={6}><Card><Card.Body><LoginPage /></Card.Body></Card></Col>
          <Col md={6}><Card><Card.Body><RegisterPage /></Card.Body></Card></Col>
        </Row>
      </Container>
    )
  }

  const meta = user.user_metadata || {}
  return (
    <Container className="py-3">
      <Row className="mb-3"><Col><h2 className="mb-0">User</h2></Col></Row>
      <Card>
        <Card.Body>
          <div className="d-flex flex-column gap-2">
            <div><strong>Username:</strong> <span>{meta.username || user.email}</span></div>
            <div><strong>Role:</strong> <span>{meta.role || '-'}</span></div>
            <div><strong>Email:</strong> <span>{user.email}</span></div>
          </div>
        </Card.Body>
      </Card>
    </Container>
  )
}


