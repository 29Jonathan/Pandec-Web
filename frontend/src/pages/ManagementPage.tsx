import { useEffect, useState } from 'react'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_BASE_URL as string

export function ManagementPage() {
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    order_id: '', factory_id: '', customer_id: '', ship_name: '',
    departure_date: '', arrival_date: '', type: '', price: '', amount: 0, weight: ''
  })

  async function createOrder(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return setError('Please login')
    const headers = { Authorization: `Bearer ${session.session.access_token}` }
    try {
      await axios.post(`${API}/api/orders/`, form, { headers })
      setForm({ order_id: '', factory_id: '', customer_id: '', ship_name: '', departure_date: '', arrival_date: '', type: '', price: '', amount: 0, weight: '' })
      alert('Order created')
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="container">
      <h2>Management</h2>
      <div className="panel">
        <form onSubmit={createOrder} className="grid cols-3">
          {(['order_id','factory_id','customer_id','ship_name','departure_date','arrival_date','type','price','amount','weight'] as const).map(key => (
            <input key={key} placeholder={key} type={key.includes('date') ? 'date' : key==='amount' ? 'number' : 'text'} value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: key==='amount'? Number(e.target.value): e.target.value })} />
          ))}
          <div className="hstack">
            <button type="submit">Create</button>
            {error && <span className="helper">{error}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}


