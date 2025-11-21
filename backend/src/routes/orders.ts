import { Router } from 'express';
import { pool } from '../config/database';
import { AuthRequest, requireAdmin } from '../middleware/auth';
import { canAccessOrder, buildOrdersFilter } from '../middleware/permissions';
import { sendOrderCreatedEmail } from '../services/email';

const router = Router();

// Get all orders with filtering
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, sender_id, receiver_id, q } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    let query = `
      SELECT 
        o.*,
        sender.name as sender_name,
        receiver.name as receiver_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oc.id,
              'cargo_unit', oc.cargo_unit,
              'cargo_quantity', oc.cargo_quantity
            ) ORDER BY oc.created_at
          ) FILTER (WHERE oc.id IS NOT NULL),
          '[]'
        ) as cargo
      FROM orders o
      LEFT JOIN users sender ON o.sender_id = sender.id
      LEFT JOIN users receiver ON o.receiver_id = receiver.id
      LEFT JOIN order_cargo oc ON o.id = oc.order_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    // Apply permissions filter
    const permFilter = buildOrdersFilter(userId, userRole);
    if (permFilter.query) {
      query += ` AND ${permFilter.query}`;
      params.push(...permFilter.params);
      paramIndex += permFilter.params.length;
    }
    
    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (sender_id) {
      query += ` AND o.sender_id = $${paramIndex}`;
      params.push(sender_id);
      paramIndex++;
    }
    
    if (receiver_id) {
      query += ` AND o.receiver_id = $${paramIndex}`;
      params.push(receiver_id);
      paramIndex++;
    }
    
    if (q) {
      query += ` AND (o.order_code ILIKE $${paramIndex} OR o.from_port ILIKE $${paramIndex} OR o.to_port ILIKE $${paramIndex})`;
      params.push(`%${q}%`);
      paramIndex++;
    }
    
    query += ' GROUP BY o.id, sender.name, receiver.name ORDER BY o.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
router.get('/:id', canAccessOrder, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        o.*,
        sender.name as sender_name,
        sender.email as sender_email,
        receiver.name as receiver_name,
        receiver.email as receiver_email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oc.id,
              'cargo_unit', oc.cargo_unit,
              'cargo_quantity', oc.cargo_quantity
            ) ORDER BY oc.created_at
          ) FILTER (WHERE oc.id IS NOT NULL),
          '[]'
        ) as cargo
       FROM orders o
       LEFT JOIN users sender ON o.sender_id = sender.id
       LEFT JOIN users receiver ON o.receiver_id = receiver.id
       LEFT JOIN order_cargo oc ON o.id = oc.order_id
       WHERE o.id = $1
       GROUP BY o.id, sender.name, sender.email, receiver.name, receiver.email`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
router.post('/', async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    const {
      sender_id,
      receiver_id,
      from_port,
      to_port,
      goods_description,
      delivery_type,
      incoterm,
      cargo,
      load_date
    } = req.body;
    
    if (!sender_id || !receiver_id || !from_port || !to_port || !delivery_type || !incoterm) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    await client.query('BEGIN');
    
    // Create order (still keeping old fields for backward compatibility)
    const orderResult = await client.query(
      `INSERT INTO orders (
        sender_id, receiver_id, from_port, to_port, goods_description,
        delivery_type, incoterm, load_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        sender_id, receiver_id, from_port, to_port, goods_description,
        delivery_type, incoterm, load_date
      ]
    );
    
    const orderId = orderResult.rows[0].id;
    
    // Insert cargo items if provided
    if (cargo && Array.isArray(cargo) && cargo.length > 0) {
      for (const item of cargo) {
        if (!item.cargo_unit || !item.cargo_quantity) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Each cargo item must have cargo_unit and cargo_quantity' });
        }
        
        await client.query(
          `INSERT INTO order_cargo (order_id, cargo_unit, cargo_quantity)
           VALUES ($1, $2, $3)`,
          [orderId, item.cargo_unit, item.cargo_quantity]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Fire-and-forget email to admins about new order (do not block response)
    sendOrderCreatedEmail(orderId).catch((err) => {
      console.error('Failed to send order created email', err);
    });
    
    // Fetch the complete order with cargo
    const result = await pool.query(
      `SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oc.id,
              'cargo_unit', oc.cargo_unit,
              'cargo_quantity', oc.cargo_quantity
            ) ORDER BY oc.created_at
          ) FILTER (WHERE oc.id IS NOT NULL),
          '[]'
        ) as cargo
       FROM orders o
       LEFT JOIN order_cargo oc ON o.id = oc.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [orderId]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    if (error.code === '23503') {
      res.status(400).json({ error: 'Invalid sender or receiver ID' });
    } else if (error.code === '23514') {
      res.status(400).json({ error: 'Invalid enum value for delivery_type or incoterm' });
    } else {
      res.status(500).json({ error: 'Failed to create order' });
    }
  } finally {
    client.release();
  }
});

// Update order
router.put('/:id', canAccessOrder, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      sender_id,
      receiver_id,
      from_port,
      to_port,
      goods_description,
      delivery_type,
      incoterm,
      cargo,
      load_date
    } = req.body;
    
    await client.query('BEGIN');
    
    // Update order
    const orderResult = await client.query(
      `UPDATE orders SET
        sender_id = $1, receiver_id = $2, from_port = $3, to_port = $4,
        goods_description = $5, delivery_type = $6, incoterm = $7, load_date = $8
      WHERE id = $9
      RETURNING *`,
      [
        sender_id, receiver_id, from_port, to_port, goods_description,
        delivery_type, incoterm, load_date, id
      ]
    );
    
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Update cargo if provided
    if (cargo && Array.isArray(cargo)) {
      // Delete existing cargo items first
      await client.query('DELETE FROM order_cargo WHERE order_id = $1', [id]);
      
      // If the new cargo array is non-empty, insert items; otherwise leave order with no cargo
      if (cargo.length > 0) {
        for (const item of cargo) {
          if (!item.cargo_unit || !item.cargo_quantity) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Each cargo item must have cargo_unit and cargo_quantity' });
          }
          
          await client.query(
            `INSERT INTO order_cargo (order_id, cargo_unit, cargo_quantity)
             VALUES ($1, $2, $3)`,
            [id, item.cargo_unit, item.cargo_quantity]
          );
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Fetch the complete order with cargo
    const result = await pool.query(
      `SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oc.id,
              'cargo_unit', oc.cargo_unit,
              'cargo_quantity', oc.cargo_quantity
            ) ORDER BY oc.created_at
          ) FILTER (WHERE oc.id IS NOT NULL),
          '[]'
        ) as cargo
       FROM orders o
       LEFT JOIN order_cargo oc ON o.id = oc.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [id]
    );
    
    res.json(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating order:', error);
    if (error.code === '23514') {
      res.status(400).json({ error: 'Invalid enum value' });
    } else {
      res.status(500).json({ error: 'Failed to update order' });
    }
  } finally {
    client.release();
  }
});

// Delete order
router.delete('/:id', canAccessOrder, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router;
