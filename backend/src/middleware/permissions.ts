import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { pool } from '../config/database';

/**
 * Check if user can access a specific order
 */
export const canAccessOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    if (userRole === 'Admin') {
      return next();
    }
    
    const result = await pool.query(
      'SELECT id FROM orders WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this order' });
    }
    
    next();
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: 'Failed to check permissions' });
  }
};

/**
 * Check if user can access a specific offer
 */
export const canAccessOffer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    if (userRole === 'Admin') {
      return next();
    }
    
    const result = await pool.query(
      `SELECT o.id FROM offers o
       JOIN orders ord ON o.order_id = ord.id
       WHERE o.id = $1 AND (ord.sender_id = $2 OR ord.receiver_id = $2)`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this offer' });
    }
    
    next();
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: 'Failed to check permissions' });
  }
};

/**
 * Check if user can access a specific shipment
 */
export const canAccessShipment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    if (userRole === 'Admin') {
      return next();
    }
    
    const result = await pool.query(
      `SELECT s.id FROM shipments s
       JOIN orders ord ON s.order_id = ord.id
       WHERE s.id = $1 AND (ord.sender_id = $2 OR ord.receiver_id = $2)`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this shipment' });
    }
    
    next();
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: 'Failed to check permissions' });
  }
};

/**
 * Build WHERE clause for filtering orders by user permissions
 */
export const buildOrdersFilter = (userId: string, userRole: string): { query: string; params: any[] } => {
  if (userRole === 'Admin') {
    return { query: '', params: [] };
  }
  
  return {
    query: '(sender_id = $1 OR receiver_id = $1)',
    params: [userId]
  };
};

/**
 * Build WHERE clause for filtering offers by user permissions
 */
export const buildOffersFilter = (userId: string, userRole: string): { query: string; params: any[] } => {
  if (userRole === 'Admin') {
    return { query: '', params: [] };
  }
  
  return {
    query: 'order_id IN (SELECT id FROM orders WHERE sender_id = $1 OR receiver_id = $1)',
    params: [userId]
  };
};

/**
 * Build WHERE clause for filtering shipments by user permissions
 */
export const buildShipmentsFilter = (userId: string, userRole: string): { query: string; params: any[] } => {
  if (userRole === 'Admin') {
    return { query: '', params: [] };
  }
  
  return {
    query: 'order_id IN (SELECT id FROM orders WHERE sender_id = $1 OR receiver_id = $1)',
    params: [userId]
  };
};
