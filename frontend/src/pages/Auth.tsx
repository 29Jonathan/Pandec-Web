import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Form, Button, Alert, Tabs, Tab } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function Auth() {
  const [activeTab, setActiveTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })

  // Signup form state
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    username: '',
    role: 'customer'
  })

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        navigate('/tracking')
      }
    }
    checkUser()
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess('Login successful! Redirecting...')
        setTimeout(() => navigate('/tracking'), 1000)
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: {
          data: {
            username: signupForm.username,
            role: signupForm.role
          }
        }
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess('Registration successful! Redirecting...')
        setTimeout(() => navigate('/tracking'), 1000)
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container fluid>
      <Row className="justify-content-center">
        <Col md={8} lg={6} xl={5}>
          <div className="text-center mb-4">
            <h1 className="text-primary fw-bold">Pandec</h1>
            <p className="text-muted">Welcome to the order management system</p>
          </div>

          <Card className="shadow">
            <Card.Body className="p-4">
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k || 'login')}
                className="mb-4"
              >
                <Tab eventKey="login" title="Sign In">
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
                  
                  <Form onSubmit={handleLogin}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        placeholder="Enter your email"
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        placeholder="Enter your password"
                        required
                      />
                    </Form.Group>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-100"
                      disabled={loading}
                    >
                      {loading ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </Form>
                </Tab>

                <Tab eventKey="signup" title="Sign Up">
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
                  
                  <Form onSubmit={handleSignup}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        placeholder="Enter your email"
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Username</Form.Label>
                      <Form.Control
                        type="text"
                        value={signupForm.username}
                        onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                        placeholder="Enter your username"
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Role</Form.Label>
                      <Form.Select
                        value={signupForm.role}
                        onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                        required
                      >
                        <option value="customer">Customer</option>
                        <option value="factory">Factory</option>
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        placeholder="Create a password"
                        required
                        minLength={6}
                      />
                      <Form.Text className="text-muted">
                        Password must be at least 6 characters long
                      </Form.Text>
                    </Form.Group>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-100"
                      disabled={loading}
                    >
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </Form>
                </Tab>
              </Tabs>

              <div className="text-center">
                <small className="text-muted">
                  {activeTab === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <Button
                        variant="link"
                        className="p-0 text-decoration-none"
                        onClick={() => setActiveTab('signup')}
                      >
                        Sign up here
                      </Button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <Button
                        variant="link"
                        className="p-0 text-decoration-none"
                        onClick={() => setActiveTab('login')}
                      >
                        Sign in here
                      </Button>
                    </>
                  )}
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
