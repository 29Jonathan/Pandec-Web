import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { shipmentsAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShipmentModal } from '@/components/modals/ShipmentModal'
import { ExternalLink, Pencil, Search, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'

type SortField = 'order_code' | 'load_date' | 'departure_date' | 'arrival_date'
type SortDirection = 'asc' | 'desc'

export function Shipments() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingShipment, setEditingShipment] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('order_code')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsAPI.getAll(),
  })
  
  const isAdmin = user?.user_metadata?.role === 'Admin'
  
  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filter and sort shipments
  const filteredAndSortedShipments = useMemo(() => {
    if (!shipments) return []
    
    // Filter by search query
    let filtered = shipments
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = shipments.filter((shipment: any) => 
        shipment.shipment_number?.toLowerCase().includes(query) ||
        shipment.order_code?.toLowerCase().includes(query)
      )
    }
    
    // Sort
    const sorted = [...filtered].sort((a: any, b: any) => {
      let aVal: any
      let bVal: any
      
      switch (sortField) {
        case 'order_code':
          aVal = a.order_code || ''
          bVal = b.order_code || ''
          break
        case 'load_date':
          aVal = a.load_date ? new Date(a.load_date).getTime() : 0
          bVal = b.load_date ? new Date(b.load_date).getTime() : 0
          break
        case 'departure_date':
          aVal = a.departure_date ? new Date(a.departure_date).getTime() : 0
          bVal = b.departure_date ? new Date(b.departure_date).getTime() : 0
          break
        case 'arrival_date':
          aVal = a.arrival_date ? new Date(a.arrival_date).getTime() : 0
          bVal = b.arrival_date ? new Date(b.arrival_date).getTime() : 0
          break
        default:
          return 0
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    
    return sorted
  }, [shipments, searchQuery, sortField, sortDirection])

  const handleEdit = (shipment: any) => {
    setEditingShipment(shipment)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingShipment(null)
  }
  
  const updateShipmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      shipmentsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      toast.success('Shipment status updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update shipment status')
    },
  })
  
  const handleStatusChange = (shipmentId: string, newStatus: string) => {
    updateShipmentMutation.mutate({ id: shipmentId, data: { status: newStatus } })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shipments</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Shipments</CardTitle>
          <CardDescription>Track and manage your shipments</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by shipment number or order code..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : filteredAndSortedShipments && filteredAndSortedShipments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment Number</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => handleSort('order_code')}
                    >
                      Order Code
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => handleSort('load_date')}
                    >
                      Load Date
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => handleSort('departure_date')}
                    >
                      Departure Date
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => handleSort('arrival_date')}
                    >
                      Arrival Date
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Tracking Link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedShipments.map((shipment: any) => (
                  <TableRow 
                    key={shipment.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/shipments/${shipment.shipment_number}`)}
                  >
                    <TableCell className="font-medium">{shipment.shipment_number}</TableCell>
                    <TableCell>{shipment.order_code || 'N/A'}</TableCell>
                    <TableCell>{shipment.load_date ? new Date(shipment.load_date).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>{shipment.departure_date ? new Date(shipment.departure_date).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>{shipment.arrival_date ? new Date(shipment.arrival_date).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {shipment.tracking_link ? (
                        <a 
                          href={shipment.tracking_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center"
                        >
                          Track <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {isAdmin ? (
                        <Select
                          value={shipment.status}
                          onValueChange={(value) => handleStatusChange(shipment.id, value)}
                          disabled={updateShipmentMutation.isPending}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="InPlanning">In planning</SelectItem>
                            <SelectItem value="SpaceBooked">Space booked</SelectItem>
                            <SelectItem value="SpaceCanceled">Space canceled</SelectItem>
                            <SelectItem value="Loaded">Loaded</SelectItem>
                            <SelectItem value="ArrivedAtDeparturePort">Arrived at departure port</SelectItem>
                            <SelectItem value="InTransit">In transit</SelectItem>
                            <SelectItem value="ArrivedAtDestinationPort">Arrived at destination port</SelectItem>
                            <SelectItem value="PreparingForOnCarriage">Preparing for on-carriage</SelectItem>
                            <SelectItem value="InCustomsClearanceAndDelivery">In customs clearance & delivery</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="ContainerBeingReturned">Container being returned</SelectItem>
                            <SelectItem value="ReturnCompleted">Return completed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                          shipment.status === 'InPlanning' ? 'bg-gray-100 text-gray-800' :
                          shipment.status === 'SpaceBooked' ? 'bg-blue-100 text-blue-800' :
                          shipment.status === 'SpaceCanceled' ? 'bg-red-100 text-red-800' :
                          shipment.status === 'Loaded' ? 'bg-purple-100 text-purple-800' :
                          shipment.status === 'ArrivedAtDeparturePort' ? 'bg-indigo-100 text-indigo-800' :
                          shipment.status === 'InTransit' ? 'bg-blue-100 text-blue-800' :
                          shipment.status === 'ArrivedAtDestinationPort' ? 'bg-cyan-100 text-cyan-800' :
                          shipment.status === 'PreparingForOnCarriage' ? 'bg-teal-100 text-teal-800' :
                          shipment.status === 'InCustomsClearanceAndDelivery' ? 'bg-yellow-100 text-yellow-800' :
                          shipment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          shipment.status === 'ContainerBeingReturned' ? 'bg-orange-100 text-orange-800' :
                          shipment.status === 'ReturnCompleted' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {shipment.status === 'InPlanning' ? 'In planning' :
                           shipment.status === 'SpaceBooked' ? 'Space booked' :
                           shipment.status === 'SpaceCanceled' ? 'Space canceled' :
                           shipment.status === 'Loaded' ? 'Loaded' :
                           shipment.status === 'ArrivedAtDeparturePort' ? 'Arrived at departure port' :
                           shipment.status === 'InTransit' ? 'In transit' :
                           shipment.status === 'ArrivedAtDestinationPort' ? 'Arrived at destination port' :
                           shipment.status === 'PreparingForOnCarriage' ? 'Preparing for on-carriage' :
                           shipment.status === 'InCustomsClearanceAndDelivery' ? 'In customs clearance & delivery' :
                           shipment.status === 'Completed' ? 'Completed' :
                           shipment.status === 'ContainerBeingReturned' ? 'Container being returned' :
                           shipment.status === 'ReturnCompleted' ? 'Return completed' :
                           shipment.status}
                        </span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(shipment)}
                            title="Edit shipment"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500">No shipments found</p>
          )}
        </CardContent>
      </Card>

      <ShipmentModal 
        open={modalOpen} 
        onOpenChange={handleCloseModal}
        shipment={editingShipment}
      />
    </div>
  )
}
