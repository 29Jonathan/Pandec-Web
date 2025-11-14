# User Relations Feature

## Overview
The User Relations feature allows users to create bidirectional relationships with other users in the system for business collaboration purposes.

## What It Does
- Users can connect with other users (clients, suppliers, partners, etc.)
- Relations are **bidirectional** - when User A adds User B, User B automatically has User A as a relation
- Users can view all their related users in one place
- Users can remove relations when needed

## How to Use

### Accessing the Page
1. Log in to your account
2. Click on **"Relations"** in the main navigation menu
3. The page shows two sections:
   - **Add User Relation** - Form to add new relations
   - **Your Related Users** - Table of current relations

### Adding a User Relation
1. Go to the Relations page
2. In the "Add User Relation" section:
   - Select a user from the dropdown (shows name, email, and role)
   - Click **"Add Relation"** button
3. The user will be added to your relations list
4. **Note:** The relation is bidirectional - the other user will also see you in their relations

### Removing a User Relation
1. In the "Your Related Users" table, find the user you want to remove
2. Click the trash icon (🗑️) in the Actions column
3. Confirm the removal
4. **Note:** This removes the relation for both users (bidirectional)

### Viewing Related Users
The table shows:
- **Name** - Full name of the related user
- **Email** - Email address
- **Role** - User role (Admin, Shipper, Receiver, ForwardingAgent)
- **Phone** - Phone number (if available)
- **Actions** - Remove button

## Technical Details

### Backend API Endpoints
```
GET    /api/users/:id/relations          # Get user's relations
POST   /api/users/:id/relations          # Add a relation
DELETE /api/users/:id/relations/:related_user_id  # Remove a relation
```

### Database
- **Table:** `user_relations`
- **Trigger:** `user_relations_bidirectional` - Automatically creates reverse relationship
- **Columns:**
  - `id` - UUID primary key
  - `user_id` - Reference to users table
  - `related_user_id` - Reference to users table
  - `created_at` - Timestamp

### Frontend
- **Page:** `src/pages/UserRelations.tsx`
- **Route:** `/user-relations`
- **Navigation:** "Relations" tab in main menu

## Use Cases

1. **Shipper + Receiver**
   - Shippers can add their regular customers as relations
   - Makes it easier to create orders between known partners

2. **Forwarding Agent + Clients**
   - Forwarding agents can maintain a list of their clients
   - Quick access to client information

3. **Business Network**
   - Build a network of trusted business partners
   - Track who you regularly work with

## Business Logic

### Adding Relations
- Cannot add yourself as a relation
- Cannot add the same user twice
- Relation is created for both users automatically (via database trigger)
- Both users must exist in the system

### Removing Relations
- Removes the relation for both users (deletes both directions)
- Does not delete the user accounts
- Requires confirmation before removing

### Permissions
- Users can only manage their own relations
- Admins can manage relations for any user
- Users can only see their own relations (not system-wide)

## Future Enhancements

Potential improvements for this feature:
1. **Relation Types** - Categorize relations (Client, Supplier, Partner, etc.)
2. **Relation Notes** - Add notes about each relation
3. **Bulk Operations** - Add/remove multiple relations at once
4. **Search & Filter** - Search through relations by name, email, or role
5. **Relation History** - Track when relations were added/removed
6. **Pending Relations** - Require approval before establishing relation (like friend requests)
7. **Export Relations** - Download your relations list as CSV/PDF

## Testing the Feature

1. **Create two user accounts**:
   ```
   User A: alice@example.com (Shipper)
   User B: bob@example.com (Receiver)
   ```

2. **Log in as User A**:
   - Go to Relations page
   - Add User B as a relation

3. **Verify bidirectional**:
   - Log out and log in as User B
   - Go to Relations page
   - User A should appear in the list

4. **Test removal**:
   - As User B, remove User A
   - Log back in as User A
   - User B should no longer be in the list

## Troubleshooting

### "No available users to add"
- All other users are already in your relations
- You're the only user in the system
- Create more users via the Signup page

### "Failed to add user relation"
- The user might have been deleted
- Database connection issue
- Check browser console for error details

### Relation not appearing
- Refresh the page
- Check database triggers are properly set up
- Verify the `user_relations_bidirectional` trigger exists
