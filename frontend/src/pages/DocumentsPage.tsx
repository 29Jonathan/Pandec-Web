import { useEffect, useState } from 'react'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_BASE_URL as string

type FileItem = { name: string; path: string; last_modified?: string; size?: number }

export function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [error, setError] = useState('')

  async function withAuth<T>(fn: (headers: any) => Promise<T>) {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) throw new Error('Please login')
    const headers = { Authorization: `Bearer ${session.session.access_token}` }
    return fn(headers)
  }

  async function refresh() {
    setError('')
    try {
      const res = await withAuth(h => axios.get(`${API}/api/files`, { headers: h }))
      setFiles((res as any).data.files)
    } catch (e: any) { setError(e.response?.data?.detail || e.message) }
  }

  useEffect(() => { refresh() }, [])

  async function upload(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!file) return setError('Select a file first')
    try {
      const res = await withAuth(h => {
        const fd = new FormData(); fd.append('file', file!)
        return axios.post(`${API}/api/upload`, fd, { headers: h })
      })
      await refresh()
      const path = (res as any).data.path
      const link = await withAuth(h => axios.get(`${API}/api/download?path=${encodeURIComponent(path)}`, { headers: h }))
      const url = (link as any).data.url
      window.open(url, '_blank')
    } catch (e: any) { setError(e.response?.data?.detail || e.message) }
  }

  async function download(path: string) {
    setError('')
    try {
      const link = await withAuth(h => axios.get(`${API}/api/download?path=${encodeURIComponent(path)}`, { headers: h }))
      const url = (link as any).data.url
      window.open(url, '_blank')
    } catch (e: any) { setError(e.response?.data?.detail || e.message) }
  }

  return (
    <div className="container">
      <h2>Documents</h2>
      <div className="panel vstack">
        <form onSubmit={upload} className="hstack">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="submit">Upload</button>
          {error && <span className="helper">{error}</span>}
        </form>
        <div>
          <h3>Your files</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th><th>Size</th><th>Modified</th><th></th>
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={f.path}>
                  <td>{f.name}</td>
                  <td>{f.size ?? ''}</td>
                  <td>{f.last_modified ?? ''}</td>
                  <td><button onClick={() => download(f.path)}>Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


