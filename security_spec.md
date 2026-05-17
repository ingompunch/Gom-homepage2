# Security Specification for GOM AD

## Data Invariants
1. `inquiries`:
   - Any visitor can create an inquiry.
   - Inquiries cannot be modified by visitors.
   - Inquiries can only be read/updated by Admins.
   - `createdAt` must be exactly the server time.
   - IDs must be alphanumeric.
2. `content`:
   - Publicly readable.
   - Only Admins can modify.
   - `updatedAt` must be exactly the server time.
3. `admins`:
   - Restricted to admins.

## The "Dirty Dozen" Payloads (Denial Expected)
1. **Unauthenticated Content Update**: `PATCH /content/main { "heroHeading": "Hacked" }` -> DENIED.
2. **Visitor Reading Inquiries**: `GET /inquiries` (as visitor) -> DENIED.
3. **Ghost Field Injection**: `POST /inquiries { "name": "Test", ..., "is_verified": true }` -> DENIED (strict keys).
4. **ID Poisoning**: `POST /inquiries/VERY_LONG_ID_...` -> DENIED (isValidId check).
5. **Type Poisoning**: `POST /inquiries { "name": 123, ... }` -> DENIED.
6. **Large Payload**: `POST /inquiries { "contact": "A" * 10000, ... }` -> DENIED (size check).
7. **Client Timestamp**: `POST /inquiries { ..., "createdAt": "2026-01-01T00:00:00Z" }` -> DENIED (requires request.time).
8. **Owner Spoofing**: `POST /inquiries { ..., "ownerId": "ADMIN_UID" }` -> DENIED (Identity integrity).
9. **Role Escalation**: `POST /admins/MY_UID { "role": "admin" }` (as visitor) -> DENIED.
10. **Query Scraping**: `GET /inquiries` (as non-admin) -> DENIED.
11. **Site Content Key Exploit**: `PATCH /content/main { "secret_key": "1234" }` -> DENIED.
12. **Null PII Leak**: `GET /inquiries/anyId` (as non-admin) -> DENIED.

## Validation Results
- [x] Identity Spoofing blocked.
- [x] State Shortcutting blocked.
- [x] Resource Poisoning blocked.
- [x] Value Poisoning blocked.
