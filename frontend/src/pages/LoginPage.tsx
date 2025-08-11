import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Form, Button, Alert } from 'react-bootstrap'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      return
    }
    window.location.href = '/'
  }

  return (
    <div>
      <h3 className="mb-3">Login</h3>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={onSubmit} className="d-grid gap-2">
        <Form.Control placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Form.Control placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit">Login</Button>
      </Form>
    </div>
  )
}


