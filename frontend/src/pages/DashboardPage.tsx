import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE_URL as string

type Order = {
  id: number
  order_id: string
  factory_id: string
  customer_id: string
  ship_name: string
  departure_date: string
  arrival_date: string
  type: string
  price: string
  amount: number
  weight: string
  created_by: string
}

type Me = { email: string; username?: string; role?: string; is_admin: boolean }

export function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [form, setForm] = useState({
    order_id: '',
    factory_id: '',
    customer_id: '',
    ship_name: '',
    departure_date: '',
    arrival_date: '',
    type: '',
    price: '',
    amount: 0,
    weight: ''
  })
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const token = session.session.access_token
      const headers = { Authorization: `Bearer ${token}` }
      try {
        const m = await axios.get(`${API}/api/me`, { headers })
        setMe(m.data)
        const o = await axios.get(`${API}/api/orders/`, { headers })
        setOrders(o.data)
      } catch (e: any) {
        setError(e.message)
      }
    })()
  }, [])

  async function createOrder(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) {
      setError('Please login')
      return
    }
    const headers = { Authorization: `Bearer ${session.session.access_token}` }
    try {
      const res = await axios.post(`${API}/api/orders/`, form, { headers })
      setOrders([res.data, ...orders])
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!file) return setError('Select a file first')
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return setError('Please login')
    const headers = { Authorization: `Bearer ${session.session.access_token}` }
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axios.post(`${API}/api/upload`, formData, { headers })
      const { path } = res.data
      const link = await axios.get(`${API}/api/download?path=${encodeURIComponent(path)}`, { headers })
      const url = link.data.url
      window.open(url, '_blank')
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Dashboard {me?.is_admin ? '(Admin)' : ''}</h2>
      {!me && <div>Login to use the app.</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {me && (
        <>
          <section style={{ marginBottom: 24 }}>
            <h3>Create Order</h3>
            <form onSubmit={createOrder} style={{ display: 'grid', gap: 6, maxWidth: 600 }}>
              {(
                [
                  'order_id',
                  'factory_id',
                  'customer_id',
                  'ship_name',
                  'departure_date',
                  'arrival_date',
                  'type',
                  'price',
                  'amount',
                  'weight'
                ] as const
              ).map((key) => (
                <input
                  key={key}
                  placeholder={key}
                  type={key.includes('date') ? 'date' : key === 'amount' ? 'number' : 'text'}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: key === 'amount' ? Number(e.target.value) : e.target.value })}
                />
              ))}
              <button type="submit">Create</button>
            </form>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3>Upload & Download</h3>
            <form onSubmit={upload}>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <button type="submit">Upload</button>
            </form>
          </section>

          <section>
            <h3>Your Orders</h3>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {['order_id','factory_id','customer_id','ship_name','departure_date','arrival_date','type','price','amount','weight','created_by'].map(h => (
                    <th key={h} style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: 4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>{o.order_id}</td>
                    <td>{o.factory_id}</td>
                    <td>{o.customer_id}</td>
                    <td>{o.ship_name}</td>
                    <td>{o.departure_date}</td>
                    <td>{o.arrival_date}</td>
                    <td>{o.type}</td>
                    <td>{o.price}</td>
                    <td>{o.amount}</td>
                    <td>{o.weight}</td>
                    <td>{o.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  )
}


