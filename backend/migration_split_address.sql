-- ============================================
-- Migration: Split address into address1, address2, and country
-- ============================================

-- Step 1: Add new columns (nullable first)
ALTER TABLE users ADD COLUMN IF NOT EXISTS address1 VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address2 VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Step 2: Migrate existing address data to address1 (if any exist)
-- This assumes the old address field contains the full address
UPDATE users SET address1 = address WHERE address1 IS NULL AND address IS NOT NULL;

-- Step 3: Set default values for existing records
UPDATE users SET address1 = 'Not Set' WHERE address1 IS NULL;
UPDATE users SET address2 = '' WHERE address2 IS NULL;
UPDATE users SET country = 'Not Set' WHERE country IS NULL;

-- Step 4: Make columns NOT NULL
ALTER TABLE users ALTER COLUMN address1 SET NOT NULL;
ALTER TABLE users ALTER COLUMN address2 SET NOT NULL;
ALTER TABLE users ALTER COLUMN country SET NOT NULL;

-- Step 5: Drop old address column (OPTIONAL - uncomment if you want to remove it)
-- ALTER TABLE users DROP COLUMN IF EXISTS address;

-- Verification query
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('address1', 'address2', 'country', 'address')
ORDER BY column_name;

