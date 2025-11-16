import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ordersAPI, usersAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'

interface OrderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: any
}

interface CargoItem {
  cargo_unit: string
  cargo_quantity: number
}

export function OrderModal({ open, onOpenChange, order }: OrderModalProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    sender_id: '',
    receiver_id: '',
    from_port: '',
    to_port: '',
    delivery_type: 'Sea',
    incoterm: 'FOB',
    goods_description: '',
    load_date: '',
  })
  
  const [cargoItems, setCargoItems] = useState<CargoItem[]>([
    { cargo_unit: 'Container', cargo_quantity: 1 }
  ])

  // Fetch user's relations (only show related users)
  const { data: relations, isLoading: relationsLoading } = useQuery({
    queryKey: ['user-relations', user?.id],
    queryFn: () => usersAPI.getRelations(user!.id),
    enabled: !!user,
  })

  useEffect(() => {
    if (open && user) {
      if (order) {
        // Editing mode
        setFormData({
          sender_id: order.sender_id,
          receiver_id: order.receiver_id,
          from_port: order.from_port,
          to_port: order.to_port,
          delivery_type: order.delivery_type || 'Sea',
          incoterm: order.incoterm || 'FOB',
          goods_description: order.goods_description || '',
          load_date: order.load_date ? order.load_date.split('T')[0] : '',
        })
        // Load cargo items from order
        if (order.cargo && Array.isArray(order.cargo) && order.cargo.length > 0) {
          setCargoItems(order.cargo.map((c: any) => ({
            cargo_unit: c.cargo_unit,
            cargo_quantity: c.cargo_quantity
          })))
        } else {
          setCargoItems([{ cargo_unit: 'Container', cargo_quantity: 1 }])
        }
      } else {
        // Create mode - default sender to current user
        setFormData({
          sender_id: user.id,
          receiver_id: '',
          from_port: '',
          to_port: '',
          delivery_type: 'Sea',
          incoterm: 'FOB',
          goods_description: '',
          load_date: '',
        })
        setCargoItems([{ cargo_unit: 'Container', cargo_quantity: 1 }])
      }
    }
  }, [open, user, order])

  const createMutation = useMutation({
    mutationFn: (data: any) => ordersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order created successfully!')
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create order')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => ordersAPI.update(order.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order updated successfully!')
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update order')
    },
  })

  const addCargoItem = () => {
    setCargoItems([...cargoItems, { cargo_unit: 'Container', cargo_quantity: 1 }])
  }

  const removeCargoItem = (index: number) => {
    if (cargoItems.length > 1) {
      setCargoItems(cargoItems.filter((_, i) => i !== index))
    }
  }

  const updateCargoItem = (index: number, field: keyof CargoItem, value: any) => {
    const updated = [...cargoItems]
    updated[index] = { ...updated[index], [field]: value }
    setCargoItems(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      ...formData,
      cargo: cargoItems
    }

    if (order) {
      updateMutation.mutate(submitData)
    } else {
      createMutation.mutate(submitData)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? 'Edit Order' : 'Create New Order'}</DialogTitle>
          <DialogDescription>
            {order ? 'Update the shipment order details.' : 'Create a new shipment order with goods.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sender_id">Sender * (You or Related User)</Label>
              <Select
                value={formData.sender_id}
                onValueChange={(value) => setFormData({ ...formData, sender_id: value })}
                disabled={relationsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sender" />
                </SelectTrigger>
                <SelectContent>
                  {/* Current user */}
                  <SelectItem value={user!.id}>
                    {user?.user_metadata?.name || user?.email} (You)
                  </SelectItem>
                  {/* Related users */}
                  {relations?.map((relation: any) => (
                    <SelectItem key={relation.id} value={relation.id}>
                      {relation.name} - {relation.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!relationsLoading && relations?.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No related users. Add relations first.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="receiver_id">Receiver * (Related User)</Label>
              <Select
                value={formData.receiver_id}
                onValueChange={(value) => setFormData({ ...formData, receiver_id: value })}
                disabled={relationsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select receiver" />
                </SelectTrigger>
                <SelectContent>
                  {/* Current user */}
                  {formData.sender_id !== user!.id && (
                    <SelectItem value={user!.id}>
                      {user?.user_metadata?.name || user?.email} (You)
                    </SelectItem>
                  )}
                  {/* Related users (excluding sender) */}
                  {relations?.filter((r: any) => r.id !== formData.sender_id).map((relation: any) => (
                    <SelectItem key={relation.id} value={relation.id}>
                      {relation.name} - {relation.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="from_port">From Port *</Label>
              <Input
                id="from_port"
                value={formData.from_port}
                onChange={(e) => setFormData({ ...formData, from_port: e.target.value })}
                placeholder="Shanghai Port"
                required
              />
            </div>

            <div>
              <Label htmlFor="to_port">To Port *</Label>
              <Input
                id="to_port"
                value={formData.to_port}
                onChange={(e) => setFormData({ ...formData, to_port: e.target.value })}
                placeholder="Los Angeles Port"
                required
              />
            </div>

            <div>
              <Label htmlFor="delivery_type">Delivery Type *</Label>
              <Select
                value={formData.delivery_type}
                onValueChange={(value) => setFormData({ ...formData, delivery_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sea">Sea</SelectItem>
                  <SelectItem value="Air">Air</SelectItem>
                  <SelectItem value="Land">Land</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="incoterm">Incoterm *</Label>
              <Select
                value={formData.incoterm}
                onValueChange={(value) => setFormData({ ...formData, incoterm: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXW">EXW - Ex Works</SelectItem>
                  <SelectItem value="FOB">FOB - Free On Board</SelectItem>
                  <SelectItem value="CIF">CIF - Cost, Insurance & Freight</SelectItem>
                  <SelectItem value="CFR">CFR - Cost and Freight</SelectItem>
                  <SelectItem value="DAP">DAP - Delivered at Place</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="load_date">Goods Load Date *</Label>
              <Input
                id="load_date"
                type="date"
                value={formData.load_date}
                onChange={(e) => setFormData({ ...formData, load_date: e.target.value })}
              />
            </div>
          </div>

          {/* Cargo Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Cargo Items *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCargoItem}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Cargo
              </Button>
            </div>

            {cargoItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {index === 0 && <Label className="text-xs">Cargo Unit</Label>}
                  <Select
                    value={item.cargo_unit}
                    onValueChange={(value) => updateCargoItem(index, 'cargo_unit', value)}
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

                <div className="col-span-5">
                  {index === 0 && <Label className="text-xs">Quantity</Label>}
                  <Input
                    type="number"
                    min="1"
                    value={item.cargo_quantity}
                    onChange={(e) => updateCargoItem(index, 'cargo_quantity', parseInt(e.target.value) || 1)}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCargoItem(index)}
                    disabled={cargoItems.length === 1}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Goods Description */}
          <div className="col-span-2">
            <Label htmlFor="goods_description">Goods General Description *</Label>
            <Textarea
              id="goods_description"
              value={formData.goods_description}
              onChange={(e) => setFormData({ ...formData, goods_description: e.target.value })}
              placeholder="Describe the goods being shipped (e.g., Electronics, Textiles, Machinery)..."
              rows={3}
              required
            />
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
              {order 
                ? (updateMutation.isPending ? 'Updating...' : 'Update Order')
                : (createMutation.isPending ? 'Creating...' : 'Create Order')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
