-- -- Phase 2: Multi-Tenancy Database Refactoring
-- -- This migration adds UUID-based clients table and client_id scoping to products/inventory
-- -- RUN THIS AFTER database_migrations.sql has been applied

-- -- ============================================================================
-- -- 1. CREATE CLIENTS TABLE (new tenant/organization container)
-- -- ============================================================================
-- CREATE TABLE IF NOT EXISTS clients (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     org_name VARCHAR(255) NOT NULL,
--     tenant_code VARCHAR(50) UNIQUE NOT NULL,
--     is_active BOOLEAN DEFAULT TRUE,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE INDEX IF NOT EXISTS idx_clients_tenant_code ON clients(tenant_code);
-- CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);

-- -- ============================================================================
-- -- 2. ALTER USERS TABLE: Refactor to client-based architecture
-- -- ============================================================================
-- -- Add client_id column (with temporary NULL values for existing users)
-- ALTER TABLE users ADD COLUMN client_id UUID;
-- ALTER TABLE users ADD CONSTRAINT fk_users_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;

-- -- Rename firebase_uid to user_id and make it TEXT primary key
-- -- Note: This is complex in PostgreSQL. We'll use a migration strategy:
-- -- Step 1: Create new columns
-- ALTER TABLE users ADD COLUMN user_id TEXT UNIQUE;
-- -- Step 2: Copy firebase_uid values to user_id
-- UPDATE users SET user_id = firebase_uid WHERE user_id IS NULL;
-- -- Step 3: Make user_id NOT NULL and add index
-- ALTER TABLE users ALTER COLUMN user_id SET NOT NULL;
-- CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- -- ============================================================================
-- -- 3. ALTER PRODUCTS TABLE: Add UUID id and client_id for multi-tenancy
-- -- ============================================================================
-- -- Add new columns
-- ALTER TABLE products ADD COLUMN id UUID DEFAULT gen_random_uuid();
-- ALTER TABLE products ADD COLUMN client_id UUID;
-- ALTER TABLE products ADD CONSTRAINT fk_products_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- -- Add unique constraint for composite key
-- ALTER TABLE products ADD CONSTRAINT unique_product_per_client UNIQUE (client_id, system_id);

-- -- Create indexes for client and system_id lookups
-- CREATE INDEX IF NOT EXISTS idx_products_client_id ON products(client_id);
-- CREATE INDEX IF NOT EXISTS idx_products_client_system_id ON products(client_id, system_id);

-- -- ============================================================================
-- -- 4. ALTER INVENTORY TABLE: Add UUID id and client_id for multi-tenancy
-- -- ============================================================================
-- -- Add new columns
-- ALTER TABLE inventory ADD COLUMN id UUID DEFAULT gen_random_uuid();
-- ALTER TABLE inventory ADD COLUMN client_id UUID;
-- ALTER TABLE inventory ADD CONSTRAINT fk_inventory_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- -- Add unique constraint for composite key (including shelf location)
-- ALTER TABLE inventory ADD CONSTRAINT unique_inventory_per_client UNIQUE (client_id, system_id, shelf_id, shelf_row);

-- -- Create indexes for client and system_id lookups
-- CREATE INDEX IF NOT EXISTS idx_inventory_client_id ON inventory(client_id);
-- CREATE INDEX IF NOT EXISTS idx_inventory_client_system_id ON inventory(client_id, system_id);

-- -- ============================================================================
-- -- 5. CREATE AUDIT LOGS ASSOCIATION WITH CLIENTS
-- -- ============================================================================
-- -- Add client_id to audit_logs for better querying
-- ALTER TABLE audit_logs ADD COLUMN client_id UUID;
-- ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- CREATE INDEX IF NOT EXISTS idx_audit_logs_client_id ON audit_logs(client_id);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_client_created_at ON audit_logs(client_id, created_at);

-- -- ============================================================================
-- -- 6. UPDATE TRIGGERS FOR TIMESTAMPS
-- -- ============================================================================
-- CREATE OR REPLACE FUNCTION update_timestamp()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER update_clients_timestamp BEFORE UPDATE ON clients
--     FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
--     FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- -- ============================================================================
-- -- 7. MIGRATION INSTRUCTIONS FOR EXISTING DATA
-- -- ============================================================================
-- -- IMPORTANT: You must manually assign client_id to existing records!
-- -- 
-- -- Step 1: Create a default client (if needed):
-- -- INSERT INTO clients (org_name, tenant_code) VALUES ('Default Org', 'default-001');
-- --
-- -- Step 2: Update all products/inventory with client_id:
-- -- UPDATE products SET client_id = (SELECT id FROM clients LIMIT 1) WHERE client_id IS NULL;
-- -- UPDATE inventory SET client_id = (SELECT id FROM clients LIMIT 1) WHERE client_id IS NULL;
-- --
-- -- Step 3: Update all users with client_id:
-- -- UPDATE users SET client_id = (SELECT id FROM clients LIMIT 1) WHERE client_id IS NULL;
-- --
-- -- Step 4: Make client_id NOT NULL after data is populated:
-- -- ALTER TABLE products ALTER COLUMN client_id SET NOT NULL;
-- -- ALTER TABLE inventory ALTER COLUMN client_id SET NOT NULL;
-- -- ALTER TABLE users ALTER COLUMN client_id SET NOT NULL;

-- -- ============================================================================
-- -- 8. REFERENCE: Products/Inventory Table Structures (Read-Only)
-- -- ============================================================================
-- -- Products table should now have:
-- -- - id (UUID, primary key) - New! For API responses
-- -- - system_id (VARCHAR) - Existing, for POS system sync (composite unique key)
-- -- - client_id (UUID, FK to clients) - New! For tenant scoping
-- -- - upc_id, custom_sku, ean, manufacture_sku (existing SKU fields)
-- -- - description, price, category, subcat_*, brand (existing product fields)
-- -- - created_at, updated_at (existing timestamps)
-- --
-- -- Inventory table should now have:
-- -- - id (UUID, primary key) - New! For API responses
-- -- - system_id (VARCHAR) - Existing, for POS system sync (composite unique key)
-- -- - client_id (UUID, FK to clients) - New! For tenant scoping
-- -- - shelf_id, shelf_row, item_position (existing location fields)
-- -- - created_at, updated_at (existing timestamps)
