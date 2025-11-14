import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { shipmentsAPI, offersAPI } from '@/lib/api'
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

interface ShipmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offerId?: string
  shipment?: any
}

export function ShipmentModal({ open, onOpenChange, offerId, shipment }: ShipmentModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    offer_id: offerId || '',
    shipment_number: '',
    tracking_link: '',
    departure_date: '',
    arrival_date: '',
  })

  const { data: offers } = useQuery({
    queryKey: ['offers', 'accepted'],
    queryFn: () => offersAPI.getAll({ status: 'Accepted' }),
    enabled: !offerId,
  })

  useEffect(() => {
    if (shipment) {
      // Editing mode
      setFormData({
        offer_id: shipment.offer_id || '',
        shipment_number: shipment.shipment_number || '',
        tracking_link: shipment.tracking_link || '',
        departure_date: shipment.departure_date ? shipment.departure_date.split('T')[0] : '',
        arrival_date: shipment.arrival_date ? shipment.arrival_date.split('T')[0] : '',
      })
    } else if (offerId) {
      setFormData((prev) => ({ ...prev, offer_id: offerId }))
    } else if (open && !offerId) {
      // Generate shipment number
      const number = `SHIP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
      setFormData((prev) => ({ ...prev, shipment_number: number }))
    }
  }, [offerId, open, shipment])

  // Shipments are auto-created by trigger, so we only need update
  // const createMutation = useMutation({
  //   mutationFn: (data: any) => shipmentsAPI.create(data),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['shipments'] })
  //     toast.success('Shipment created successfully!')
  //     onOpenChange(false)
  //   },
  //   onError: (error: any) => {
  //     toast.error(error.message || 'Failed to create shipment')
  //   },
  // })

  const updateMutation = useMutation({
    mutationFn: (data: any) => shipmentsAPI.update(shipment.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      toast.success('Shipment updated successfully!')
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update shipment')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (shipment) {
      updateMutation.mutate(formData)
    } else {
      toast.error('Shipments are auto-created when offers are accepted')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{shipment ? 'Edit Shipment' : 'Create Shipment'}</DialogTitle>
          <DialogDescription>
            {shipment ? 'Update the shipment details.' : 'Create a new shipment from an accepted offer.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!offerId && !shipment && (
            <div>
              <Label htmlFor="offer_id">Accepted Offer *</Label>
              <Select
                value={formData.offer_id}
                onValueChange={(value) => setFormData({ ...formData, offer_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select accepted offer" />
                </SelectTrigger>
                <SelectContent>
                  {offers?.map((offer: any) => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.from_location} → {offer.to_location} - {offer.price} {offer.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="shipment_number">Shipment Number *</Label>
            <Input
              id="shipment_number"
              value={formData.shipment_number}
              onChange={(e) => setFormData({ ...formData, shipment_number: e.target.value })}
              placeholder="SHIP-2025-001"
              required
            />
          </div>

          <div>
            <Label htmlFor="tracking_link">Tracking Link</Label>
            <Input
              id="tracking_link"
              type="url"
              value={formData.tracking_link}
              onChange={(e) => setFormData({ ...formData, tracking_link: e.target.value })}
              placeholder="https://tracking.example.com/..."
            />
          </div>

          <div>
            <Label htmlFor="departure_date">Departure Date</Label>
            <Input
              id="departure_date"
              type="date"
              value={formData.departure_date}
              onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="arrival_date">Arrival Date</Label>
            <Input
              id="arrival_date"
              type="date"
              value={formData.arrival_date}
              onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {shipment
                ? (updateMutation.isPending ? 'Updating...' : 'Update Shipment')
                : 'Create Shipment'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
