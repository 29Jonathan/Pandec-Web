import { useEffect, useState } from 'react'
import axios from 'axios'
import { supabase } from '../lib/supabase'
import { Row, Col, Card, Form, Button, Table, Alert } from 'react-bootstrap'

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
    <div className="py-3">
      <Row className="mb-3"><Col><h2 className="mb-0">Documents</h2></Col></Row>
      <Card className="mb-3">
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={upload} className="d-flex align-items-center gap-2">
            <Form.Control type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button type="submit">Upload</Button>
          </Form>
        </Card.Body>
      </Card>
      <Card>
        <Card.Header>Your files</Card.Header>
        <Card.Body className="p-0">
          <Table hover responsive className="mb-0">
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
                  <td className="text-end pe-3"><Button size="sm" onClick={() => download(f.path)}>Download</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  )
}


