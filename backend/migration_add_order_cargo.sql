-- ============================================
-- Migration: Add order_cargo table for multiple cargo units per order
-- ============================================

-- Step 1: Create the order_cargo table
CREATE TABLE IF NOT EXISTS order_cargo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    cargo_unit cargo_unit NOT NULL,
    cargo_quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_cargo_order_id ON order_cargo(order_id);

-- Step 3: Add updated_at trigger
CREATE TRIGGER trg_update_order_cargo BEFORE UPDATE ON order_cargo
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Migrate existing data from orders table to order_cargo
-- This creates one cargo item per existing order based on cargo_unit and cargo_quantity
INSERT INTO order_cargo (order_id, cargo_unit, cargo_quantity)
SELECT id, cargo_unit, cargo_quantity
FROM orders
WHERE cargo_unit IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 5: Drop old columns from orders table (OPTIONAL - see notes below)
-- UNCOMMENT THESE LINES IF YOU WANT TO REMOVE OLD COLUMNS:
-- ALTER TABLE orders DROP COLUMN IF EXISTS cargo_unit;
-- ALTER TABLE orders DROP COLUMN IF EXISTS cargo_quantity;

-- Verification query
SELECT 
    o.order_code,
    oc.cargo_unit,
    oc.cargo_quantity
FROM orders o
LEFT JOIN order_cargo oc ON o.id = oc.order_id
ORDER BY o.created_at DESC
LIMIT 10;
