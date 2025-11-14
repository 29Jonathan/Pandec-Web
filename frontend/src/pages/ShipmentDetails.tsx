import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { shipmentsAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink, Package, Truck, Calendar, MapPin } from 'lucide-react'

export function ShipmentDetails() {
  const { shipmentNumber } = useParams<{ shipmentNumber: string }>()
  const navigate = useNavigate()

  // Fetch all shipments and find by shipment_number
  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsAPI.getAll(),
  })

  const shipment = shipments?.find((s: any) => s.shipment_number === shipmentNumber)

  // Fetch detailed shipment data if we have the ID
  const { data: shipmentDetails } = useQuery({
    queryKey: ['shipment', shipment?.id],
    queryFn: () => shipmentsAPI.getById(shipment.id),
    enabled: !!shipment?.id,
  })

  const data = shipmentDetails || shipment

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'InPlanning': 'In planning',
      'SpaceBooked': 'Space booked',
      'SpaceCanceled': 'Space canceled',
      'Loaded': 'Loaded',
      'ArrivedAtDeparturePort': 'Arrived at departure port',
      'InTransit': 'In transit',
      'ArrivedAtDestinationPort': 'Arrived at destination port',
      'PreparingForOnCarriage': 'Preparing for on-carriage',
      'InCustomsClearanceAndDelivery': 'In customs clearance & delivery',
      'Completed': 'Completed',
      'ContainerBeingReturned': 'Container being returned',
      'ReturnCompleted': 'Return completed',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    if (status === 'InPlanning') return 'bg-gray-100 text-gray-800'
    if (status === 'SpaceBooked') return 'bg-blue-100 text-blue-800'
    if (status === 'SpaceCanceled') return 'bg-red-100 text-red-800'
    if (status === 'Loaded') return 'bg-purple-100 text-purple-800'
    if (status === 'ArrivedAtDeparturePort') return 'bg-indigo-100 text-indigo-800'
    if (status === 'InTransit') return 'bg-blue-100 text-blue-800'
    if (status === 'ArrivedAtDestinationPort') return 'bg-cyan-100 text-cyan-800'
    if (status === 'PreparingForOnCarriage') return 'bg-teal-100 text-teal-800'
    if (status === 'InCustomsClearanceAndDelivery') return 'bg-yellow-100 text-yellow-800'
    if (status === 'Completed') return 'bg-green-100 text-green-800'
    if (status === 'ContainerBeingReturned') return 'bg-orange-100 text-orange-800'
    if (status === 'ReturnCompleted') return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading shipment details...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">Shipment not found</p>
        <Button onClick={() => navigate('/shipments')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shipments
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/shipments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{data.shipment_number}</h1>
          </div>
        </div>
        <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(data.status)}`}>
          {formatStatus(data.status)}
        </span>
      </div>

      {/* Shipment Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Shipment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Shipment Number</p>
            <p className="font-medium">{data.shipment_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Order Code</p>
            <p className="font-medium">{data.order_code || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Sender</p>
            <p className="font-medium">{data.sender_name || 'N/A'}</p>
            {data.sender_company && (
              <p className="text-sm text-gray-600">{data.sender_company}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Receiver</p>
            <p className="font-medium">{data.receiver_name || 'N/A'}</p>
            {data.receiver_company && (
              <p className="text-sm text-gray-600">{data.receiver_company}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transport Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Transport Info
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Route</p>
            <p className="font-medium flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {data.from_port || 'N/A'} → {data.to_port || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Carrier Company</p>
            <p className="font-medium">{data.carrier_company || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Delivery Type</p>
            <p className="font-medium">{data.delivery_type || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Incoterm</p>
            <p className="font-medium">{data.incoterm || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Load Date</p>
            <p className="font-medium">
              {data.load_date ? new Date(data.load_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Departure Date</p>
            <p className="font-medium">
              {data.departure_date ? new Date(data.departure_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Arrival Date</p>
            <p className="font-medium">
              {data.arrival_date ? new Date(data.arrival_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-sm text-gray-500 mb-2">Tracking Link</p>
            {data.tracking_link ? (
              <a
                href={data.tracking_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
              >
                {data.tracking_link}
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <p className="text-gray-500">No tracking link available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
