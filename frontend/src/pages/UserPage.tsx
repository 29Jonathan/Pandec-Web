import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'

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
      <div className="container grid cols-2">
        <div className="panel"><LoginPage /></div>
        <div className="panel"><RegisterPage /></div>
      </div>
    )
  }

  const meta = user.user_metadata || {}
  return (
    <div className="container">
      <h2>User</h2>
      <div className="panel vstack">
        <div className="hstack"><strong>Username:</strong> <span>{meta.username || user.email}</span></div>
        <div className="hstack"><strong>Role:</strong> <span>{meta.role || '-'}</span></div>
        <div className="hstack"><strong>Email:</strong> <span>{user.email}</span></div>
      </div>
    </div>
  )
}


