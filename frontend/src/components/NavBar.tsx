import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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
    <header className="navbar">
      <div className="nav-left">
        <div className="brand">Pandec</div>
        <NavLink to="/tracking" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>Tracking</NavLink>
        <NavLink to="/management" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>Management</NavLink>
        <NavLink to="/documents" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>Documents</NavLink>
        <NavLink to="/user" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>User</NavLink>
      </div>
      <div className="nav-right">
        {username ? <span className="badge">{username}</span> : <span className="helper">Not signed in</span>}
        {username && <button onClick={logout}>Logout</button>}
      </div>
    </header>
  )
}


