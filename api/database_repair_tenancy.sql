-- Run AFTER database_repair_users.sql, with psql -v ON_ERROR_STOP=1.
-- Convert legacy global keys to tenant-scoped keys; preserve every record.
-- Invalid/missing tenant ownership aborts the transaction instead of guessing.
BEGIN;
LOCK TABLE clients, users, products, inventory IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM products WHERE client_id IS NULL)
       OR EXISTS (SELECT 1 FROM inventory WHERE client_id IS NULL)
       OR EXISTS (SELECT 1 FROM users WHERE client_id IS NULL) THEN
        RAISE EXCEPTION 'Assign each existing record to its correct client before repairing tenant keys.';
    END IF;
END $$;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
UPDATE inventory SET id=gen_random_uuid() WHERE id IS NULL;
UPDATE products SET id=gen_random_uuid() WHERE id IS NULL;
ALTER TABLE products ALTER COLUMN id SET NOT NULL;
ALTER TABLE inventory ALTER COLUMN id SET NOT NULL;
ALTER TABLE products ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE inventory ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN client_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_id_repair ON products(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_id_repair ON inventory(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_system_repair ON products(client_id, system_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_tenant_location_repair ON inventory(client_id, system_id, shelf_id, shelf_row);
-- Remove only the legacy constraints found in this project's original schema.
-- Other dependencies cause a failure requiring review; never use CASCADE.
DO $$
DECLARE constraint_row RECORD;
BEGIN
    FOR constraint_row IN SELECT conname FROM pg_constraint
        WHERE conrelid='inventory'::regclass AND contype='f'
          AND confrelid='products'::regclass
          AND pg_get_constraintdef(oid)='FOREIGN KEY (system_id) REFERENCES products(system_id)'
    LOOP
        EXECUTE format('ALTER TABLE inventory DROP CONSTRAINT %I', constraint_row.conname);
    END LOOP;
    FOR constraint_row IN SELECT conname FROM pg_constraint
        WHERE conrelid='products'::regclass AND contype IN ('p','u')
          AND pg_get_constraintdef(oid) IN ('PRIMARY KEY (system_id)', 'UNIQUE (system_id)')
    LOOP
        EXECUTE format('ALTER TABLE products DROP CONSTRAINT %I', constraint_row.conname);
    END LOOP;
    FOR constraint_row IN SELECT conname FROM pg_constraint
        WHERE conrelid='inventory'::regclass AND contype='u'
          AND pg_get_constraintdef(oid)='UNIQUE (system_id, shelf_id, shelf_row)'
    LOOP
        EXECUTE format('ALTER TABLE inventory DROP CONSTRAINT %I', constraint_row.conname);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='products'::regclass AND contype='p') THEN
        ALTER TABLE products ADD PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='inventory'::regclass AND contype='p') THEN
        ALTER TABLE inventory ADD PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='inventory'::regclass AND conname='fk_inventory_tenant_product') THEN
        ALTER TABLE inventory ADD CONSTRAINT fk_inventory_tenant_product
            FOREIGN KEY (client_id, system_id) REFERENCES products(client_id, system_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='products'::regclass AND conname='fk_products_tenant') THEN
        ALTER TABLE products ADD CONSTRAINT fk_products_tenant FOREIGN KEY (client_id) REFERENCES clients(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='users'::regclass AND conname='fk_users_tenant') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY (client_id) REFERENCES clients(id);
    END IF;
END $$;
COMMIT;
