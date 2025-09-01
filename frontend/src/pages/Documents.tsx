import { useState, useEffect } from 'react'
import { Row, Col, Card, Form, Button, Table, Alert, Badge, ProgressBar, Modal } from 'react-bootstrap'
import { Trash, Download } from 'react-bootstrap-icons'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_BASE_URL as string

type FileItem = {
  id: number
  file_path: string
  file_name: string
  uploaded_by: string
  uploaded_by_name: string
  recipient_email: string
  recipient_name: string
  file_size?: number
  content_type?: string
  created_at: string
}

export function Documents() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null)
  const [deleting, setDeleting] = useState(false)

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
      if (recipientEmail.trim()) {
        formData.append('recipient_email', recipientEmail.trim())
      }

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
      const response = await axios.post(`${API}/api/upload`, formData, { headers })
      
      setSuccess(response.data.message || 'File uploaded successfully!')
      setSelectedFile(null)
      setRecipientEmail('')
      
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

  const handleDownload = async (path: string) => {
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

  const handleDelete = async (file: FileItem) => {
    setFileToDelete(file)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!fileToDelete) return

    setDeleting(true)
    setError('')
    setSuccess('')

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        setError('Please login to delete files')
        return
      }

      const headers = { Authorization: `Bearer ${session.session.access_token}` }
             await axios.delete(`${API}/api/files/${fileToDelete.id}/delete`, { headers })
      
      setSuccess('File deleted successfully!')
      setShowDeleteModal(false)
      setFileToDelete(null)
      
      // Reload files list
      await loadFiles()
      
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Delete failed')
    } finally {
      setDeleting(false)
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
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
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
        <Col lg={8}>
          <Card>
            <Card.Body>
              <Card.Title>Upload Document</Card.Title>
              <Form onSubmit={handleUpload}>
                <Row className="g-3">
                  <Col md={8}>
                    <Form.Group>
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
                  </Col>
                  
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Recipient Name (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="Enter username or leave empty for admin"
                        disabled={uploading}
                      />
                      <Form.Text className="text-muted">
                        Enter the username of who should receive this file (Admin by default)
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                
                {selectedFile && (
                  <div className="mt-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">File: {selectedFile.name}</span>
                      <Badge bg="info">{formatFileSize(selectedFile.size)}</Badge>
                    </div>
                  </div>
                )}

                {uploading && (
                  <div className="mt-3">
                    <ProgressBar animated now={100} />
                    <small className="text-muted">Uploading...</small>
                  </div>
                )}

                <div className="mt-3">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Upload Information</Card.Title>
              <div className="text-muted">
                <p>Upload files and specify who should receive them:</p>
                
                <h6 className="mt-3">Recipient Options:</h6>
                <ul className="small">
                  <li><strong>Leave empty:</strong> File goes to admin</li>
                  <li><strong>Enter username:</strong> File goes to specific user</li>
                  <li><strong>Your username:</strong> File goes to yourself</li>
                </ul>

                <h6 className="mt-3">File Access:</h6>
                <ul className="small">
                  <li>You can see files you uploaded</li>
                  <li>You can see files sent to you</li>
                  <li>Admin can see all files</li>
                </ul>
              </div>
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
                  <th>Uploaded By</th>
                  <th>Recipient</th>
                  <th>Upload Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td className="fw-medium">{file.file_name}</td>
                    <td>
                      <Badge bg="light" text="dark">
                        {formatFileSize(file.file_size)}
                      </Badge>
                    </td>
                    <td>
                      <div className="fw-medium">{file.uploaded_by_name}</div>
                    </td>
                    <td>
                      <div className="fw-medium">{file.recipient_name || 'Admin'}</div>
                    </td>
                    <td className="text-muted">{formatDate(file.created_at)}</td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleDownload(file.file_path)}
                          title="Download file"
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDelete(file)}
                          disabled={deleting}
                          title="Delete file"
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {files.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
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

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete <strong>"{fileToDelete?.file_name}"</strong>?</p>
          <p className="text-muted small mb-0">
            This will permanently remove the file from both storage and the database. This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
