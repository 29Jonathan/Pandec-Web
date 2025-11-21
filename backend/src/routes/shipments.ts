import { Router } from 'express';
import { pool } from '../config/database';
import { AuthRequest, requireAdmin } from '../middleware/auth';
import { canAccessShipment, buildShipmentsFilter } from '../middleware/permissions';
import { sendShipmentStatusEmail } from '../services/email';

const router = Router();

// Get all shipments with filtering
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, order_id } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    let query = `
      SELECT 
        s.*,
        o.order_code,
        o.from_port,
        o.to_port,
        o.sender_id,
        o.receiver_id,
        o.load_date
      FROM shipments s
      LEFT JOIN orders o ON s.order_id = o.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    // Apply permissions filter
    const permFilter = buildShipmentsFilter(userId, userRole);
    if (permFilter.query) {
      query += ` AND ${permFilter.query}`;
      params.push(...permFilter.params);
      paramIndex += permFilter.params.length;
    }
    
    if (status) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (order_id) {
      query += ` AND s.order_id = $${paramIndex}`;
      params.push(order_id);
      paramIndex++;
    }
    
    query += ' ORDER BY s.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

// Get shipment by ID
router.get('/:id', canAccessShipment, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        s.*,
        o.order_code,
        o.from_port,
        o.to_port,
        o.sender_id,
        o.receiver_id,
        o.delivery_type,
        o.incoterm,
        o.load_date,
        sender.name as sender_name,
        sender.company_name as sender_company,
        receiver.name as receiver_name,
        receiver.company_name as receiver_company,
        off.carrier_company,
        off.freight_cost,
        off.currency
       FROM shipments s
       LEFT JOIN orders o ON s.order_id = o.id
       LEFT JOIN users sender ON o.sender_id = sender.id
       LEFT JOIN users receiver ON o.receiver_id = receiver.id
       LEFT JOIN offers off ON s.offer_id = off.id
       WHERE s.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching shipment:', error);
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
});

// Update shipment
router.put('/:id', canAccessShipment, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      shipment_number,
      tracking_link,
      departure_date,
      arrival_date,
      status
    } = req.body;
    
    // Convert empty strings to null for date fields
    const cleanedDepartureDate = departure_date === '' ? null : departure_date;
    const cleanedArrivalDate = arrival_date === '' ? null : arrival_date;
    const cleanedTrackingLink = tracking_link === '' ? null : tracking_link;
    
    const result = await pool.query(
      `UPDATE shipments SET
        shipment_number = COALESCE($1, shipment_number),
        tracking_link = COALESCE($2, tracking_link),
        departure_date = COALESCE($3, departure_date),
        arrival_date = COALESCE($4, arrival_date),
        status = COALESCE($5, status)
      WHERE id = $6
      RETURNING *`,
      [shipment_number, cleanedTrackingLink, cleanedDepartureDate, cleanedArrivalDate, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    const updatedShipment = result.rows[0];
    
    // Fire-and-forget emails to sender and receiver for specific status changes
    sendShipmentStatusEmail(updatedShipment.id).catch((err) => {
      console.error('Failed to send shipment status email', err);
    });
    
    res.json(updatedShipment);
  } catch (error: any) {
    console.error('Error updating shipment:', error);
    if (error.code === '23514') {
      res.status(400).json({ error: 'Invalid shipment status' });
    } else {
      res.status(500).json({ error: 'Failed to update shipment' });
    }
  }
});

// Delete shipment (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM shipments WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    res.json({ message: 'Shipment deleted successfully' });
  } catch (error) {
    console.error('Error deleting shipment:', error);
    res.status(500).json({ error: 'Failed to delete shipment' });
  }
});

// Get containers for a shipment
router.get('/:id/containers', canAccessShipment, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        c.*,
        sc.created_at as linked_at,
        COUNT(ci.id) as items_count
       FROM shipment_containers sc
       JOIN containers c ON sc.container_id = c.id
       LEFT JOIN container_items ci ON ci.container_id = c.id AND ci.shipment_id = $1
       WHERE sc.shipment_id = $1
       GROUP BY c.id, sc.created_at
       ORDER BY sc.created_at DESC`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shipment containers:', error);
    res.status(500).json({ error: 'Failed to fetch shipment containers' });
  }
});

export default router;
