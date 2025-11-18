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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'

interface ContainerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipmentId?: string
  container?: any
}

interface ContainerItem {
  id?: string
  name: string
  quantity: number
  unit: string
  cn_code: string
  eu_code: string
  shipment_id?: string
  shipment_number?: string
}

export function ContainerModal({ open, onOpenChange, shipmentId, container }: ContainerModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    container_number: '',
    container_type: 'None',
    tare_weight: '',
    gross_weight: '',
  })
  const [selectedShipments, setSelectedShipments] = useState<string[]>([])
  const [items, setItems] = useState<ContainerItem[]>([
    { name: '', quantity: 1, unit: 'Pallet', cn_code: '', eu_code: '' }
  ])

  // Fetch all shipments
  const { data: shipments } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsAPI.getAll(),
    enabled: open,
  })

  // Load linked shipments if editing
  const { data: linkedShipments } = useQuery({
    queryKey: ['container-shipments', container?.id],
    queryFn: () => containersAPI.getShipments(container?.id),
    enabled: !!container?.id && open,
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
        container_number: container.container_number || '',
        container_type: container.container_type || 'None',
        tare_weight: container.tare_weight?.toString() || '',
        gross_weight: container.gross_weight?.toString() || '',
      })
    } else if (open && !container) {
      // Reset form when opening for new container
      setFormData({
        container_number: '',
        container_type: 'None',
        tare_weight: '',
        gross_weight: '',
      })
      if (shipmentId) {
        setSelectedShipments([shipmentId])
        setItems([{ name: '', quantity: 1, unit: 'Pallet', cn_code: '', eu_code: '', shipment_id: shipmentId }])
      } else {
        setSelectedShipments([])
        setItems([])
      }
    }
  }, [shipmentId, open, container])

  useEffect(() => {
    if (linkedShipments && linkedShipments.length > 0) {
      setSelectedShipments(linkedShipments.map((s: any) => s.id))
    } else if (container && !linkedShipments) {
      setSelectedShipments([])
    }
  }, [linkedShipments, container])

  useEffect(() => {
    if (existingItems && existingItems.length > 0) {
      setItems(existingItems.map((item: any) => ({
        id: item.id,
        name: item.name || item.description || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'Pallet',
        cn_code: item.cn_code || '',
        eu_code: item.eu_code || '',
        shipment_id: item.shipment_id,
        shipment_number: item.shipment_number,
      })))
    } else if (container && existingItems && existingItems.length === 0) {
      setItems([])
    }
  }, [existingItems, container])

  const createMutation = useMutation({
    mutationFn: async (data: { containerData: any; shipments: string[]; items: ContainerItem[] }) => {
      // Create or update container (backend handles upsert by container_number)
      const createdContainer = await containersAPI.create(data.containerData)
      
      // Link shipments
      for (const shipmentId of data.shipments) {
        if (shipmentId) {
          try {
            await containersAPI.link(createdContainer.id, shipmentId)
          } catch (error: any) {
            // Ignore if already linked
            if (!error.message?.includes('already linked')) {
              throw error
            }
          }
        }
      }
      
      // Then add items if any
      if (data.items.length > 0 && data.items[0].name) {
        for (const item of data.items) {
          if (item.name.trim() && data.shipments[0]) {
            await containersAPI.addItem(createdContainer.id, {
              shipment_id: data.shipments[0],
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
      queryClient.invalidateQueries({ queryKey: ['container-shipments'] })
      toast.success('Container saved successfully!')
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save container')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: { containerData: any; shipments: string[]; items: ContainerItem[] }) => {
      // Update container info
      await containersAPI.update(container.id, data.containerData)
      
      // Update shipments
      const currentShipmentIds = linkedShipments?.map((s: any) => s.id) || []
      const newShipmentIds = data.shipments
      
      // Unlink removed shipments
      for (const shipmentId of currentShipmentIds) {
        if (!newShipmentIds.includes(shipmentId)) {
          await containersAPI.unlink(container.id, shipmentId)
        }
      }
      
      // Link new shipments
      for (const shipmentId of newShipmentIds) {
        if (!currentShipmentIds.includes(shipmentId)) {
          try {
            await containersAPI.link(container.id, shipmentId)
          } catch (error: any) {
            // Ignore if already linked
            if (!error.message?.includes('already linked')) {
              throw error
            }
          }
        }
      }
      
      // Update items
      const currentItemIds = existingItems?.map((item: any) => item.id) || []
      const newItemIds = data.items.filter(item => item.id).map(item => item.id!)
      
      // Delete removed items
      for (const itemId of currentItemIds) {
        if (!newItemIds.includes(itemId)) {
          await containersAPI.deleteItem(itemId)
        }
      }
      
      // Add new items and update existing ones
      for (const item of data.items) {
        if (item.name.trim()) {
          if (item.id) {
            // Update existing item
            await containersAPI.updateItem(item.id, {
              description: item.name,
              quantity: item.quantity,
              unit: item.unit,
              cn_code: item.cn_code || undefined,
              eu_code: item.eu_code || undefined,
            })
          } else {
            // Add new item (use first selected shipment)
            if (data.shipments[0]) {
              await containersAPI.addItem(container.id, {
                shipment_id: data.shipments[0],
                description: item.name,
                quantity: item.quantity,
                unit: item.unit,
                cn_code: item.cn_code || undefined,
                eu_code: item.eu_code || undefined,
              })
            }
          }
        }
      }
      
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['container-items'] })
      queryClient.invalidateQueries({ queryKey: ['container-shipments'] })
      toast.success('Container updated successfully!')
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update container')
    },
  })


  const addItem = (targetShipmentId?: string) => {
    const shipmentIdToUse = targetShipmentId || (shipmentId ? shipmentId : selectedShipments[0] || 'new')
    setItems([...items, { 
      name: '', 
      quantity: 1, 
      unit: 'Pallet', 
      cn_code: '', 
      eu_code: '',
      shipment_id: shipmentIdToUse
    }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ContainerItem, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const toggleShipment = (shipmentId: string) => {
    if (selectedShipments.includes(shipmentId)) {
      setSelectedShipments(selectedShipments.filter(id => id !== shipmentId))
    } else {
      setSelectedShipments([...selectedShipments, shipmentId])
    }
  }

  const deleteShipmentMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      // Unlink shipment
      await containersAPI.unlink(container.id, shipmentId)
      
      // Delete all items for this shipment in this container
      const itemsToDelete = existingItems?.filter((item: any) => item.shipment_id === shipmentId) || []
      for (const item of itemsToDelete) {
        await containersAPI.deleteItem(item.id)
      }
      
      return shipmentId
    },
    onSuccess: (deletedShipmentId) => {
      // Update local state immediately
      setSelectedShipments(selectedShipments.filter(id => id !== deletedShipmentId))
      setItems(items.filter(item => item.shipment_id !== deletedShipmentId))
      
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['container-items'] })
      queryClient.invalidateQueries({ queryKey: ['container-shipments'] })
      toast.success('Shipment unlinked and items deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete shipment')
    },
  })

  const handleDeleteShipment = (shipmentId: string, shipmentNumber: string) => {
    if (confirm(`Delete shipment "${shipmentNumber}"? This will unlink the shipment and delete all its items in this container.`)) {
      deleteShipmentMutation.mutate(shipmentId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.container_number) {
      toast.error('Container number is required')
      return
    }

    // Only require shipments selection if not adding from shipments page
    if (!shipmentId && selectedShipments.length === 0) {
      toast.error('At least one shipment must be selected')
      return
    }

    const containerData = {
      container_number: formData.container_number,
      container_type: formData.container_type,
      tare_weight: formData.tare_weight ? parseFloat(formData.tare_weight) : null,
      gross_weight: formData.gross_weight ? parseFloat(formData.gross_weight) : null,
    }

    // When adding from shipments page, use shipmentId
    const shipmentsToUse = shipmentId ? [shipmentId] : selectedShipments

    if (container) {
      updateMutation.mutate({ containerData, shipments: shipmentsToUse, items })
    } else {
      createMutation.mutate({ containerData, shipments: shipmentsToUse, items })
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
          {/* Container Information Section */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="text-lg font-semibold">Container Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="container_number">Container Number *</Label>
                <Input
                  id="container_number"
                  value={formData.container_number}
                  onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                  placeholder="MAEU1234567"
                  required
                  disabled={!!container}
                />
                {container && (
                  <p className="text-xs text-gray-500 mt-1">Container number cannot be changed</p>
                )}
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
                  <SelectItem value="None">
                    <div className="flex items-center space-x-2">
                      <span>None</span>
                      <span className="text-xs text-gray-500">- not using container</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="FCL-20GC">FCL-20GC</SelectItem>
                  <SelectItem value="FCL-40GC">FCL-40GC</SelectItem>
                  <SelectItem value="FCL-40HC">FCL-40HC</SelectItem>
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

          {/* Container Contents Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Container Contents</h3>
            
            {/* Shipment selection for create mode (when not from shipments page) */}
            {!container && !shipmentId && (
              <div className="space-y-4 border rounded-lg p-4">
                <Label className="text-base font-medium">Select Shipments *</Label>
                {shipments && shipments.length > 0 ? (
                  <div className="space-y-2">
                    {shipments.map((shipment: any) => (
                      <label
                        key={shipment.id}
                        className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedShipments.includes(shipment.id)}
                          onChange={() => toggleShipment(shipment.id)}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {shipment.shipment_number} - {shipment.order_code || 'N/A'}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No shipments available</p>
                )}
              </div>
            )}

            {/* Grouped by Shipments */}
            {container ? (
              // Edit mode: Show shipments with their items
              linkedShipments && linkedShipments.length > 0 ? (
                <div className="space-y-6">
                  {linkedShipments.map((shipment: any) => {
                    const shipmentItems = items.filter(item => item.shipment_id === shipment.id)
                    return (
                      <div key={shipment.id} className="border rounded-lg p-4 space-y-4">
                        {/* Shipment Header */}
                        <div className="flex items-center justify-between pb-3 border-b">
                          <h4 className="font-semibold text-base">{shipment.shipment_number}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteShipment(shipment.id, shipment.shipment_number)}
                            disabled={deleteShipmentMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>

                        {/* Items Table for this shipment */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Items</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addItem(shipment.id)}
                            >
                              <Plus className="w-4 h-4 mr-1" /> Add Item
                            </Button>
                          </div>

                          {shipmentItems.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name *</TableHead>
                                  <TableHead>Quantity *</TableHead>
                                  <TableHead>Unit *</TableHead>
                                  <TableHead>CN Code</TableHead>
                                  <TableHead>EU Code</TableHead>
                                  <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {shipmentItems.map((item, itemIndex) => {
                                  const globalIndex = items.findIndex(i => 
                                    (i.id && item.id && i.id === item.id) || 
                                    (!i.id && !item.id && i === item)
                                  )
                                  return (
                                    <TableRow key={item.id || itemIndex}>
                                      <TableCell>
                                        <Input
                                          value={item.name}
                                          onChange={(e) => updateItem(globalIndex, 'name', e.target.value)}
                                          placeholder="Item name"
                                          required
                                          className="w-full"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={item.quantity}
                                          onChange={(e) => updateItem(globalIndex, 'quantity', parseInt(e.target.value) || 1)}
                                          required
                                          className="w-full"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Select
                                          value={item.unit}
                                          onValueChange={(value) => updateItem(globalIndex, 'unit', value)}
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Pallet">Pallet</SelectItem>
                                            <SelectItem value="Box">Box</SelectItem>
                                            <SelectItem value="Piece">Piece</SelectItem>
                                            <SelectItem value="Roll">Roll</SelectItem>
                                            <SelectItem value="Package">Package</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={item.cn_code}
                                          onChange={(e) => updateItem(globalIndex, 'cn_code', e.target.value)}
                                          placeholder="8-10 digits"
                                          pattern="[0-9]{8,10}"
                                          maxLength={10}
                                          className="w-full"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={item.eu_code}
                                          onChange={(e) => updateItem(globalIndex, 'eu_code', e.target.value)}
                                          placeholder="8-10 digits"
                                          pattern="[0-9]{8,10}"
                                          maxLength={10}
                                          className="w-full"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeItem(globalIndex)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No items for this shipment. Click "Add Item" to add one.</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No shipments linked to this container</p>
              )
            ) : (
              // Create mode: Show items for selected shipments
              shipmentId || selectedShipments.length > 0 ? (
                <div className="space-y-6">
                  {(shipmentId ? [{ id: shipmentId }] : selectedShipments.map(id => ({ id }))).map((shipment: any) => {
                    const shipmentIdToUse = shipment.id
                    const shipmentInfo = shipments?.find((s: any) => s.id === shipmentIdToUse)
                    const shipmentItems = items.filter(item => 
                      item.shipment_id === shipmentIdToUse || 
                      (!item.shipment_id && shipmentIdToUse === (shipmentId || selectedShipments[0]))
                    )
                    return (
                      <div key={shipmentIdToUse} className="border rounded-lg p-4 space-y-4">
                        {/* Shipment Header */}
                        <div className="flex items-center justify-between pb-3 border-b">
                          <h4 className="font-semibold text-base">
                            {shipmentInfo?.shipment_number || `Shipment ${shipmentIdToUse}`}
                          </h4>
                        </div>

                        {/* Items Table for this shipment */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Items</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addItem(shipmentIdToUse)}
                            >
                              <Plus className="w-4 h-4 mr-1" /> Add Item
                            </Button>
                          </div>

                          {shipmentItems.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name *</TableHead>
                                  <TableHead>Quantity *</TableHead>
                                  <TableHead>Unit *</TableHead>
                                  <TableHead>CN Code</TableHead>
                                  <TableHead>EU Code</TableHead>
                                  <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {shipmentItems.map((item, itemIndex) => {
                                  const globalIndex = items.findIndex(i => i === item)
                                  return (
                                    <TableRow key={itemIndex}>
                                      <TableCell>
                                        <Input
                                          value={item.name}
                                          onChange={(e) => updateItem(globalIndex, 'name', e.target.value)}
                                          placeholder="Item name"
                                          required={itemIndex === 0}
                                          className="w-full"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={item.quantity}
                                          onChange={(e) => updateItem(globalIndex, 'quantity', parseInt(e.target.value) || 1)}
                                          required
                                          className="w-full"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Select
                                          value={item.unit}
                                          onValueChange={(value) => updateItem(globalIndex, 'unit', value)}
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Pallet">Pallet</SelectItem>
                                            <SelectItem value="Box">Box</SelectItem>
                                            <SelectItem value="Piece">Piece</SelectItem>
                                            <SelectItem value="Roll">Roll</SelectItem>
                                            <SelectItem value="Package">Package</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={item.cn_code}
                                          onChange={(e) => updateItem(globalIndex, 'cn_code', e.target.value)}
                                          placeholder="8-10 digits"
                                          pattern="[0-9]{8,10}"
                                          maxLength={10}
                                          className="w-full"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={item.eu_code}
                                          onChange={(e) => updateItem(globalIndex, 'eu_code', e.target.value)}
                                          placeholder="8-10 digits"
                                          pattern="[0-9]{8,10}"
                                          maxLength={10}
                                          className="w-full"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeItem(globalIndex)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No items for this shipment. Click "Add Item" to add one.</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Please select at least one shipment to add items</p>
              )
            )}
          </div>

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
