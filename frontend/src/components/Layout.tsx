import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Package, ShoppingCart, DollarSign, Truck, Container as ContainerIcon, LogOut, User, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Package },
    { name: 'Orders', href: '/orders', icon: ShoppingCart },
    { name: 'Offers', href: '/offers', icon: DollarSign },
    { name: 'Shipments', href: '/shipments', icon: Truck },
    { name: 'Containers', href: '/containers', icon: ContainerIcon },
    { name: 'Relations', href: '/user-relations', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-primary" />
              <span className="ml-2 text-2xl font-bold text-gray-900">Pandec</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/profile" 
                className="flex items-center hover:text-primary transition-colors cursor-pointer"
              >
                <User className="h-4 w-4 mr-2" />
                {user?.user_metadata?.name || user?.email}
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-700 hover:text-primary transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="mb-8">
          <div className="flex space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
