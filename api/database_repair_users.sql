-- Repair the documented users-column mismatch WITHOUT assigning tenants or roles.
-- Back up and inspect the database first. Run with psql -v ON_ERROR_STOP=1.
-- Email/display_name remain NULL until a verified Firebase login supplies them.
BEGIN;
DO $$
BEGIN
    IF to_regclass('users') IS NULL OR to_regclass('clients') IS NULL THEN
        RAISE EXCEPTION 'users and clients must exist. Use the bootstrap only for an empty database.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'user_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'firebase_uid') THEN
            RAISE EXCEPTION 'Cannot infer Firebase identity: users has neither user_id nor firebase_uid.';
        END IF;
        ALTER TABLE users ADD COLUMN user_id TEXT;
        UPDATE users SET user_id = firebase_uid;
        ALTER TABLE users ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='clients' AND column_name='id') THEN
        ALTER TABLE clients RENAME COLUMN client_id TO id;
    END IF;
END $$;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE clients ALTER COLUMN id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_id_repair ON clients(id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='clients'::regclass AND contype='p') THEN
        ALTER TABLE clients ADD PRIMARY KEY (id);
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id_repair ON users(user_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'staff', 'viewer'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE RESTRICT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS api_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_api_key_repair ON clients(api_key);
-- Remove the legacy implicit admin role and hard-coded tenant assignment.
-- Existing explicit roles and client assignments remain unchanged.
UPDATE users SET role='viewer' WHERE role IS NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'viewer';
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ALTER COLUMN client_id DROP DEFAULT;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='users'::regclass AND conname='users_role_allowed') THEN
        ALTER TABLE users ADD CONSTRAINT users_role_allowed CHECK (role IN ('admin', 'staff', 'viewer'));
    END IF;
END $$;
COMMIT;
