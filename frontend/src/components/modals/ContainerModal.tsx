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
import { Plus, Trash2 } from 'lucide-react'

interface ContainerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipmentId?: string
  container?: any
}

interface ContainerItem {
  name: string
  quantity: number
  unit: string
  cn_code: string
  eu_code: string
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
  const [items, setItems] = useState<ContainerItem[]>([
    { name: '', quantity: 1, unit: 'Container', cn_code: '', eu_code: '' }
  ])

  const { data: shipments } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsAPI.getAll(),
    enabled: !shipmentId,
  })

  // Load existing items if editing
  const { data: existingItems } = useQuery({
    queryKey: ['container-items', container?.id],
    queryFn: () => containersAPI.getItems(container?.id),
    enabled: !!container?.id && open,
  })

  useEffect(() => {
    if (container) {
      // Editing mode
      setFormData({
        shipment_id: shipmentId || container.shipment_id || '',
        container_number: container.container_number || '',
        container_type: container.container_type || '40ft Standard',
        tare_weight: container.tare_weight?.toString() || '',
        gross_weight: container.gross_weight?.toString() || '',
      })
    } else if (shipmentId) {
      setFormData((prev) => ({ ...prev, shipment_id: shipmentId }))
      // Reset items for new container
      setItems([{ name: '', quantity: 1, unit: 'Container', cn_code: '', eu_code: '' }])
    } else if (open && !container) {
      // Reset form when opening for new container
      setFormData({
        shipment_id: '',
        container_number: '',
        container_type: '40ft Standard',
        tare_weight: '',
        gross_weight: '',
      })
      setItems([{ name: '', quantity: 1, unit: 'Container', cn_code: '', eu_code: '' }])
    }
  }, [shipmentId, open, container])

  useEffect(() => {
    if (existingItems && existingItems.length > 0) {
      setItems(existingItems.map((item: any) => ({
        name: item.name || item.description || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'Container',
        cn_code: item.cn_code || '',
        eu_code: item.eu_code || '',
      })))
    }
  }, [existingItems])

  const createMutation = useMutation({
    mutationFn: async (data: { containerData: any; items: ContainerItem[] }) => {
      // Create or update container (backend handles upsert by container_number)
      const createdContainer = await containersAPI.create(data.containerData)
      
      // Then add items if any
      if (data.items.length > 0 && data.items[0].name) {
        for (const item of data.items) {
          if (item.name.trim()) {
            await containersAPI.addItem(createdContainer.id, {
              shipment_id: data.containerData.shipment_id,
              description: item.name,
              quantity: item.quantity,
              unit: item.unit,
              cn_code: item.cn_code || undefined,
              eu_code: item.eu_code || undefined,
            })
          }
        }
      }
      
      return createdContainer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['container-items'] })
      toast.success('Container saved successfully!')
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save container')
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

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, unit: 'Container', cn_code: '', eu_code: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof ContainerItem, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const containerData = {
      ...formData,
      tare_weight: formData.tare_weight ? parseFloat(formData.tare_weight) : null,
      gross_weight: formData.gross_weight ? parseFloat(formData.gross_weight) : null,
    }

    if (container) {
      updateMutation.mutate(containerData)
    } else {
      createMutation.mutate({ containerData, items })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{container ? 'Edit Container' : 'Add Container'}</DialogTitle>
          <DialogDescription>
            {container ? 'Update the container details.' : 'Add a new container to a shipment with items.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Container Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Container Details</h3>
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
                          {shipment.shipment_number} - {shipment.order_code || 'N/A'}
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
          </div>

          {/* Items Section */}
          {!container && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>

              <div className="space-y-4 border rounded-lg p-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="col-span-3">
                      {index === 0 && <Label className="text-xs mb-1">Name *</Label>}
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        placeholder="Item name"
                        required={index === 0}
                      />
                    </div>

                    <div className="col-span-2">
                      {index === 0 && <Label className="text-xs mb-1">Quantity *</Label>}
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      {index === 0 && <Label className="text-xs mb-1">Unit *</Label>}
                      <Select
                        value={item.unit}
                        onValueChange={(value) => updateItem(index, 'unit', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Container">Container</SelectItem>
                          <SelectItem value="Pallet">Pallet</SelectItem>
                          <SelectItem value="Box">Box</SelectItem>
                          <SelectItem value="Piece">Piece</SelectItem>
                          <SelectItem value="Roll">Roll</SelectItem>
                          <SelectItem value="Package">Package</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      {index === 0 && <Label className="text-xs mb-1">CN Code</Label>}
                      <Input
                        value={item.cn_code}
                        onChange={(e) => updateItem(index, 'cn_code', e.target.value)}
                        placeholder="8-10 digits"
                        pattern="[0-9]{8,10}"
                        maxLength={10}
                      />
                    </div>

                    <div className="col-span-2">
                      {index === 0 && <Label className="text-xs mb-1">EU Code</Label>}
                      <Input
                        value={item.eu_code}
                        onChange={(e) => updateItem(index, 'eu_code', e.target.value)}
                        placeholder="8-10 digits"
                        pattern="[0-9]{8,10}"
                        maxLength={10}
                      />
                    </div>

                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
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
                : (createMutation.isPending ? 'Saving...' : 'Save Container')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
