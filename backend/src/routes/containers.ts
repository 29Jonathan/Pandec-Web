import { Router } from 'express';
import { pool } from '../config/database';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

// Get all containers
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { shipment_id, container_number } = req.query;
    
    let query = `
      SELECT 
        c.*,
        string_agg(DISTINCT s.shipment_number, ', ') as shipment_numbers,
        COUNT(DISTINCT ci.id) as items_count
      FROM containers c
      LEFT JOIN shipment_containers sc ON c.id = sc.container_id
      LEFT JOIN shipments s ON sc.shipment_id = s.id
      LEFT JOIN container_items ci ON c.id = ci.container_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (shipment_id) {
      query += ` AND sc.shipment_id = $${paramIndex}`;
      params.push(shipment_id);
      paramIndex++;
    }
    
    if (container_number) {
      query += ` AND c.container_number ILIKE $${paramIndex}`;
      params.push(`%${container_number}%`);
      paramIndex++;
    }
    
    query += ' GROUP BY c.id ORDER BY c.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching containers:', error);
    res.status(500).json({ error: 'Failed to fetch containers' });
  }
});

// Get container by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        c.*,
        string_agg(DISTINCT s.shipment_number, ', ') as shipment_numbers
       FROM containers c
       LEFT JOIN shipment_containers sc ON c.id = sc.container_id
       LEFT JOIN shipments s ON sc.shipment_id = s.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Container not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching container:', error);
    res.status(500).json({ error: 'Failed to fetch container' });
  }
});

// Create new container
router.post('/', async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      container_number,
      container_type,
      tare_weight,
      gross_weight,
      shipment_id
    } = req.body;
    
    if (!container_number) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'container_number is required' });
    }
    
    // Create container
    const containerResult = await client.query(
      `INSERT INTO containers (container_number, container_type, tare_weight, gross_weight)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [container_number, container_type, tare_weight, gross_weight]
    );
    
    const container = containerResult.rows[0];
    
    // If shipment_id provided, link container to shipment
    if (shipment_id) {
      await client.query(
        'INSERT INTO shipment_containers (shipment_id, container_id) VALUES ($1, $2)',
        [shipment_id, container.id]
      );
    }
    
    await client.query('COMMIT');
    res.status(201).json(container);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating container:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Container number already exists' });
    } else if (error.code === '23503') {
      res.status(400).json({ error: 'Invalid shipment ID' });
    } else {
      res.status(500).json({ error: 'Failed to create container' });
    }
  } finally {
    client.release();
  }
});

// Update container
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      container_number,
      container_type,
      tare_weight,
      gross_weight
    } = req.body;
    
    const result = await pool.query(
      `UPDATE containers SET
        container_number = $1,
        container_type = $2,
        tare_weight = $3,
        gross_weight = $4
      WHERE id = $5
      RETURNING *`,
      [container_number, container_type, tare_weight, gross_weight, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Container not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating container:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Container number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update container' });
    }
  }
});

// Delete container (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM containers WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Container not found' });
    }
    
    res.json({ message: 'Container deleted successfully' });
  } catch (error) {
    console.error('Error deleting container:', error);
    res.status(500).json({ error: 'Failed to delete container' });
  }
});

// Link container to shipment
router.post('/:id/link', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { shipment_id } = req.body;
    
    if (!shipment_id) {
      return res.status(400).json({ error: 'shipment_id is required' });
    }
    
    await pool.query(
      'INSERT INTO shipment_containers (shipment_id, container_id) VALUES ($1, $2)',
      [shipment_id, id]
    );
    
    res.json({ message: 'Container linked to shipment successfully' });
  } catch (error: any) {
    console.error('Error linking container:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Container already linked to this shipment' });
    } else if (error.code === '23503') {
      res.status(400).json({ error: 'Invalid shipment or container ID' });
    } else {
      res.status(500).json({ error: 'Failed to link container' });
    }
  }
});

// Unlink container from shipment
router.post('/:id/unlink', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { shipment_id } = req.body;
    
    if (!shipment_id) {
      return res.status(400).json({ error: 'shipment_id is required' });
    }
    
    await pool.query(
      'DELETE FROM shipment_containers WHERE shipment_id = $1 AND container_id = $2',
      [shipment_id, id]
    );
    
    res.json({ message: 'Container unlinked from shipment successfully' });
  } catch (error) {
    console.error('Error unlinking container:', error);
    res.status(500).json({ error: 'Failed to unlink container' });
  }
});

// Get items for a container
router.get('/:id/items', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT ci.*, s.shipment_number
       FROM container_items ci
       LEFT JOIN shipments s ON ci.shipment_id = s.id
       WHERE ci.container_id = $1
       ORDER BY ci.created_at DESC`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching container items:', error);
    res.status(500).json({ error: 'Failed to fetch container items' });
  }
});

// Add item to container
router.post('/:id/items', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      shipment_id,
      description,
      quantity,
      unit,
      cn_code,
      eu_code
    } = req.body;
    
    if (!shipment_id || !description || !quantity || !unit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate CN/EU codes if provided
    const codeRegex = /^[0-9]{8,10}$/;
    if (cn_code && !codeRegex.test(cn_code)) {
      return res.status(400).json({ error: 'CN code must be 8-10 digits' });
    }
    if (eu_code && !codeRegex.test(eu_code)) {
      return res.status(400).json({ error: 'EU code must be 8-10 digits' });
    }
    
    const result = await pool.query(
      `INSERT INTO container_items (
        container_id, shipment_id, description, quantity, unit, cn_code, eu_code
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [id, shipment_id, description, quantity, unit, cn_code, eu_code]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error adding container item:', error);
    if (error.code === '23503') {
      res.status(400).json({ error: 'Invalid container or shipment ID' });
    } else if (error.code === '23514') {
      res.status(400).json({ error: 'Invalid unit or code format' });
    } else {
      res.status(500).json({ error: 'Failed to add container item' });
    }
  }
});

// Update container item
router.put('/items/:item_id', async (req: AuthRequest, res) => {
  try {
    const { item_id } = req.params;
    const {
      description,
      quantity,
      unit,
      cn_code,
      eu_code
    } = req.body;
    
    // Validate CN/EU codes if provided
    const codeRegex = /^[0-9]{8,10}$/;
    if (cn_code && !codeRegex.test(cn_code)) {
      return res.status(400).json({ error: 'CN code must be 8-10 digits' });
    }
    if (eu_code && !codeRegex.test(eu_code)) {
      return res.status(400).json({ error: 'EU code must be 8-10 digits' });
    }
    
    const result = await pool.query(
      `UPDATE container_items SET
        description = $1,
        quantity = $2,
        unit = $3,
        cn_code = $4,
        eu_code = $5
      WHERE id = $6
      RETURNING *`,
      [description, quantity, unit, cn_code, eu_code, item_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Container item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating container item:', error);
    if (error.code === '23514') {
      res.status(400).json({ error: 'Invalid unit or code format' });
    } else {
      res.status(500).json({ error: 'Failed to update container item' });
    }
  }
});

// Delete container item
router.delete('/items/:item_id', async (req: AuthRequest, res) => {
  try {
    const { item_id } = req.params;
    const result = await pool.query('DELETE FROM container_items WHERE id = $1 RETURNING id', [item_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Container item not found' });
    }
    
    res.json({ message: 'Container item deleted successfully' });
  } catch (error) {
    console.error('Error deleting container item:', error);
    res.status(500).json({ error: 'Failed to delete container item' });
  }
});

export default router;
