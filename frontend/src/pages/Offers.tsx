import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { offersAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { OfferModal } from '@/components/modals/OfferModal'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'

export function Offers() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<any>(null)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  const { data: offers, isLoading } = useQuery({
    queryKey: ['offers'],
    queryFn: () => offersAPI.getAll(),
  })
  
  const isAdmin = user?.user_metadata?.role === 'Admin'

  const handleEdit = (offer: any) => {
    setEditingOffer(offer)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingOffer(null)
  }
  
  const setStatusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'reject' }) => 
      offersAPI.setStatus(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      toast.success('Offer status updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update offer status')
    },
  })
  
  const handleAccept = (offerId: string) => {
    if (confirm('Accept this offer? This will create a shipment.')) {
      setStatusMutation.mutate({ id: offerId, action: 'accept' })
    }
  }
  
  const handleDecline = (offerId: string) => {
    if (confirm('Decline this offer?')) {
      setStatusMutation.mutate({ id: offerId, action: 'reject' })
    }
  }
  
  const calculateTotal = (offer: any) => {
    const freight = parseFloat(offer.freight_cost || 0)
    const surcharge = parseFloat(offer.port_surcharge || 0)
    const trucking = parseFloat(offer.trucking_fee || 0)
    const custom = parseFloat(offer.custom_clearance || 0)
    return (freight + surcharge + trucking + custom).toFixed(2)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Price Offers</h1>
        {isAdmin && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Offer
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Offers</CardTitle>
          <CardDescription>Manage price offers for orders</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : offers && offers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Code</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead className="text-right">Freight</TableHead>
                  <TableHead className="text-right">Port Surcharge</TableHead>
                  <TableHead className="text-right">Trucking Fee</TableHead>
                  <TableHead className="text-right">Custom</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer: any) => (
                  <TableRow key={offer.id}>
                    <TableCell className="font-medium">{offer.order_code}</TableCell>
                    <TableCell>{offer.carrier_company || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {offer.freight_cost ? parseFloat(offer.freight_cost).toFixed(2) : '0.00'}
                    </TableCell>
                    <TableCell className="text-right">
                      {offer.port_surcharge ? parseFloat(offer.port_surcharge).toFixed(2) : '0.00'}
                    </TableCell>
                    <TableCell className="text-right">
                      {offer.trucking_fee ? parseFloat(offer.trucking_fee).toFixed(2) : '0.00'}
                    </TableCell>
                    <TableCell className="text-right">
                      {offer.custom_clearance ? parseFloat(offer.custom_clearance).toFixed(2) : '0.00'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {calculateTotal(offer)} {offer.currency || 'EUR'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        offer.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        offer.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {offer.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {/* Admin can edit offers */}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(offer)}
                            title="Edit offer"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Users can accept/decline pending offers for their orders */}
                        {!isAdmin && offer.status === 'Pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleAccept(offer.id)}
                              disabled={setStatusMutation.isPending}
                              title="Accept offer"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDecline(offer.id)}
                              disabled={setStatusMutation.isPending}
                              title="Decline offer"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500">No offers found</p>
          )}
        </CardContent>
      </Card>

      <OfferModal 
        open={modalOpen} 
        onOpenChange={handleCloseModal}
        offer={editingOffer}
      />
    </div>
  )
}
