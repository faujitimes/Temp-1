# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Safety Net**: Every path not explicitly matched is denied for all reads and writes.
2. **Verified Admin-Only Mutations**: Only authenticated users with `email_verified == true` who are either the bootstrapped owner (`faujitimes@gmail.com`) or listed in `/admins/{request.auth.uid}` can create, update, or delete CMS content (`siteConfig`, `circulars`, `news`).
3. **Privilege Isolation (`/admins`)**: Only the bootstrapped owner (`faujitimes@gmail.com` with `email_verified == true`) can create, update, delete, or list `/admins` documents. Non-owner users cannot self-assign admin roles or list admin emails (PII).
4. **Immutable Ownership & Temporal Integrity**:
   - `createdAt` and `authorId` (or `addedBy`) are immutable after creation.
   - `createdAt == request.time` on creation and `updatedAt == request.time` on every write.
   - `updatedBy` / `authorId` / `addedBy` must match `request.auth.uid`.
5. **Strict Schema & Volumetric Boundaries**: Every document enforces `keys().hasAll(...)` and `keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, strict type checks, `.size()` bounds on all strings, and `isValidId()` on every single-document path ID.
6. **Query Enforcement**: `allow list` on `/circulars` and `/news` enforces `resource.data.isPublished == true` (or `isSuperAdmin()`), never allowing blanket unguarded list queries or `get()`/`exists()` inside `allow list`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Write to `siteConfig/main`**: `{ "homeHeroTitle": "Hacked" }` with `auth = null` -> DENIED.
2. **Unverified Email Spoof**: Auth with `email: "faujitimes@gmail.com"`, `email_verified: false` writing to `/siteConfig/main` -> DENIED.
3. **Self-Privilege Escalation on `/admins/{uid}`**: Signed-in non-admin user attempts `setDoc(/admins/attackerUid, { role: "admin", email: "attacker@example.com", ... })` -> DENIED.
4. **PII Scraping via `list` on `/admins`**: Signed-in non-super-admin attempts `getDocs(collection(db, "admins"))` -> DENIED.
5. **Shadow / Ghost Field Injection on `/circulars/{id}`**: Admin attempts create with extra field `isVerified: true` -> DENIED by `keys().hasOnly(...)`.
6. **Value Poisoning on `/circulars/{id}`**: Admin attempts update of `title` with a 5000-character string (`> 300`) or wrong type (`12345`) -> DENIED by `isValidCircular()`.
7. **ID Poisoning on `/circulars/{badId}`**: Admin attempts create with path ID containing spaces, slashes, or >128 chars -> DENIED by `isValidId(circularId)`.
8. **Forged Timestamp on `/news/{id}`**: Admin attempts create with client-supplied `createdAt` not equal to `request.time` -> DENIED.
9. **Identity Spoofing on `/news/{id}`**: Admin attempts create with `authorId: "someone_else"` != `request.auth.uid` -> DENIED.
10. **Immutable Field Tampering on `/news/{id}`**: Admin attempts update altering `authorId` or `createdAt` -> DENIED.
11. **Unguarded List Query on `/circulars`**: Public visitor queries `collection(db, "circulars")` without `where("isPublished", "==", true)` -> DENIED by `allow list: if existing().isPublished == true || isSuperAdmin()`.
12. **SiteConfig Enumeration / Non-main Doc Write**: Attempt `list` on `/siteConfig` or `setDoc(/siteConfig/evil, ...)` -> DENIED (`allow list: if false`, `configId == 'main'`).
