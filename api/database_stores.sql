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
