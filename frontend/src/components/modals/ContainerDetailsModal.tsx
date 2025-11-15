import { useQuery } from '@tanstack/react-query'
import { containersAPI } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ContainerDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  container: any
}

export function ContainerDetailsModal({ open, onOpenChange, container }: ContainerDetailsModalProps) {
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['container-items', container?.id],
    queryFn: () => containersAPI.getItems(container?.id),
    enabled: !!container?.id && open,
  })

  // Group items by shipment
  const itemsByShipment = items?.reduce((acc: any, item: any) => {
    const shipmentNumber = item.shipment_number || 'Unknown'
    if (!acc[shipmentNumber]) {
      acc[shipmentNumber] = []
    }
    acc[shipmentNumber].push(item)
    return acc
  }, {}) || {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Container Details</DialogTitle>
          <DialogDescription>
            Full details for container {container?.container_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Container Information */}
          <Card>
            <CardHeader>
              <CardTitle>Container Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Container Number</p>
                  <p className="text-base font-semibold text-gray-900">{container?.container_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Container Type</p>
                  <p className="text-base text-gray-900">{container?.container_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Tare Weight</p>
                  <p className="text-base text-gray-900">
                    {container?.tare_weight ? `${container.tare_weight} kg` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Gross Weight</p>
                  <p className="text-base text-gray-900">
                    {container?.gross_weight ? `${container.gross_weight} kg` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Container Contents */}
          <Card>
            <CardHeader>
              <CardTitle>Container Contents</CardTitle>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <p className="text-gray-500">Loading items...</p>
              ) : Object.keys(itemsByShipment).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(itemsByShipment).map(([shipmentNumber, shipmentItems]: [string, any]) => (
                    <div key={shipmentNumber} className="space-y-2">
                      <h4 className="font-semibold text-gray-900">Shipment: {shipmentNumber}</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>CN Code</TableHead>
                            <TableHead>EU Code</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shipmentItems.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.description || item.name || 'N/A'}
                              </TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell>{item.cn_code || 'N/A'}</TableCell>
                              <TableCell>{item.eu_code || 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No items found in this container</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

