import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { offersAPI, ordersAPI } from '@/lib/api'
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

interface OfferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId?: string
  offer?: any
}

export function OfferModal({ open, onOpenChange, orderId, offer }: OfferModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    order_id: orderId || '',
    carrier_company: '',
    freight_cost: '',
    port_surcharge: '',
    trucking_fee: '',
    custom_clearance: '',
    currency: 'EUR',
  })

  // Fetch orders with status Pending or Offered
  const { data: orders } = useQuery({
    queryKey: ['orders', 'pending-offered'],
    queryFn: async () => {
      const allOrders = await ordersAPI.getAll()
      return allOrders.filter((order: any) => 
        order.status === 'Pending' || order.status === 'Offered'
      )
    },
    enabled: !orderId && !offer,
  })

  useEffect(() => {
    if (offer) {
      // Editing mode - populate with existing offer data
      setFormData({
        order_id: offer.order_id,
        carrier_company: offer.carrier_company || '',
        freight_cost: offer.freight_cost?.toString() || '',
        port_surcharge: offer.port_surcharge?.toString() || '',
        trucking_fee: offer.trucking_fee?.toString() || '',
        custom_clearance: offer.custom_clearance?.toString() || '',
        currency: offer.currency || 'EUR',
      })
    } else if (orderId) {
      setFormData((prev) => ({ ...prev, order_id: orderId }))
    }
  }, [orderId, offer])

  const createMutation = useMutation({
    mutationFn: (data: any) => offersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Price offer created successfully!')
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create offer')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => offersAPI.update(offer.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Price offer updated successfully!')
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update offer')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      ...formData,
      freight_cost: formData.freight_cost ? parseFloat(formData.freight_cost) : null,
      port_surcharge: formData.port_surcharge ? parseFloat(formData.port_surcharge) : null,
      trucking_fee: formData.trucking_fee ? parseFloat(formData.trucking_fee) : null,
      custom_clearance: formData.custom_clearance ? parseFloat(formData.custom_clearance) : null,
    }

    if (offer) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{offer ? 'Edit Price Offer' : 'Create Price Offer'}</DialogTitle>
          <DialogDescription>
            {offer ? 'Update the price offer details.' : 'Create a price offer for an order.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {!orderId && !offer && (
              <div className="col-span-2">
                <Label htmlFor="order_id">Order * (Pending or Offered)</Label>
                <Select
                  value={formData.order_id}
                  onValueChange={(value) => setFormData({ ...formData, order_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select order" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders?.map((order: any) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_code} - {order.from_port} → {order.to_port} ({order.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {orders?.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No pending or offered orders available
                  </p>
                )}
              </div>
            )}

            <div className="col-span-2">
              <Label htmlFor="carrier_company">Carrier Company *</Label>
              <Select
                value={formData.carrier_company}
                onValueChange={(value) => setFormData({ ...formData, carrier_company: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cosco">Cosco</SelectItem>
                  <SelectItem value="Maersk">Maersk</SelectItem>
                  <SelectItem value="HPL">HPL</SelectItem>
                  <SelectItem value="MSC">MSC</SelectItem>
                  <SelectItem value="HMM24">HMM24</SelectItem>
                  <SelectItem value="EVERGREEN">EVERGREEN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="freight_cost">Freight Cost</Label>
              <Input
                id="freight_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.freight_cost}
                onChange={(e) => setFormData({ ...formData, freight_cost: e.target.value })}
                placeholder="3500.00"
              />
            </div>

            <div>
              <Label htmlFor="port_surcharge">Port Surcharge</Label>
              <Input
                id="port_surcharge"
                type="number"
                step="0.01"
                min="0"
                value={formData.port_surcharge}
                onChange={(e) => setFormData({ ...formData, port_surcharge: e.target.value })}
                placeholder="500.00"
              />
            </div>

            <div>
              <Label htmlFor="trucking_fee">Trucking Fee</Label>
              <Input
                id="trucking_fee"
                type="number"
                step="0.01"
                min="0"
                value={formData.trucking_fee}
                onChange={(e) => setFormData({ ...formData, trucking_fee: e.target.value })}
                placeholder="800.00"
              />
            </div>

            <div>
              <Label htmlFor="custom_clearance">Custom Clearance</Label>
              <Input
                id="custom_clearance"
                type="number"
                step="0.01"
                min="0"
                value={formData.custom_clearance}
                onChange={(e) => setFormData({ ...formData, custom_clearance: e.target.value })}
                placeholder="1200.00"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <div className="bg-gray-50 p-4 rounded-lg">
                <Label className="text-sm font-medium mb-2">Cost Breakdown</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Freight:</span>
                    <span className="font-medium">
                      {formData.freight_cost ? `${parseFloat(formData.freight_cost).toFixed(2)}` : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Port Surcharge:</span>
                    <span className="font-medium">
                      {formData.port_surcharge ? `${parseFloat(formData.port_surcharge).toFixed(2)}` : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trucking:</span>
                    <span className="font-medium">
                      {formData.trucking_fee ? `${parseFloat(formData.trucking_fee).toFixed(2)}` : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customs:</span>
                    <span className="font-medium">
                      {formData.custom_clearance ? `${parseFloat(formData.custom_clearance).toFixed(2)}` : '0.00'}
                    </span>
                  </div>
                  <div className="col-span-2 border-t pt-2 mt-2 flex justify-between">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg">
                      {(
                        (formData.freight_cost ? parseFloat(formData.freight_cost) : 0) +
                        (formData.port_surcharge ? parseFloat(formData.port_surcharge) : 0) +
                        (formData.trucking_fee ? parseFloat(formData.trucking_fee) : 0) +
                        (formData.custom_clearance ? parseFloat(formData.custom_clearance) : 0)
                      ).toFixed(2)} {formData.currency}
                    </span>
                  </div>
                </div>
              </div>
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
              {offer
                ? (updateMutation.isPending ? 'Updating...' : 'Update Offer')
                : (createMutation.isPending ? 'Creating...' : 'Create Offer')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
