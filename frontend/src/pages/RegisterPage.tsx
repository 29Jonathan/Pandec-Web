import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Form, Button, Alert } from 'react-bootstrap'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'customer' | 'factory'>('customer')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, role }
      }
    })
    if (error) {
      setError(error.message)
      return
    }
    alert('Registration successful. Please verify your email before logging in (if email confirmation is enabled).')
    window.location.href = '/login'
  }

  return (
    <div>
      <h3 className="mb-3">Register</h3>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={onSubmit} className="d-grid gap-2">
        <Form.Control placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Form.Control placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Form.Control placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Form.Select value={role} onChange={(e) => setRole(e.target.value as 'customer' | 'factory')}>
          <option value="customer">Customer</option>
          <option value="factory">Factory</option>
        </Form.Select>
        <Button type="submit">Register</Button>
      </Form>
    </div>
  )
}


