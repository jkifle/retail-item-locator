# Phase 1 setup and repair guide

Phase 1 provides Firebase login, backend-enforced roles, tenant-scoped lookup,
product and location imports, validation, and database readiness checks.
The existing API is already split into an application factory and route modules.
Do not rename or replace app.py with an app_v1.py file.

## Requirements

- Python 3.9 or newer
- Node.js 20.19+ or 22.12+ for the installed Vite 7 frontend
- PostgreSQL with gen_random_uuid() support
- Firebase project with Email/Password authentication enabled

## Backend configuration

From the project root, install dependencies into the API environment:

```powershell
api/.venv/Scripts/python.exe -m pip install -r api/requirements.txt
```

Create a virtual environment with `python -m venv api/.venv` if needed.
Flask is pinned to [3.1.3](https://flask.palletsprojects.com/en/stable/changes/#version-3-1-3) to work with current Werkzeug; Flask 2.3.0 breaks
its test client with Werkzeug 3.1.

Copy api/.env.example to api/.env and configure DATABASE_URL,
FIREBASE_PROJECT_ID, and Firebase credentials. The API loads api/.env regardless
of the directory from which it starts. Environment variables override the file.

Use FIREBASE_CREDENTIALS_JSON for the complete service-account JSON on one line,
with private-key line breaks escaped as \n. Alternatively use Google's standard
GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to the service-account
file. FIREBASE_CREDENTIALS_PATH is not supported. Firebase Web config is not an
Admin credential. Keep service-account private keys out of version control.

CORS_ORIGINS is a comma-separated list of exact frontend origins, such as
http://localhost:5173. Add http://127.0.0.1:5173 explicitly if using that address.

## Database diagnosis and migrations

First inspect the connected database without changing it:

```powershell
api/.venv/Scripts/python.exe api/schema.py
```

The October 6, 2026 inspection found a reachable database with:

- users missing email, display_name, is_active, and updated_at
- clients using client_id rather than the API's expected id, without api_key/is_active
- inventory missing id
- products/inventory still using global keys rather than tenant-scoped keys

### Existing database

The repair scripts preserve records and existing roles. They add profile columns,
rename clients.client_id to id, add inventory UUIDs, and replace legacy global
constraints with tenant-scoped constraints. Existing users must already have valid
Firebase IDs and tenant assignments. No default tenant or admin is silently created.
Nullable email/display_name fields are filled from a verified Firebase login.

Validate both scripts together in a rollback-only transaction:

```powershell
api/.venv/Scripts/python.exe api/migrate.py
```

Create and restore-test a backup with `api/.venv/Scripts/python.exe api/backup.py`
(Docker must be running). The archive, checksums, and verification manifest are
saved under the ignored .backups/ directory. This is a local logical backup, not
a Neon branch or provider snapshot. The following command
commits both repairs as one transaction:

```powershell
api/.venv/Scripts/python.exe api/migrate.py --apply --backup .backups/YOUR_VERIFIED_BACKUP_DIRECTORY
```

The apply command checks the backup archive checksum and requires the current
rows to match its verified data fingerprints. All original field values are checked
again before committing. It also removes implicit admin and tenant defaults.

The repair aborts on missing tenant assignments, duplicate IDs, orphan references,
or unexpected dependencies. Reconcile such records deliberately, then rerun.
The original database_migrations_phase2_multitenancy.sql is a commented historical
reference and must not be used as the active migration.

### Empty database

api/database_migrations.sql is now an active bootstrap matching the API. It creates
clients, users, products, inventory, audit_logs, inventory_history, and api_keys.
It refuses to run when existing core tables are present:

```sh
psql -v ON_ERROR_STOP=1 -d YOUR_DATABASE -f api/database_migrations.sql
```

The current service-key authorization uses clients.api_key; api_keys is reserved
for future hashed-key management. There is no global API_KEY fallback.

### User provisioning

Firebase signup creates a Firebase account. It does not assign access to an
organization. An administrator must provision the Firebase UID in users and
assign client_id, role (viewer/staff/admin), and is_active. Until then, the frontend
shows the backend login error and keeps protected routes inaccessible.

After bootstrap, create a client and provision a user using actual IDs:

```sql
INSERT INTO clients (org_name, tenant_code) VALUES ('Your organization', 'your-org');
INSERT INTO users (user_id, client_id, role)
VALUES ('ACTUAL_FIREBASE_UID', 'ACTUAL_CLIENT_UUID', 'admin');
```

For the repaired legacy database, the organization's existing name column remains
name. Use existing client IDs rather than creating or guessing tenant assignments.
Service imports additionally require a securely generated unique clients.api_key.

## Frontend

Copy frontend/.env.example to frontend/.env. Fill in the Firebase Web configuration
from Firebase Project Settings, and set VITE_API_URL=http://localhost:5000.
Restart Vite after changing environment variables.

```powershell
npm.cmd install --prefix frontend
npm.cmd run dev --prefix frontend
```

AuthProvider and ProtectedRoute are already wired into the app. The dashboard,
product sync, and item location pages use the configured API. Each API request gets
a fresh Firebase ID token; a cached localStorage token is not used.

The Product Sync page performs real CSV imports. Required header: System ID.
Optional headers: UPC, Item, Price, Category, Brand, Custom SKU, EAN, Manufact. SKU.
The Item Locations page supports single scanning, a CSV with a UPC header, and
pasted code lists. Imports require staff/admin access. Viewers may search.

## Start and verify

```powershell
api/.venv/Scripts/python.exe api/app.py
```

- GET /health confirms the API process is alive.
- GET /health/ready verifies database connectivity, required columns, and tenant
  unique keys. Missing schema/connectivity returns HTTP 503 with diagnostic issues.
- A successful OPTIONS request only confirms CORS, not database readiness.
- POST /api/auth/login accepts a JSON object with idToken and synchronizes an
  already provisioned user's profile.
- GET /api/lookup?q=SEARCH requires Authorization: Bearer FIREBASE_ID_TOKEN.
- POST /api/products or /api/product-import accepts product arrays.
- POST /api/inventory or /api/import accepts location objects or arrays.
- Import routes accept either a staff/admin Firebase Bearer token or X-API-Key
  matching an active client. Never put a service key in frontend VITE variables.

All rows must validate before imports write anything. Unknown or ambiguous location
codes reject the batch. Prices must be finite and non-negative; positions must be
positive integers. Authentication and database failures surface as errors.

## Regression checks

```powershell
api/.venv/Scripts/python.exe -m unittest discover -s api/tests -v
npm.cmd run lint --prefix frontend
npm.cmd run build --prefix frontend
```

The optional real-database integration test validates repairs, imports, lookup,
tenant isolation, and inactive organization denial inside a transaction that is
always rolled back (Firebase verification is mocked):

```powershell
$env:PHASE1_DATABASE_TEST="1"
api/.venv/Scripts/python.exe -m unittest discover -s api/tests -v
```

## Troubleshooting

Connection refused: start PostgreSQL or correct the host/port in DATABASE_URL.
The connection timeout is bounded and the API returns an actionable database error.

Missing users columns: run schema.py and validate migrate.py before applying the
reviewed repair. Do not rerun the empty-database bootstrap over existing tables.

Login denied after Firebase signup: provision the Firebase UID with the intended
client and role. Backend rejection no longer falls back to a frontend-only login.

Firebase validation failure: check service-account credentials and matching frontend
and backend project IDs. A real Firebase login still needs manual verification.

Virtual environment files in Git: ignore rules already cover api/.venv. The current
checkout has no tracked api/.venv files. If that changes, use
`git rm -r --cached api/.venv` to stop tracking them while retaining local files.

Phase 2: persisted role administration, settings, edit/delete operations, and
search enhancements remain future work. The Phase 1 product/location import pages
no longer simulate successful writes or show fabricated import history.


## Applied repair — October 6, 2026

The existing Neon database was backed up and successfully restored in an isolated
PostgreSQL 17 container before applying both repair scripts in one transaction.
Original row fingerprints were checked before and after the repair; all existing
values were preserved. The dataset contains one client, 6,493 products, 2,511
inventory records, and no application users.

Recovery archive: .backups/neon-before-phase1-20261006T233828Z/database.dump.
Verification metadata: manifest.json in the same directory.
The archive includes the original schema and data, including the original
clients.client_id column and global constraints. Keep this archive secure.

To recover, first restore into a separate PostgreSQL database with the standard
PostgreSQL 17 pg_restore tool and verify the result:

```sh
pg_restore --exit-on-error --no-owner --no-privileges -d YOUR_SEPARATE_RECOVERY_DATABASE database.dump
```

Do not restore directly over the live database without a deliberate recovery plan.
Database-wide roles and Neon project/branch settings are outside this logical backup.


## Company and store model

Clients are companies. Stores belong to a client through stores.client_id; products
remain company-wide. Inventory now has a required store_id, with a composite foreign
key ensuring that the store belongs to the same company. Location uniqueness includes
the store, so the same product can occupy the same shelf code in multiple stores.

The stores migration was applied on October 6, 2026 after a new restore-verified backup:
.backups/neon-before-phase1-20261007T013710Z/database.dump (timestamp is UTC).
It preserved the company, the provisioned user, all 6,493 products, and all 2,511
locations. Existing locations belong to the initial store named The Hut Liquors.
Its address remains blank until an administrator supplies the actual address.

Settings loads the current authenticated user's profile, and display-name saves update
Firebase and then synchronize the backend profile with a refreshed token. Email and
role are read-only. Password reset sends Firebase's reset email. Notifications and
export settings display their availability rather than simulated successful actions.

GET /api/users returns only the current company's users, and requires admin access.
GET /api/stores lists the current company's real stores and inventory counts.
POST /api/stores and PUT /api/stores/<id> require admin access and persist a name/address.
Cross-company store IDs are rejected. Inventory imports include store_id; omitting it
is accepted only when the company has exactly one active store. The dashboard's store
filter uses store IDs rather than product categories.

For another database already repaired through Phase 1, create a current verified backup,
then validate the one-time stores migration before applying it:

```powershell
api/.venv/Scripts/python.exe api/migrate_stores.py --backup .backups/YOUR_VERIFIED_BACKUP_DIRECTORY
api/.venv/Scripts/python.exe api/migrate_stores.py --apply --backup .backups/YOUR_VERIFIED_BACKUP_DIRECTORY
```

Do not rerun the historical Phase 1 tenancy repair after adding stores: it restores
an obsolete per-company uniqueness constraint. The initial bootstrap includes stores
for fresh installations. No company, store address, or user is invented by the UI.
