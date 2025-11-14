import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { pool } from '../config/database';
import { User } from '../types/db';

export interface AuthRequest extends Request {
  user?: User;
  authUserId?: string;
}

/**
 * Middleware to verify JWT token from Supabase Auth
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Store Supabase user ID
    req.authUserId = user.id;
    
    // Load user from local database
    const result = await pool.query(
      'SELECT id, name, email, role, company_name, phone, address, vat_number, eori_number, created_at, updated_at FROM users WHERE id = $1',
      [user.id]
    );
    
    if (result.rows.length === 0) {
      // User not synced yet - try to sync now with all required fields
      try {
        const syncResult = await pool.query(
          `INSERT INTO users (id, name, email, role, company_name, phone, address, vat_number, eori_number, password)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, name, email, role, company_name, phone, address, vat_number, eori_number, created_at, updated_at`,
          [
            user.id,
            user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            user.email,
            user.user_metadata?.role || 'Shipper',
            user.user_metadata?.company_name || 'Not Set',
            user.user_metadata?.phone || 'Not Set',
            user.user_metadata?.address || 'Not Set',
            user.user_metadata?.vat_number || 'Not Set',
            user.user_metadata?.eori_number || 'Not Set',
            'supabase-auth-managed'
          ]
        );
        req.user = syncResult.rows[0] as User;
      } catch (syncError: any) {
        if (syncError.code === '23505') {
          // Already exists, fetch again
          const retryResult = await pool.query(
            'SELECT id, name, email, role, company_name, phone, address, vat_number, eori_number, created_at, updated_at FROM users WHERE id = $1',
            [user.id]
          );
          req.user = retryResult.rows[0] as User;
        } else {
          console.error('Auto-sync error:', syncError);
          throw syncError;
        }
      }
    } else {
      req.user = result.rows[0] as User;
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};
