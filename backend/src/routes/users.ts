import { Router } from 'express';
import { pool } from '../config/database';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

// Get current user (me)
router.get('/me', async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json(req.user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get all users (admin only or for dropdowns)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { role, email, q } = req.query;
    let query = 'SELECT id, name, email, role, company_name, phone, address1, address2, country, vat_number, eori_number, created_at FROM users WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    
    if (email) {
      query += ` AND email ILIKE $${paramIndex}`;
      params.push(`%${email}%`);
      paramIndex++;
    }
    
    if (q) {
      query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${q}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Users can view their own profile or admin can view anyone
    if (req.user!.role !== 'Admin' && req.user!.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(
      'SELECT id, name, email, role, company_name, phone, address1, address2, country, vat_number, eori_number, created_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, role, company_name, phone, address1, address2, country, vat_number, eori_number } = req.body;
    
    // Users can update their own profile or admin can update anyone
    if (req.user!.role !== 'Admin' && req.user!.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Only admin can change role
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      fieldsToUpdate.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }
    
    if (role !== undefined && req.user!.role === 'Admin') {
      fieldsToUpdate.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }
    
    if (company_name !== undefined) {
      fieldsToUpdate.push(`company_name = $${paramIndex}`);
      params.push(company_name);
      paramIndex++;
    }
    
    if (phone !== undefined) {
      fieldsToUpdate.push(`phone = $${paramIndex}`);
      params.push(phone);
      paramIndex++;
    }
    
    if (address1 !== undefined) {
      fieldsToUpdate.push(`address1 = $${paramIndex}`);
      params.push(address1);
      paramIndex++;
    }
    
    if (address2 !== undefined) {
      fieldsToUpdate.push(`address2 = $${paramIndex}`);
      params.push(address2);
      paramIndex++;
    }
    
    if (country !== undefined) {
      fieldsToUpdate.push(`country = $${paramIndex}`);
      params.push(country);
      paramIndex++;
    }
    
    if (vat_number !== undefined) {
      fieldsToUpdate.push(`vat_number = $${paramIndex}`);
      params.push(vat_number);
      paramIndex++;
    }
    
    if (eori_number !== undefined) {
      fieldsToUpdate.push(`eori_number = $${paramIndex}`);
      params.push(eori_number);
      paramIndex++;
    }
    
    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(id);
    const query = `
      UPDATE users
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, role, company_name, phone, address1, address2, country, vat_number, eori_number, updated_at
    `;
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Sync user from Supabase Auth (upsert)
router.post('/sync', async (req: AuthRequest, res) => {
  try {
    const { name, email, phone, role, company_name, address1, address2, country, vat_number, eori_number } = req.body;
    const userId = req.authUserId;
    
    if (!userId || !email) {
      return res.status(400).json({ error: 'User ID and email are required' });
    }
    
    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    
    if (existing.rows.length > 0) {
      // Update existing user - only update fields that are provided
      const fieldsToUpdate: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      if (name) {
        fieldsToUpdate.push(`name = $${paramIndex}`);
        params.push(name);
        paramIndex++;
      }
      
      if (company_name) {
        fieldsToUpdate.push(`company_name = $${paramIndex}`);
        params.push(company_name);
        paramIndex++;
      }
      
      if (phone) {
        fieldsToUpdate.push(`phone = $${paramIndex}`);
        params.push(phone);
        paramIndex++;
      }
      
      if (address1) {
        fieldsToUpdate.push(`address1 = $${paramIndex}`);
        params.push(address1);
        paramIndex++;
      }
      
      if (address2 !== undefined) {
        fieldsToUpdate.push(`address2 = $${paramIndex}`);
        params.push(address2);
        paramIndex++;
      }
      
      if (country) {
        fieldsToUpdate.push(`country = $${paramIndex}`);
        params.push(country);
        paramIndex++;
      }
      
      if (vat_number) {
        fieldsToUpdate.push(`vat_number = $${paramIndex}`);
        params.push(vat_number);
        paramIndex++;
      }
      
      if (eori_number) {
        fieldsToUpdate.push(`eori_number = $${paramIndex}`);
        params.push(eori_number);
        paramIndex++;
      }
      
      if (role) {
        fieldsToUpdate.push(`role = $${paramIndex}`);
        params.push(role);
        paramIndex++;
      }
      
      if (fieldsToUpdate.length === 0) {
        // No fields to update, just return existing user
        const result = await pool.query(
          'SELECT id, name, email, role, company_name, phone, address1, address2, country, vat_number, eori_number, created_at, updated_at FROM users WHERE id = $1',
          [userId]
        );
        return res.json(result.rows[0]);
      }
      
      params.push(userId);
      const query = `
        UPDATE users
        SET ${fieldsToUpdate.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, email, role, company_name, phone, address1, address2, country, vat_number, eori_number, created_at, updated_at
      `;
      
      const result = await pool.query(query, params);
      return res.json(result.rows[0]);
    } else {
      // Insert new user - all required fields must be provided
      if (!company_name || !phone || !address1 || !country || !vat_number || !eori_number) {
        return res.status(400).json({ 
          error: 'Missing required fields: company_name, phone, address1, country, vat_number, and eori_number are required for new users' 
        });
      }
      
      const result = await pool.query(
        `INSERT INTO users (id, name, email, role, company_name, phone, address1, address2, country, vat_number, eori_number, password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, name, email, role, company_name, phone, address1, address2, country, vat_number, eori_number, created_at, updated_at`,
        [userId, name, email, role || 'Shipper', company_name, phone, address1, address2 || '', country, vat_number, eori_number, 'supabase-auth-managed']
      );
      return res.status(201).json(result.rows[0]);
    }
  } catch (error: any) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user', details: error.message });
  }
});

// Get user relations
router.get('/:id/relations', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Users can view their own relations or admin can view anyone's
    if (req.user!.role !== 'Admin' && req.user!.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone
       FROM user_relations ur
       JOIN users u ON ur.related_user_id = u.id
       WHERE ur.user_id = $1
       ORDER BY u.name`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user relations:', error);
    res.status(500).json({ error: 'Failed to fetch user relations' });
  }
});

// Add user relation
router.post('/:id/relations', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { related_user_id } = req.body;
    
    // Users can add their own relations or admin can add for anyone
    if (req.user!.role !== 'Admin' && req.user!.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!related_user_id) {
      return res.status(400).json({ error: 'related_user_id is required' });
    }
    
    if (id === related_user_id) {
      return res.status(400).json({ error: 'Cannot create relation with yourself' });
    }
    
    // Check if relation already exists
    const existing = await pool.query(
      'SELECT id FROM user_relations WHERE user_id = $1 AND related_user_id = $2',
      [id, related_user_id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Relation already exists' });
    }
    
    // Insert relation (trigger will create reverse)
    const result = await pool.query(
      'INSERT INTO user_relations (user_id, related_user_id) VALUES ($1, $2) RETURNING *',
      [id, related_user_id]
    );
    
    res.status(201).json({ message: 'Relation created successfully', relation: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating user relation:', error);
    if (error.code === '23503') {
      res.status(404).json({ error: 'Related user not found' });
    } else {
      res.status(500).json({ error: 'Failed to create user relation' });
    }
  }
});

// Delete user relation
router.delete('/:id/relations/:related_user_id', async (req: AuthRequest, res) => {
  try {
    const { id, related_user_id } = req.params;
    
    // Users can delete their own relations or admin can delete for anyone
    if (req.user!.role !== 'Admin' && req.user!.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete both directions
    await pool.query(
      'DELETE FROM user_relations WHERE (user_id = $1 AND related_user_id = $2) OR (user_id = $2 AND related_user_id = $1)',
      [id, related_user_id]
    );
    
    res.json({ message: 'Relation deleted successfully' });
  } catch (error) {
    console.error('Error deleting user relation:', error);
    res.status(500).json({ error: 'Failed to delete user relation' });
  }
});

export default router;
