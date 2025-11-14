import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { containersAPI, shipmentsAPI } from '@/lib/api'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ContainerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipmentId?: string
  container?: any
}

export function ContainerModal({ open, onOpenChange, shipmentId, container }: ContainerModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    shipment_id: shipmentId || '',
    container_number: '',
    container_type: '40ft Standard',
    tare_weight: '',
    gross_weight: '',
  })

  const { data: shipments } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsAPI.getAll(),
    enabled: !shipmentId,
  })

  useEffect(() => {
    if (container) {
      // Editing mode
      setFormData({
        shipment_id: container.shipment_id || '',
        container_number: container.container_number || '',
        container_type: container.container_type || '40ft Standard',
        tare_weight: container.tare_weight?.toString() || '',
        gross_weight: container.gross_weight?.toString() || '',
      })
    } else if (shipmentId) {
      setFormData((prev) => ({ ...prev, shipment_id: shipmentId }))
    }
  }, [shipmentId, open, container])

  const createMutation = useMutation({
    mutationFn: (data: any) => containersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      toast.success('Container created successfully!')
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create container')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => containersAPI.update(container.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      toast.success('Container updated successfully!')
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update container')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      ...formData,
      tare_weight: formData.tare_weight ? parseFloat(formData.tare_weight) : null,
      gross_weight: formData.gross_weight ? parseFloat(formData.gross_weight) : null,
    }

    if (container) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{container ? 'Edit Container' : 'Add Container'}</DialogTitle>
          <DialogDescription>
            {container ? 'Update the container details.' : 'Add a new container to a shipment.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {!shipmentId && !container && (
              <div className="col-span-2">
                <Label htmlFor="shipment_id">Shipment *</Label>
                <Select
                  value={formData.shipment_id}
                  onValueChange={(value) => setFormData({ ...formData, shipment_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {shipments?.map((shipment: any) => (
                      <SelectItem key={shipment.id} value={shipment.id}>
                        {shipment.shipment_number} - {shipment.from_location} → {shipment.to_location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="container_number">Container Number *</Label>
              <Input
                id="container_number"
                value={formData.container_number}
                onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                placeholder="MAEU1234567"
                required
              />
            </div>

            <div>
              <Label htmlFor="container_type">Container Type</Label>
              <Select
                value={formData.container_type}
                onValueChange={(value) => setFormData({ ...formData, container_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20ft Standard">20ft Standard</SelectItem>
                  <SelectItem value="40ft Standard">40ft Standard</SelectItem>
                  <SelectItem value="40ft High Cube">40ft High Cube</SelectItem>
                  <SelectItem value="45ft High Cube">45ft High Cube</SelectItem>
                  <SelectItem value="20ft Refrigerated">20ft Refrigerated</SelectItem>
                  <SelectItem value="40ft Refrigerated">40ft Refrigerated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tare_weight">Tare Weight (kg)</Label>
              <Input
                id="tare_weight"
                type="number"
                step="0.01"
                value={formData.tare_weight}
                onChange={(e) => setFormData({ ...formData, tare_weight: e.target.value })}
                placeholder="3800.00"
              />
            </div>

            <div>
              <Label htmlFor="gross_weight">Gross Weight (kg)</Label>
              <Input
                id="gross_weight"
                type="number"
                step="0.01"
                value={formData.gross_weight}
                onChange={(e) => setFormData({ ...formData, gross_weight: e.target.value })}
                placeholder="28000.00"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {container
                ? (updateMutation.isPending ? 'Updating...' : 'Update Container')
                : (createMutation.isPending ? 'Creating...' : 'Create Container')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
