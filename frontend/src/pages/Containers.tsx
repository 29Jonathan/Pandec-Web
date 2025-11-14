import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { containersAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ContainerModal } from '@/components/modals/ContainerModal'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function Containers() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContainer, setEditingContainer] = useState<any>(null)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  const { data: containers, isLoading } = useQuery({
    queryKey: ['containers'],
    queryFn: () => containersAPI.getAll(),
  })
  
  const isAdmin = user?.user_metadata?.role === 'Admin'
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => containersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      toast.success('Container deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete container')
    },
  })
  
  const handleDelete = (id: string, containerNumber: string) => {
    if (confirm(`Delete container "${containerNumber}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleEdit = (container: any) => {
    setEditingContainer(container)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingContainer(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Containers</h1>
        {isAdmin && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Container
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Containers</CardTitle>
          <CardDescription>Manage shipping containers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : containers && containers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Container Number</TableHead>
                  <TableHead>Shipment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tare Weight (kg)</TableHead>
                  <TableHead>Gross Weight (kg)</TableHead>
                  <TableHead>Goods</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {containers.map((container: any) => (
                  <TableRow key={container.id}>
                    <TableCell className="font-medium">{container.container_number}</TableCell>
                    <TableCell>{container.shipment_number || 'N/A'}</TableCell>
                    <TableCell>{container.container_type}</TableCell>
                    <TableCell>{container.tare_weight}</TableCell>
                    <TableCell>{container.gross_weight}</TableCell>
                    <TableCell>
                      {container.goods && container.goods.length > 0 ? (
                        <div className="text-sm">
                          {container.goods.map((g: any, i: number) => (
                            <div key={i}>{g.goods_name} (x{g.quantity})</div>
                          ))}
                        </div>
                      ) : (
                        'Empty'
                      )}
                    </TableCell>
                    <TableCell>{new Date(container.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(container)}
                            title="Edit container"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(container.id, container.container_number)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                            title="Delete container"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500">No containers found</p>
          )}
        </CardContent>
      </Card>

      <ContainerModal 
        open={modalOpen} 
        onOpenChange={handleCloseModal}
        container={editingContainer}
      />
    </div>
  )
}
