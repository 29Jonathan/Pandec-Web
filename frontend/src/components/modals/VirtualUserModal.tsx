import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface VirtualUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VirtualUserModal({ open, onOpenChange }: VirtualUserModalProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [eoriNumber, setEoriNumber] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Shipper')

  const resetForm = () => {
    setName('')
    setCompanyName('')
    setVatNumber('')
    setEoriNumber('')
    setAddress1('')
    setAddress2('')
    setCountry('')
    setPhone('')
    setEmail('')
    setRole('Shipper')
  }

  const createVirtualUserMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('Not authenticated')

      return usersAPI.addVirtualRelation(user.id, {
        name,
        company_name: companyName || undefined,
        vat_number: vatNumber || undefined,
        eori_number: eoriNumber || undefined,
        address1: address1 || undefined,
        address2: address2 || undefined,
        country: country || undefined,
        phone,
        email,
        role,
      })
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['user-relations', user.id] })
      }
      toast.success('Virtual user created and added to your relations!')
      resetForm()
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create virtual user')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !email || !phone || !role) {
      toast.error('Name, email, phone, and role are required')
      return
    }

    createVirtualUserMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Virtual User</DialogTitle>
          <DialogDescription>
            Create a virtual user (contact) that will be added directly to your related users.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vu-name">Name *</Label>
            <Input
              id="vu-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vu-email">Email *</Label>
            <Input
              id="vu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vu-phone">Phone *</Label>
            <Input
              id="vu-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vu-role">Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="vu-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Shipper">Shipper</SelectItem>
                <SelectItem value="Receiver">Receiver</SelectItem>
                <SelectItem value="ForwardingAgent">Forwarding Agent</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vu-company">Company Name</Label>
            <Input
              id="vu-company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vu-vat">VAT Number</Label>
            <Input
              id="vu-vat"
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="GB123456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vu-eori">EORI Number</Label>
            <Input
              id="vu-eori"
              type="text"
              value={eoriNumber}
              onChange={(e) => setEoriNumber(e.target.value)}
              placeholder="GB123456789000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vu-address1">Address 1</Label>
            <Input
              id="vu-address1"
              type="text"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              placeholder="Street address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vu-address2">Address 2</Label>
            <Input
              id="vu-address2"
              type="text"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
              placeholder="Postal code and city"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vu-country">Country</Label>
            <Input
              id="vu-country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Country"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
              disabled={createVirtualUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createVirtualUserMutation.isPending}>
              {createVirtualUserMutation.isPending ? 'Creating...' : 'Create Virtual User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
