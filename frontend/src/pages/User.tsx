import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Badge, Alert, Spinner } from 'react-bootstrap'
import { Person, Envelope, Shield, Calendar, Telephone, GeoAlt, House } from 'react-bootstrap-icons'
import { supabase } from '../lib/supabase'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE_URL as string

type UserInfo = {
  email: string
  username: string | null
  role: string | null
  is_admin: boolean
  telephone?: string
  country?: string
  city?: string
  address?: string
  postcode?: string
}

export function User() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUserInfo()
  }, [])

  const loadUserInfo = async () => {
    try {
      setLoading(true)
      setError('')

      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        setError('Please login to view user details')
        setLoading(false)
        return
      }

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      const response = await axios.get(`${API}/api/me`, { headers })
      
      // Get additional user metadata from Supabase
      const { data: { user } } = await supabase.auth.getUser()
      const userMetadata = user?.user_metadata || {}
      
      setUserInfo({
        ...response.data,
        telephone: userMetadata.telephone,
        country: userMetadata.country,
        city: userMetadata.city,
        address: userMetadata.address,
        postcode: userMetadata.postcode
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load user information')
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string | null, isAdmin: boolean) => {
    if (isAdmin) return 'danger'
    switch (role) {
      case 'factory': return 'warning'
      case 'customer': return 'info'
      default: return 'secondary'
    }
  }

  const getRoleDisplayName = (role: string | null, isAdmin: boolean) => {
    if (isAdmin) return 'Administrator'
    switch (role) {
      case 'factory': return 'Factory User'
      case 'customer': return 'Customer'
      default: return 'User'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div>
        <Alert variant="warning">
          No user information available
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-3">User Profile</h2>
          <p className="text-muted">Your account information and settings</p>
        </Col>
      </Row>

      <Row>
        <Col lg={8}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex align-items-center gap-2">
                <Person size={24} />
                <h5 className="mb-0">Account Information</h5>
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              <Row className="g-3">
                <Col md={6}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Person size={16} className="text-muted" />
                    <small className="text-muted">User Name</small>
                  </div>
                  <div className="fw-bold fs-5">
                    {userInfo.username || 'Not set'}
                  </div>
                </Col>

                <Col md={6}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Envelope size={16} className="text-muted" />
                    <small className="text-muted">Email Address</small>
                  </div>
                  <div className="fw-bold fs-6 text-break">
                    {userInfo.email}
                  </div>
                </Col>

                <Col md={6}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Telephone size={16} className="text-muted" />
                    <small className="text-muted">Telephone</small>
                  </div>
                  <div className="fw-bold">
                    {userInfo.telephone || 'Not provided'}
                  </div>
                </Col>

                <Col md={6}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Shield size={16} className="text-muted" />
                    <small className="text-muted">Role</small>
                  </div>
                  <Badge 
                    bg={getRoleBadgeColor(userInfo.role, userInfo.is_admin)}
                    className="fs-6 px-3 py-2"
                  >
                    {getRoleDisplayName(userInfo.role, userInfo.is_admin)}
                  </Badge>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex align-items-center gap-2">
                <GeoAlt size={20} />
                <h6 className="mb-0">Address Information</h6>
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              <Row className="g-3">
                <Col md={6}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <GeoAlt size={16} className="text-muted" />
                    <small className="text-muted">Country</small>
                  </div>
                  <div className="fw-bold">
                    {userInfo.country || 'Not provided'}
                  </div>
                </Col>

                <Col md={6}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <House size={16} className="text-muted" />
                    <small className="text-muted">City</small>
                  </div>
                  <div className="fw-bold">
                    {userInfo.city || 'Not provided'}
                  </div>
                </Col>

                <Col md={6}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Calendar size={16} className="text-muted" />
                    <small className="text-muted">Postcode</small>
                  </div>
                  <div className="fw-bold">
                    {userInfo.postcode || 'Not provided'}
                  </div>
                </Col>

                <Col xs={12}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <House size={16} className="text-muted" />
                    <small className="text-muted">Full Address</small>
                  </div>
                  <div className="fw-bold">
                    {userInfo.address || 'Not provided'}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Account Details</h6>
            </Card.Header>
            <Card.Body>
              <div className="text-muted">
                <p className="mb-3">
                  This is your user profile page where you can view your account information.
                </p>
                
                <h6 className="text-dark mb-2">Your Role Permissions:</h6>
                <ul className="small">
                  {userInfo.is_admin ? (
                    <>
                      <li>Full system access</li>
                      <li>View all orders</li>
                      <li>View all files</li>
                      <li>Manage system settings</li>
                      <li>Receive admin notifications</li>
                    </>
                  ) : userInfo.role === 'factory' ? (
                    <>
                      <li>Create and manage orders</li>
                      <li>Upload and download documents</li>
                      <li>Send files to specific users</li>
                      <li>Track order status</li>
                      <li>Receive order notifications</li>
                    </>
                  ) : (
                    <>
                      <li>View your orders</li>
                      <li>Track order status</li>
                      <li>Upload and download documents</li>
                      <li>Send files to specific users</li>
                      <li>Receive order notifications</li>
                    </>
                  )}
                </ul>

                <hr />
                
                <div className="small">
                  <strong>Note:</strong> Contact an administrator if you need to change your role or account settings.
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
