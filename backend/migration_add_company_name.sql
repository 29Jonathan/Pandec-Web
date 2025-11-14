-- ============================================
-- Migration: Add company_name and make fields required
-- ============================================

-- Step 1: Add company_name column (nullable first)
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- Step 2: Update existing users with default values (if any exist)
UPDATE users SET company_name = 'Company Name' WHERE company_name IS NULL;
UPDATE users SET phone = 'N/A' WHERE phone IS NULL;
UPDATE users SET address = 'N/A' WHERE address IS NULL;
UPDATE users SET vat_number = 'N/A' WHERE vat_number IS NULL;
UPDATE users SET eori_number = 'N/A' WHERE eori_number IS NULL;

-- Step 3: Make columns NOT NULL
ALTER TABLE users ALTER COLUMN company_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
ALTER TABLE users ALTER COLUMN address SET NOT NULL;
ALTER TABLE users ALTER COLUMN vat_number SET NOT NULL;
ALTER TABLE users ALTER COLUMN eori_number SET NOT NULL;

-- Verification query
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('company_name', 'phone', 'address', 'vat_number', 'eori_number')
ORDER BY column_name;
