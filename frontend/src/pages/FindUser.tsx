import { useState, useCallback } from 'react'
import { Row, Col, Card, Form, Button, Table, Alert, Badge, Spinner } from 'react-bootstrap'
import { Search, Person, Envelope, Telephone } from 'react-bootstrap-icons'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_BASE_URL as string

type UserProfile = {
  id: string
  email: string
  username: string
  role: string
  telephone: string
  country: string
  city: string
  address: string
  postcode: string
}

export function FindUser() {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) return

    setLoading(true)
    setError('')
    setHasSearched(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        setError('Please login to search for users')
        setLoading(false)
        return
      }

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      const response = await axios.get(`${API}/api/search-users`, { 
        headers, 
        params: { username: query.trim() } 
      })
      
      setUsers(response.data.users || [])
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search users'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchUsers(searchQuery)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'factory': return 'warning'
      case 'customer': return 'info'
      default: return 'secondary'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'factory': return 'Factory User'
      case 'customer': return 'Customer'
      default: return 'User'
    }
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-3">Find User</h2>
          <p className="text-muted">Search for other users by username</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Row className="mb-4">
        <Col lg={8}>
          <Card>
            <Card.Body>
              <Card.Title>Search Users</Card.Title>
              <Form onSubmit={handleSearch}>
                <Row className="g-3">
                  <Col md={8}>
                    <Form.Group>
                      <Form.Label>Username</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter username to search (minimum 2 characters)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        minLength={2}
                        required
                      />
                      <Form.Text className="text-muted">
                        Search for users by their username. Results are case-insensitive.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Button 
                      type="submit" 
                      variant="primary" 
                      disabled={!searchQuery.trim() || searchQuery.trim().length < 2 || loading}
                      className="w-100"
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search size={16} className="me-2" />
                          Search
                        </>
                      )}
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Search Information</Card.Title>
              <div className="text-muted">
                <p>Find other users in the system by searching for their username:</p>
                
                <h6 className="mt-3">Search Tips:</h6>
                <ul className="small">
                  <li>Enter at least 2 characters</li>
                  <li>Search is case-insensitive</li>
                  <li>Partial matches are supported</li>
                  <li>Results limited to 20 users</li>
                </ul>

                <h6 className="mt-3">Privacy:</h6>
                <ul className="small">
                  <li>Only public profile information is shown</li>
                  <li>Your own profile is excluded from results</li>
                  <li>Contact information is displayed if available</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {hasSearched && (
        <Card>
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Search Results</h5>
              <Badge bg="secondary">{users.length} users found</Badge>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" role="status" variant="primary">
                  <span className="visually-hidden">Searching...</span>
                </Spinner>
              </div>
            ) : users.length > 0 ? (
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>User Profile</th>
                      <th>Contact Information</th>
                      <th>Location & Address</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <Person size={20} className="text-primary" />
                            <div>
                              <div className="fw-medium fs-6">{user.username}</div>
                              <small className="text-muted">{user.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <Envelope size={14} className="text-muted" />
                            <small>{user.email}</small>
                          </div>
                          {user.telephone && (
                            <div className="d-flex align-items-center gap-2">
                              <Telephone size={14} className="text-muted" />
                              <small>{user.telephone}</small>
                            </div>
                          )}
                        </td>
                        <td>
                          {user.city || user.country ? (
                            <div>
                              {user.city && <div className="fw-medium">{user.city}</div>}
                              {user.country && <div className="text-muted small">{user.country}</div>}
                              {user.address && (
                                <div className="text-muted small mt-1">
                                  <small>{user.address}</small>
                                </div>
                              )}
                              {user.postcode && (
                                <div className="text-muted small">
                                  <small>Postcode: {user.postcode}</small>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">Not provided</span>
                          )}
                        </td>
                        <td>
                          <Badge bg={getRoleBadgeColor(user.role)}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-5">
                <div className="mb-3">
                  <Search size={48} className="text-muted" />
                </div>
                <h5>No users found</h5>
                <p className="text-muted">
                  No users match your search criteria. Try a different username or check your spelling.
                </p>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  )
}
