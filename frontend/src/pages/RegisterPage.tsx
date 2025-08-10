import { useState } from 'react'
import { supabase } from '../lib/supabase'

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
    <div style={{ padding: 16 }}>
      <h2>Register</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value as 'customer' | 'factory')}>
          <option value="customer">Customer</option>
          <option value="factory">Factory</option>
        </select>
        <button type="submit">Register</button>
        {error && <div style={{ color: 'red' }}>{error}</div>}
      </form>
    </div>
  )
}


