import { useEffect, useState } from 'react'
import axios from 'axios'
import { supabase } from '../lib/supabase'

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

export function TrackingPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return
      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      try {
        const o = await axios.get(`${API}/api/orders/`, { headers })
        setOrders(o.data)
      } catch (e: any) {
        setError(e.message)
      }
    })()
  }, [])

  return (
    <div className="container">
      <h2>Tracking</h2>
      {error && <div style={{ color: 'salmon' }}>{error}</div>}
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              {['order_id','factory_id','customer_id','ship_name','departure_date','arrival_date','type','price','amount','weight','created_by'].map(h => (
                <th key={h}>{h}</th>
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
      </div>
    </div>
  )
}


