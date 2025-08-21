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
    name: '',
    email: '',
    telephone: '',
    country: '',
    city: '',
    address: '',
    postcode: '',
    password: '',
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
            username: signupForm.name, // Use name as username
            role: signupForm.role,
            telephone: signupForm.telephone,
            country: signupForm.country,
            city: signupForm.city,
            address: signupForm.address,
            postcode: signupForm.postcode
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
    <div>
      <Row className="justify-content-center">
        <Col md={10} lg={8} xl={6}>
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
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Full Name *</Form.Label>
                          <Form.Control
                            type="text"
                            value={signupForm.name}
                            onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                            placeholder="Enter your full name"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Email Address *</Form.Label>
                          <Form.Control
                            type="email"
                            value={signupForm.email}
                            onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                            placeholder="Enter your email"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Telephone *</Form.Label>
                          <Form.Control
                            type="tel"
                            value={signupForm.telephone}
                            onChange={(e) => setSignupForm({ ...signupForm, telephone: e.target.value })}
                            placeholder="Enter your phone number"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Country *</Form.Label>
                          <Form.Control
                            type="text"
                            value={signupForm.country}
                            onChange={(e) => setSignupForm({ ...signupForm, country: e.target.value })}
                            placeholder="Enter your country"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>City *</Form.Label>
                          <Form.Control
                            type="text"
                            value={signupForm.city}
                            onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                            placeholder="Enter your city"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Postcode *</Form.Label>
                          <Form.Control
                            type="text"
                            value={signupForm.postcode}
                            onChange={(e) => setSignupForm({ ...signupForm, postcode: e.target.value })}
                            placeholder="Enter your postcode"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Address *</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={signupForm.address}
                            onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                            placeholder="Enter your full address"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Role *</Form.Label>
                          <Form.Select
                            value={signupForm.role}
                            onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                            required
                          >
                            <option value="customer">Customer</option>
                            <option value="factory">Factory</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Password *</Form.Label>
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
                      </Col>
                    </Row>

                    <div className="mt-4">
                      <Button
                        type="submit"
                        variant="primary"
                        className="w-100"
                        disabled={loading}
                      >
                        {loading ? 'Creating Account...' : 'Create Account'}
                      </Button>
                    </div>
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
    </div>
  )
}
