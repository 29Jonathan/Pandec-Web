import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText, Download, Trash2, UploadCloud } from 'lucide-react'

interface ShipmentDocumentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipmentId: string | undefined
  shipmentNumber?: string
}

interface StorageFileItem {
  name: string
  id?: string
  created_at?: string
  size?: number
}

const SHIPMENT_DOCS_BUCKET = import.meta.env.VITE_SUPABASE_SHIPMENTS_BUCKET || 'shipment-documents'

function getAvailableFileName(originalName: string, existingNames: Set<string>): string {
  if (!existingNames.has(originalName)) {
    return originalName
  }

  const lastDot = originalName.lastIndexOf('.')
  const hasExtension = lastDot > 0
  const base = hasExtension ? originalName.slice(0, lastDot) : originalName
  const ext = hasExtension ? originalName.slice(lastDot) : ''

  let counter = 1
  // Windows/macOS style: "Test.txt", "Test (1).txt", "Test (2).txt", ...
  while (true) {
    const candidate = `${base} (${counter})${ext}`
    if (!existingNames.has(candidate)) {
      return candidate
    }
    counter += 1
  }
}

export function ShipmentDocumentsModal({ open, onOpenChange, shipmentId, shipmentNumber }: ShipmentDocumentsModalProps) {
  const [files, setFiles] = useState<StorageFileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const folder = shipmentId ? `shipments/${shipmentId}` : undefined

  const loadFiles = async () => {
    if (!folder) return
    setLoading(true)
    try {
      const { data, error } = await supabase.storage
        .from(SHIPMENT_DOCS_BUCKET)
        .list(folder, {
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (error) throw error

      setFiles((data || []).map((item) => ({
        name: item.name,
        id: item.id,
        created_at: item.created_at,
        size: item.metadata?.size ?? undefined,
      })))
    } catch (error: any) {
      console.error('Failed to load shipment documents', error)
      toast.error(error.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && shipmentId) {
      loadFiles()
    } else if (!open) {
      setFiles([])
    }
  }, [open, shipmentId])

  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    if (!folder) return
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return

    setUploading(true)
    try {
      // Start from current names and also reserve names we generate in this batch
      const existingNames = new Set(files.map((f) => f.name))

      for (const file of Array.from(fileList)) {
        const finalName = getAvailableFileName(file.name, existingNames)
        existingNames.add(finalName)

        const path = `${folder}/${finalName}`
        const { error } = await supabase.storage
          .from(SHIPMENT_DOCS_BUCKET)
          .upload(path, file, { upsert: false })

        if (error) throw error
      }
      toast.success('Document(s) uploaded successfully')
      await loadFiles()
    } catch (error: any) {
      console.error('Failed to upload shipment documents', error)
      toast.error(error.message || 'Failed to upload documents')
    } finally {
      setUploading(false)
      // Reset input so the same file can be selected again if needed
      event.target.value = ''
    }
  }

  const handleDownload = async (fileName: string) => {
    if (!folder) return
    try {
      const { data, error } = await supabase.storage
        .from(SHIPMENT_DOCS_BUCKET)
        .download(`${folder}/${fileName}`)

      if (error || !data) throw error || new Error('Download failed')

      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Failed to download shipment document', error)
      toast.error(error.message || 'Failed to download document')
    }
  }

  const handleDelete = async (fileName: string) => {
    if (!folder) return
    if (!confirm(`Delete document "${fileName}"? This action cannot be undone.`)) return

    try {
      const { error } = await supabase.storage
        .from(SHIPMENT_DOCS_BUCKET)
        .remove([`${folder}/${fileName}`])

      if (error) throw error

      toast.success('Document deleted successfully')
      await loadFiles()
    } catch (error: any) {
      console.error('Failed to delete shipment document', error)
      toast.error(error.message || 'Failed to delete document')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Shipment Documents
          </DialogTitle>
          <DialogDescription>
            {shipmentNumber ? `Documents for shipment ${shipmentNumber}` : 'Upload and download documents for this shipment.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Upload section */}
          <div className="border rounded-md p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <UploadCloud className="h-4 w-4" />
              <span>Upload PDF, images, or other documents linked to this shipment.</span>
            </div>
            <div>
              <Label className="inline-flex items-center">
                <Button asChild disabled={uploading} variant="outline" size="sm">
                  <span>
                    <UploadCloud className="h-4 w-4 mr-1" />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </span>
                </Button>
                <Input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                />
              </Label>
            </div>
          </div>

          {/* Files list */}
          <div className="flex-1 min-h-0 border rounded-md">
            <div className="px-3 py-2 border-b flex items-center justify-between text-xs text-gray-500 uppercase tracking-wide">
              <span>Documents</span>
              {loading && <span>Loading...</span>}
            </div>
            <div className="h-64 overflow-y-auto divide-y">
              {files.length === 0 && !loading && (
                <div className="p-4 text-sm text-gray-500">No documents uploaded for this shipment yet.</div>
              )}
              {files.map((file) => (
                <div key={file.name} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium break-all">{file.name}</span>
                    {file.created_at && (
                      <span className="text-xs text-gray-500">
                        {new Date(file.created_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(file.name)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(file.name)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
