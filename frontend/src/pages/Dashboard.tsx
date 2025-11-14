import { useQuery } from '@tanstack/react-query'
import { ordersAPI, shipmentsAPI } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, Truck, DollarSign } from 'lucide-react'

export function Dashboard() {
  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersAPI.getAll(),
  })

  const { data: shipments } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsAPI.getAll(),
  })

  const stats = [
    {
      name: 'Total Orders',
      value: orders?.length || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
    },
    {
      name: 'Pending Orders',
      value: orders?.filter((o: any) => o.status === 'Pending').length || 0,
      icon: Package,
      color: 'text-yellow-600',
    },
    {
      name: 'Active Shipments',
      value: shipments?.filter((s: any) => s.status === 'InTransit').length || 0,
      icon: Truck,
      color: 'text-green-600',
    },
    {
      name: 'Completed',
      value: shipments?.filter((s: any) => s.status === 'Delivered').length || 0,
      icon: DollarSign,
      color: 'text-purple-600',
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.name}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest order requests</CardDescription>
          </CardHeader>
          <CardContent>
            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{order.from_location} → {order.to_location}</p>
                      <p className="text-sm text-gray-600">{order.from_user_name}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'Offered' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No orders available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Shipments</CardTitle>
            <CardDescription>Currently in transit</CardDescription>
          </CardHeader>
          <CardContent>
            {shipments && shipments.length > 0 ? (
              <div className="space-y-4">
                {shipments.slice(0, 5).map((shipment: any) => (
                  <div key={shipment.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{shipment.shipment_number}</p>
                      <p className="text-sm text-gray-600">{shipment.from_location} → {shipment.to_location}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      shipment.status === 'Scheduled' ? 'bg-gray-100 text-gray-800' :
                      shipment.status === 'InTransit' ? 'bg-blue-100 text-blue-800' :
                      shipment.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {shipment.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No active shipments</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
