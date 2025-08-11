import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Form, Button, Table, Alert, Badge, ProgressBar } from 'react-bootstrap'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_BASE_URL as string

type FileItem = {
  name: string
  path: string
  last_modified?: string
  size?: number
}

export function Documents() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        setError('Please login to view documents')
        setLoading(false)
        return
      }

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      const response = await axios.get(`${API}/api/files`, { headers })
      setFiles(response.data.files || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Please select a file to upload')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        setError('Please login to upload files')
        return
      }

      const formData = new FormData()
      formData.append('file', selectedFile)

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      const response = await axios.post(`${API}/api/upload`, formData, { headers })
      
      setSuccess('File uploaded successfully!')
      setSelectedFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('fileInput') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      // Reload files list
      await loadFiles()
      
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (path: string, _filename: string) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        setError('Please login to download files')
        return
      }

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      const response = await axios.get(`${API}/api/download?path=${encodeURIComponent(path)}`, { headers })
      window.open(response.data.url, '_blank')
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Download failed')
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-3">Documents</h2>
          <p className="text-muted">Upload and manage your documents</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Row className="mb-4">
        <Col lg={6}>
          <Card>
            <Card.Body>
              <Card.Title>Upload Document</Card.Title>
              <Form onSubmit={handleUpload}>
                <Form.Group className="mb-3">
                  <Form.Label>Select File</Form.Label>
                  <Form.Control
                    id="fileInput"
                    type="file"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  <Form.Text className="text-muted">
                    Choose a file to upload to your document storage
                  </Form.Text>
                </Form.Group>
                
                {selectedFile && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">File: {selectedFile.name}</span>
                      <Badge bg="info">{formatFileSize(selectedFile.size)}</Badge>
                    </div>
                  </div>
                )}

                {uploading && (
                  <div className="mb-3">
                    <ProgressBar animated now={100} />
                    <small className="text-muted">Uploading...</small>
                  </div>
                )}

                <Button 
                  type="submit" 
                  variant="primary" 
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Your Documents</h5>
            <Badge bg="secondary">{files.length} files</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Modified</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.path}>
                    <td className="fw-medium">{file.name}</td>
                    <td>
                      <Badge bg="light" text="dark">
                        {formatFileSize(file.size)}
                      </Badge>
                    </td>
                    <td className="text-muted">{formatDate(file.last_modified)}</td>
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleDownload(file.path, file.name)}
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
                {files.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      <div className="mb-2">
                        <i className="bi bi-folder text-muted" style={{ fontSize: '2rem' }}></i>
                      </div>
                      No documents found
                      <br />
                      <small>Upload your first document to get started</small>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  )
}
