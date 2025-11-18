import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers[key] = value as string
    })
  }
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'API request failed' }))
    throw new Error(error.error || 'API request failed')
  }

  return response.json()
}

// Meta API
export const metaAPI = {
  getPorts: () => fetchAPI('/meta/ports'),
}

// Users API
export const usersAPI = {
  me: () => fetchAPI('/users/me'),
  getAll: (params?: { role?: string; email?: string; q?: string }) => {
    const query = new URLSearchParams(params as any).toString()
    return fetchAPI(`/users${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => fetchAPI(`/users/${id}`),
  update: (id: string, data: any) => fetchAPI(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/users/${id}`, { method: 'DELETE' }),
  sync: (data: any) => fetchAPI('/users/sync', { method: 'POST', body: JSON.stringify(data) }),
  getRelations: (id: string) => fetchAPI(`/users/${id}/relations`),
  addRelation: (id: string, related_user_id: string) => 
    fetchAPI(`/users/${id}/relations`, { method: 'POST', body: JSON.stringify({ related_user_id }) }),
  removeRelation: (id: string, related_user_id: string) => 
    fetchAPI(`/users/${id}/relations/${related_user_id}`, { method: 'DELETE' }),
}

// Orders API
export const ordersAPI = {
  getAll: (params?: { status?: string; sender_id?: string; receiver_id?: string; q?: string }) => {
    const query = new URLSearchParams(params as any).toString()
    return fetchAPI(`/orders${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => fetchAPI(`/orders/${id}`),
  create: (data: any) => fetchAPI('/orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchAPI(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/orders/${id}`, { method: 'DELETE' }),
}

// Offers API
export const offersAPI = {
  getAll: (params?: { order_id?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString()
    return fetchAPI(`/offers${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => fetchAPI(`/offers/${id}`),
  create: (data: any) => fetchAPI('/offers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchAPI(`/offers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/offers/${id}`, { method: 'DELETE' }),
  setStatus: (id: string, action: 'accept' | 'reject') => 
    fetchAPI(`/offers/${id}/status`, { method: 'POST', body: JSON.stringify({ action }) }),
}

// Shipments API
export const shipmentsAPI = {
  getAll: (params?: { status?: string; order_id?: string }) => {
    const query = new URLSearchParams(params as any).toString()
    return fetchAPI(`/shipments${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => fetchAPI(`/shipments/${id}`),
  update: (id: string, data: any) => fetchAPI(`/shipments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/shipments/${id}`, { method: 'DELETE' }),
  getContainers: (id: string) => fetchAPI(`/shipments/${id}/containers`),
}

// Containers API
export const containersAPI = {
  getAll: (params?: { shipment_id?: string; container_number?: string }) => {
    const query = new URLSearchParams(params as any).toString()
    return fetchAPI(`/containers${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => fetchAPI(`/containers/${id}`),
  create: (data: any) => fetchAPI('/containers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchAPI(`/containers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/containers/${id}`, { method: 'DELETE' }),
  link: (id: string, shipment_id: string) => 
    fetchAPI(`/containers/${id}/link`, { method: 'POST', body: JSON.stringify({ shipment_id }) }),
  unlink: (id: string, shipment_id: string) => 
    fetchAPI(`/containers/${id}/unlink`, { method: 'POST', body: JSON.stringify({ shipment_id }) }),
  getShipments: (id: string) => fetchAPI(`/containers/${id}/shipments`),
  getItems: (id: string) => fetchAPI(`/containers/${id}/items`),
  addItem: (id: string, data: any) => 
    fetchAPI(`/containers/${id}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (item_id: string, data: any) => 
    fetchAPI(`/containers/items/${item_id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (item_id: string) => 
    fetchAPI(`/containers/items/${item_id}`, { method: 'DELETE' }),
}
