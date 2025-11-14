import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ordersAPI } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { OrderModal } from '@/components/modals/OrderModal'
import { Plus, Pencil } from 'lucide-react'

export function Orders() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<any>(null)
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersAPI.getAll(),
  })

  const handleEdit = (order: any) => {
    setEditingOrder(order)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingOrder(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>Manage your shipment orders</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : orders && orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Code</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Goods</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Incoterm</TableHead>
                  <TableHead>Load Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_code}</TableCell>
                    <TableCell className="text-sm">
                      <div>{order.from_port} →</div>
                      <div>{order.to_port}</div>
                      <div className="text-xs text-gray-500">{order.delivery_type}</div>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate" title={order.goods_description}>
                      {order.goods_description || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.cargo && Array.isArray(order.cargo) && order.cargo.length > 0 ? (
                        <div className="space-y-0.5">
                          {order.cargo.map((item: any, idx: number) => (
                            <div key={idx} className="text-xs">
                              {item.cargo_quantity}× {item.cargo_unit}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No cargo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono">{order.incoterm}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.load_date ? new Date(order.load_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'Offered' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(order)}
                        title="Edit order"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500">No orders found</p>
          )}
        </CardContent>
      </Card>

      <OrderModal 
        open={modalOpen} 
        onOpenChange={handleCloseModal}
        order={editingOrder}
      />
    </div>
  )
}
