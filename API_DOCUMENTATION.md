# Retail Item Locator - API Documentation

## Overview

The Retail Item Locator API provides endpoints for managing products, inventory locations, user authentication, and item lookup.

**Base URL:**

- Production: `https://retail-item-locator-api.onrender.com`
- Development: `http://localhost:5000`

---

## Authentication

### Types

#### 1. **Firebase JWT (User Authentication)**

Used for user-specific operations (viewing profile, etc.)

**Header:** `Authorization: Bearer {idToken}`

Get Firebase token from Firebase SDK after user signs in.

#### 2. **API Key (Service-to-Service)**

Used for bulk import operations requiring service authentication.

**Header:** `X-API-Key: {api_key}`

Contact admin to get API key.

---

## Response Format

### Success Response

```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    /* specific data */
  },
  "timestamp": "2024-06-11T18:30:00.000000"
}
```

### Error Response

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "timestamp": "2024-06-11T18:30:00.000000",
  "path": "/api/endpoint",
  "method": "POST"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

---

## Endpoints

### AUTH ENDPOINTS

#### `POST /api/auth/login`

Authenticate user with Firebase token.

**Authentication:** None (public endpoint)

**Request Body:**

```json
{
  "idToken": "firebase_id_token_from_sdk"
}
```

**Response (200):**

```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "firebase_uid": "abc123",
      "email": "user@example.com",
      "display_name": "John Doe",
      "role": "staff",
      "is_active": true
    },
    "token": "firebase_id_token"
  }
}
```

**Error Cases:**

- `400` - Missing idToken
- `401` - Invalid/expired token
- `403` - User account inactive

---

#### `GET /api/auth/me`

Get current authenticated user profile.

**Authentication:** Required (Firebase JWT)

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "firebase_uid": "abc123",
      "email": "user@example.com",
      "display_name": "John Doe",
      "role": "staff",
      "is_active": true
    }
  }
}
```

**Error Cases:**

- `401` - Missing/invalid token
- `404` - User not found

---

### PRODUCT ENDPOINTS

#### `POST /api/products`

Bulk import/upsert products.

**Authentication:** Required (API Key)

**Request Body:**

```json
[
  {
    "system_id": "PROD123",
    "upc": "123456789012",
    "custom_sku": "SKU001",
    "ean": "5901234123457",
    "manufacture_sku": "MFG001",
    "description": "Product Name",
    "price": 19.99,
    "category": "Electronics",
    "subcat_1": "Accessories",
    "subcat_2": "Cables",
    "subcat_3": "USB",
    "brand": "TechBrand"
  }
]
```

**Required Fields:**

- `system_id` (string) - Unique product identifier

**Optional Fields:**

- `upc` (string) - UPC barcode
- `custom_sku` (string) - Custom SKU
- `ean` (string) - EAN code
- `manufacture_sku` (string) - Manufacturer SKU
- `description` (string) - Product description
- `price` (number) - Product price
- `category` (string) - Product category
- `subcat_1`, `subcat_2`, `subcat_3` (string) - Subcategories
- `brand` (string) - Brand name

**Response (200):**

```json
{
  "status": "success",
  "message": "Successfully imported 1 products",
  "data": {
    "imported_count": 1
  }
}
```

**Error Cases:**

- `400` - Invalid payload or validation error
- `401` - Missing/invalid API key
- `500` - Database error

---

### INVENTORY ENDPOINTS

#### `POST /api/inventory`

Bulk import inventory/location data. Maps UPCs to shelf locations.

**Authentication:** Required (API Key)

**Request Body:**

```json
[
  {
    "upc": "123456789012",
    "shelf_id": "A1",
    "shelf_row": "3",
    "item_position": 5
  }
]
```

**Required Fields:**

- `upc` (string) - UPC of product to map
- `shelf_id` (string) - Shelf identifier
- `shelf_row` (string) - Row on shelf
- `item_position` (integer) - Position on row

**Response (200):**

```json
{
  "status": "success",
  "message": "Successfully mapped 1 locations",
  "data": {
    "mapped_count": 1
  }
}
```

**Error Cases:**

- `400` - Invalid payload or validation error
- `401` - Missing/invalid API key
- `404` - UPC not found in products database
- `500` - Database error

---

### LOOKUP ENDPOINTS

#### `GET /api/lookup`

Search for items by UPC, SKU, or description. Returns product info + location.

**Authentication:** Optional (public endpoint)

**Query Parameters:**

- `q` (string, required) - Search query (UPC, SKU, or product name)
- `page` (integer, optional, default: 1) - Page number for pagination
- `per_page` (integer, optional, default: 20, max: 100) - Results per page
- `category` (string, optional) - Filter by category
- `brand` (string, optional) - Filter by brand

**Example:**

```
GET /api/lookup?q=USB%20Cable&category=Electronics&per_page=10&page=1
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "system_id": "PROD123",
        "upc_id": "123456789012",
        "custom_sku": "SKU001",
        "ean": "5901234123457",
        "manufacture_sku": "MFG001",
        "description": "USB Type-C Cable",
        "price": 9.99,
        "category": "Electronics",
        "subcat_1": "Accessories",
        "subcat_2": "Cables",
        "subcat_3": "USB",
        "brand": "TechBrand",
        "shelf_id": "A1",
        "shelf_row": "3",
        "item_position": 5
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

**Error Cases:**

- `400` - Invalid query (empty or too long)
- `400` - Invalid pagination parameters
- `500` - Database error

---

## Usage Examples

### Example 1: User Login and Profile Fetch

**Step 1: Get Firebase token from client SDK**

```javascript
// In your React component
import { auth } from "./firebase";
const idToken = await auth.currentUser.getIdToken();
```

**Step 2: Send to API**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"idToken": "token_from_step1"}'
```

**Step 3: Fetch user profile**

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer token_from_step1"
```

---

### Example 2: Bulk Import Products

```bash
curl -X POST https://api.example.com/api/products \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "system_id": "PROD001",
      "upc": "123456789012",
      "description": "Wireless Mouse",
      "price": 24.99,
      "category": "Electronics",
      "brand": "Logitech"
    }
  ]'
```

---

### Example 3: Bulk Import Inventory Locations

```bash
curl -X POST https://api.example.com/api/inventory \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "upc": "123456789012",
      "shelf_id": "A1",
      "shelf_row": "3",
      "item_position": 5
    }
  ]'
```

---

### Example 4: Search for Item

```bash
# Search by UPC
curl -X GET "https://api.example.com/api/lookup?q=123456789012"

# Search by product name with filters
curl -X GET "https://api.example.com/api/lookup?q=mouse&category=Electronics&page=1&per_page=20"
```

---

## Error Codes

| Code                    | HTTP Status | Meaning                   |
| ----------------------- | ----------- | ------------------------- |
| `VALIDATION_ERROR`      | 400         | Input validation failed   |
| `AUTHENTICATION_ERROR`  | 401         | Authentication failed     |
| `AUTHORIZATION_ERROR`   | 403         | Insufficient permissions  |
| `NOT_FOUND`             | 404         | Resource not found        |
| `CONFLICT`              | 409         | Resource conflict         |
| `DATABASE_ERROR`        | 500         | Database operation failed |
| `INTERNAL_SERVER_ERROR` | 500         | Unexpected server error   |

---

## Rate Limiting & Quotas

Currently, no rate limiting is enforced. Consider implementing:

- 100 requests/min per IP (for public endpoints)
- 1000 requests/min per API key (for authenticated endpoints)

---

## Pagination

For endpoints that return lists, use `page` and `per_page` parameters:

```
GET /api/lookup?q=search&page=2&per_page=50
```

Response includes pagination metadata:

```json
"pagination": {
  "page": 2,
  "per_page": 50,
  "total": 500,
  "pages": 10
}
```

---

## Filtering

Supported filters on `/api/lookup`:

- `category` - Filter by product category
- `brand` - Filter by brand

Filters are combined with AND logic.

---

## Future Endpoints (Phase 2+)

- `PUT /api/products/:id` - Edit product
- `DELETE /api/products/:id` - Delete product
- `PUT /api/inventory/:id` - Edit inventory location
- `DELETE /api/inventory/:id` - Delete inventory
- `GET /api/users` - List users (admin only)
- `PUT /api/users/:id/role` - Update user role (admin only)
- `GET /api/analytics/` - Analytics dashboard (admin/staff)

---

## Testing

### Test the health endpoint

```bash
curl http://localhost:5000/health
```

### Test lookup

```bash
curl "http://localhost:5000/api/lookup?q=test"
```

---

## Support

For issues or questions, contact the development team.


## Current company/store and settings endpoints

`clients` contains companies. `stores.client_id` links each store to its company.
Product records remain company-scoped. Every inventory record has `store_id` and
`client_id`, with a composite foreign key preventing cross-company assignments.
Location conflicts are evaluated by `(client_id, store_id, system_id, shelf_id, shelf_row)`.

All settings endpoints require a provisioned, active Firebase user and active company:

| Endpoint | Access | Response |
| --- | --- | --- |
| GET /api/users | admin | data.users with user_id, email, display_name, role, is_active |
| GET /api/stores | any role | data.stores with id, name, address, is_active, location_count |
| POST /api/stores | admin | 201 and data.store |
| PUT /api/stores/{store_id} | admin | updated data.store; 404 for inaccessible IDs |

Store create/update bodies are `{ "name": "Actual store name", "address": "Actual address" }`.
Address is optional; names must be unique within a company, ignoring case.
Role values are admin, staff, and viewer. Custom mock roles are not supported.

Inventory import rows accept `store_id`. A batch must target one active store belonging
to the authenticated company. If omitted, exactly one active store must exist.
Lookup results include `store_id` and `store_name` for assigned locations.
Profile display-name updates use Firebase updateProfile followed by a forced token
refresh and POST /api/auth/login, which synchronizes verified account information.
