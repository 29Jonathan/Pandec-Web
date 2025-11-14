import { Router } from 'express';
import { pool } from '../config/database';
import { AuthRequest, requireAdmin } from '../middleware/auth';
import { canAccessOffer, buildOffersFilter } from '../middleware/permissions';

const router = Router();

// Get all offers with filtering
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { order_id, status } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    let query = `
      SELECT 
        off.*,
        o.order_code,
        o.from_port,
        o.to_port
      FROM offers off
      LEFT JOIN orders o ON off.order_id = o.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    // Apply permissions filter
    const permFilter = buildOffersFilter(userId, userRole);
    if (permFilter.query) {
      query += ` AND ${permFilter.query}`;
      params.push(...permFilter.params);
      paramIndex += permFilter.params.length;
    }
    
    if (order_id) {
      query += ` AND off.order_id = $${paramIndex}`;
      params.push(order_id);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND off.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ' ORDER BY off.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Get offer by ID
router.get('/:id', canAccessOffer, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        off.*,
        o.order_code,
        o.from_port,
        o.to_port,
        o.sender_id,
        o.receiver_id
       FROM offers off
       LEFT JOIN orders o ON off.order_id = o.id
       WHERE off.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching offer:', error);
    res.status(500).json({ error: 'Failed to fetch offer' });
  }
});

// Create new offer (admin only)
router.post('/', requireAdmin, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      order_id,
      carrier_company,
      freight_cost,
      port_surcharge,
      trucking_fee,
      custom_clearance,
      currency
    } = req.body;
    
    if (!order_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'order_id is required' });
    }
    
    // Create offer
    const offerResult = await client.query(
      `INSERT INTO offers (
        order_id, carrier_company, freight_cost, port_surcharge,
        trucking_fee, custom_clearance, currency
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [order_id, carrier_company, freight_cost, port_surcharge, trucking_fee, custom_clearance, currency || 'EUR']
    );
    
    // Update order status to 'Offered'
    await client.query(
      "UPDATE orders SET status = 'Offered' WHERE id = $1",
      [order_id]
    );
    
    await client.query('COMMIT');
    res.status(201).json(offerResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating offer:', error);
    if (error.code === '23503') {
      res.status(400).json({ error: 'Invalid order ID' });
    } else {
      res.status(500).json({ error: 'Failed to create offer' });
    }
  } finally {
    client.release();
  }
});

// Update offer (admin only)
router.put('/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      carrier_company,
      freight_cost,
      port_surcharge,
      trucking_fee,
      custom_clearance,
      currency
    } = req.body;
    
    const result = await pool.query(
      `UPDATE offers SET
        carrier_company = $1, freight_cost = $2, port_surcharge = $3,
        trucking_fee = $4, custom_clearance = $5, currency = $6
      WHERE id = $7
      RETURNING *`,
      [carrier_company, freight_cost, port_surcharge, trucking_fee, custom_clearance, currency, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating offer:', error);
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

// Delete offer (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM offers WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ error: 'Failed to delete offer' });
  }
});

// Accept or reject offer
router.post('/:id/status', canAccessOffer, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    
    if (!action || !['accept', 'reject'].includes(action)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid action. Must be "accept" or "reject"' });
    }
    
    if (action === 'accept') {
      // Update offer to Accepted
      const offerResult = await client.query(
        "UPDATE offers SET status = 'Accepted' WHERE id = $1 AND status = 'Pending' RETURNING order_id",
        [id]
      );
      
      if (offerResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Offer not found or already processed' });
      }
      
      const order_id = offerResult.rows[0].order_id;
      
      // Trigger will auto-create shipment and update order status
      
      // Delete other pending offers for the same order
      await client.query(
        "DELETE FROM offers WHERE order_id = $1 AND id != $2",
        [order_id, id]
      );
      
      // Get the created shipment
      const shipmentResult = await client.query(
        'SELECT * FROM shipments WHERE offer_id = $1',
        [id]
      );
      
      await client.query('COMMIT');
      res.json({
        message: 'Offer accepted successfully',
        shipment: shipmentResult.rows[0] || null
      });
      
    } else if (action === 'reject') {
      // Update offer to Rejected
      const offerResult = await client.query(
        "UPDATE offers SET status = 'Rejected' WHERE id = $1 AND status = 'Pending' RETURNING order_id",
        [id]
      );
      
      if (offerResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Offer not found or already processed' });
      }
      
      const order_id = offerResult.rows[0].order_id;
      
      // Update order status back to Pending
      await client.query(
        "UPDATE orders SET status = 'Pending' WHERE id = $1",
        [order_id]
      );
      
      await client.query('COMMIT');
      res.json({ message: 'Offer rejected successfully' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing offer status:', error);
    res.status(500).json({ error: 'Failed to process offer status' });
  } finally {
    client.release();
  }
});

export default router;
