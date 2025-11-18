import { Router } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get available port_type enum values
router.get('/ports', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query("SELECT unnest(enum_range(NULL::port_type)) as value");
    const ports = result.rows.map((row) => row.value);
    res.json(ports);
  } catch (error) {
    console.error('Error fetching port types:', error);
    res.status(500).json({ error: 'Failed to fetch port types' });
  }
});

export default router;
