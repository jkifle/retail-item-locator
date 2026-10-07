-- Phase 1 bootstrap for an EMPTY database; matches the tenant-scoped API.
-- Existing databases: use schema.py and database_repair_users.sql first.
BEGIN;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = current_schema()
                 AND table_name IN ('users', 'clients', 'products', 'inventory', 'audit_logs')) THEN
        RAISE EXCEPTION 'Existing application tables found. Inspect schema.py output and use a reviewed repair migration; bootstrap will not overwrite data.';
    END IF;
END $$;

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tenant_code TEXT UNIQUE NOT NULL,
    api_key TEXT UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'staff', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    system_id TEXT NOT NULL,
    upc_id TEXT, custom_sku TEXT, ean TEXT, manufacture_sku TEXT,
    description TEXT, price NUMERIC(12,2), category TEXT,
    subcat_1 TEXT, subcat_2 TEXT, subcat_3 TEXT, brand TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (client_id, system_id)
);
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    system_id TEXT NOT NULL,
    shelf_id TEXT NOT NULL,
    shelf_row TEXT NOT NULL,
    item_position INTEGER NOT NULL CHECK (item_position > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id, system_id) REFERENCES products(client_id, system_id),
    UNIQUE (client_id, system_id, shelf_id, shelf_row)
);
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT,
    old_values JSONB, new_values JSONB, ip_address TEXT, user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE inventory_history (
    id BIGSERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id), system_id TEXT NOT NULL,
    shelf_id TEXT, shelf_row TEXT, old_item_position INTEGER, new_item_position INTEGER,
    changed_by TEXT REFERENCES users(user_id),
    change_type TEXT NOT NULL CHECK (change_type IN ('insert', 'update', 'delete')),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE api_keys (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    key_hash TEXT UNIQUE NOT NULL, key_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);
-- Service authentication currently uses clients.api_key, not api_keys.
CREATE INDEX idx_users_client ON users(client_id);
CREATE INDEX idx_products_upc ON products(client_id, upc_id);
CREATE INDEX idx_inventory_location ON inventory(client_id, shelf_id, shelf_row);
CREATE INDEX idx_audit_client_time ON audit_logs(client_id, created_at);
-- Companies remain clients; products are company-wide, inventory is store-specific.
-- Preserve existing client IDs, product IDs, inventory IDs, and all original data.
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (client_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS stores_client_name ON stores(client_id, lower(name));
-- One explicitly identifiable initial store per existing company with locations.
INSERT INTO stores (client_id, name)
SELECT c.id, c.name FROM clients c
WHERE EXISTS (SELECT 1 FROM inventory i WHERE i.client_id=c.id)
  AND NOT EXISTS (SELECT 1 FROM stores s WHERE s.client_id=c.id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS store_id UUID;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM inventory i WHERE i.store_id IS NULL
               AND (SELECT count(*) FROM stores s WHERE s.client_id=i.client_id) <> 1) THEN
        RAISE EXCEPTION 'Cannot infer store ownership: assign existing inventory explicitly.';
    END IF;
END $$;
UPDATE inventory i SET store_id=(SELECT s.id FROM stores s WHERE s.client_id=i.client_id)
WHERE i.store_id IS NULL;
ALTER TABLE inventory ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE inventory ADD CONSTRAINT inventory_store_tenant
    FOREIGN KEY (client_id,store_id) REFERENCES stores(client_id,id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX inventory_store_location
    ON inventory(client_id,store_id,system_id,shelf_id,shelf_row);
-- Remove only obsolete per-company location uniqueness; keep product/tenant FKs.
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='inventory'::regclass
             AND contype='u' AND pg_get_constraintdef(oid)='UNIQUE (client_id, system_id, shelf_id, shelf_row)'
    LOOP EXECUTE format('ALTER TABLE inventory DROP CONSTRAINT %I',r.conname); END LOOP;
END $$;
DROP INDEX IF EXISTS idx_inventory_tenant_location_repair;

COMMIT;
