import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { UserPlus, Trash2, Users as UsersIcon } from 'lucide-react'
import { toast } from 'sonner'

export function UserRelations() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState('')

  // Fetch current user's relations
  const { data: relations, isLoading: relationsLoading } = useQuery({
    queryKey: ['user-relations', user?.id],
    queryFn: () => usersAPI.getRelations(user!.id),
    enabled: !!user,
  })

  // Fetch all users for the dropdown
  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.getAll(),
  })

  // Add relation mutation
  const addRelationMutation = useMutation({
    mutationFn: (relatedUserId: string) => 
      usersAPI.addRelation(user!.id, relatedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-relations', user?.id] })
      toast.success('User relation added successfully!')
      setSelectedUserId('')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add user relation')
    },
  })

  // Remove relation mutation
  const removeRelationMutation = useMutation({
    mutationFn: (relatedUserId: string) => 
      usersAPI.removeRelation(user!.id, relatedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-relations', user?.id] })
      toast.success('User relation removed successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove user relation')
    },
  })

  const handleAddRelation = () => {
    if (!selectedUserId) {
      toast.error('Please select a user to add')
      return
    }

    if (selectedUserId === user?.id) {
      toast.error('You cannot add yourself as a relation')
      return
    }

    addRelationMutation.mutate(selectedUserId)
  }

  const handleRemoveRelation = (relatedUserId: string) => {
    if (confirm('Are you sure you want to remove this user relation?')) {
      removeRelationMutation.mutate(relatedUserId)
    }
  }

  // Filter out current user and already related users from dropdown
  const availableUsers = allUsers?.filter((u: any) => {
    if (u.id === user?.id) return false
    if (relations?.some((r: any) => r.id === u.id)) return false
    return true
  }) || []

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <UsersIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-gray-900">User Relations</h1>
      </div>

      {/* Add New Relation Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add User Relation</CardTitle>
          <CardDescription>
            Connect with other users to collaborate on orders and shipments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="user-select">Select User</Label>
              <Select 
                value={selectedUserId} 
                onValueChange={setSelectedUserId}
                disabled={usersLoading || availableUsers.length === 0}
              >
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Choose a user to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} - {u.email} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableUsers.length === 0 && !usersLoading && (
                <p className="text-sm text-gray-500 mt-1">
                  No available users to add
                </p>
              )}
            </div>
            <Button 
              onClick={handleAddRelation}
              disabled={!selectedUserId || addRelationMutation.isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {addRelationMutation.isPending ? 'Adding...' : 'Add Relation'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Related Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Related Users</CardTitle>
          <CardDescription>
            Users you are connected with for business collaboration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {relationsLoading ? (
            <p>Loading...</p>
          ) : relations && relations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relations.map((relation: any) => (
                  <TableRow key={relation.id}>
                    <TableCell className="font-medium">{relation.name}</TableCell>
                    <TableCell>{relation.email}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {relation.role}
                      </span>
                    </TableCell>
                    <TableCell>{relation.phone || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRelation(relation.id)}
                        disabled={removeRelationMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No user relations yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Add users above to start collaborating
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
