# OneDish Code Review Report

Scope: `/root/.openclaw/workspace/OneDish` (focused on backend correctness, security, data consistency, concurrency, API contract risks)

## Findings

### [critical] Async route error handling is broken in Express 4 (`throw` in async handlers bypasses centralized error middleware)
- **Files**:
  - `backend/src/routes/search.routes.ts` (multiple `throw createError(...)` and `throw error` in `async` route handlers)
  - `backend/package.json` (`express` is `^4.18.2`)
- **Why this is risky**:
  - In Express 4, rejected promises/throws in async handlers are not reliably forwarded to `errorHandler` unless wrapped with `next(err)` or using `express-async-errors`.
  - This can cause unhandled promise rejections, inconsistent 500 behavior, and requests hanging/crashing under certain error paths.
- **Exact fix**:
  1. Add `next: NextFunction` to each async route.
  2. Replace `throw ...` inside handlers/catch blocks with `return next(err)`.
  3. Or add `express-async-errors` globally and still avoid `throw error` in catch; use `next(error)` for clarity.

---

### [high] Idempotency Lua script has race condition; duplicate requests can both proceed
- **File**: `backend/src/services/redis.service.ts` (`evalIdempotencyBegin`)
- **Why this is risky**:
  - Script path:
    - If key missing, it does `SET ... NX` but does **not** check the result.
    - Under concurrency, two requests can both see missing key; one `SET` succeeds, one fails, but both return `{'proceed'}`.
  - This defeats idempotency guarantees for write-like operations.
- **Exact fix**:
  - Check `SET` return value:
    - `local ok = redis.call('SET', idem_key, pending, 'EX', ttl, 'NX')`
    - `if ok then return {'proceed'} end`
    - if not ok, re-read and return `replay`/`conflict` based on stored fp/status.
  - Optional: simplify to one atomic path with a Lua compare-and-set flow that always branches on actual write result.

---

### [high] Logout/token blacklist model is ineffective for access tokens and refresh-token rotation
- **Files**:
  - `backend/src/controllers/auth.controller.ts`
  - `backend/src/middleware/auth.ts`
  - `backend/src/routes/auth.routes.ts`
- **Why this is risky**:
  - `logout` adds current bearer token to blacklist, but `authenticate` never checks blacklist => logged-out access tokens remain usable until expiry.
  - `refreshToken` issues new refresh token but does not revoke/blacklist old refresh token => replay/parallel reuse window.
  - `logout` route is not protected by `authenticate` despite comment saying it should be.
- **Exact fix**:
  1. In `authenticate`, query blacklist (or cached blacklist digest) and reject blacklisted JWTs.
  2. On refresh, blacklist consumed refresh token (rotation with one-time use semantics).
  3. Protect `/auth/logout` with `authenticate` and optionally accept `refresh_token` body for explicit revocation.
  4. Prefer storing token hash (e.g., SHA-256) in blacklist instead of raw token string.

---

### [medium] JWT payload/API contract mismatch causes authenticated users to be treated as anonymous in quota/search paths
- **Files**:
  - `backend/src/types/index.ts` (`JwtPayload` uses `user_id`)
  - `backend/src/routes/quota.routes.ts` (reads `req.user?.userId || req.user?.id`)
  - `backend/src/routes/search.routes.ts` (same pattern)
  - `backend/src/types/express.d.ts` (Request user shape missing `user_id`)
- **Why this is risky**:
  - Tokens carry `user_id`, but these routes read camelCase fields.
  - Result: user identification falls back to `anon_<ip>`, breaking per-user quota accounting and producing inconsistent behavior.
- **Exact fix**:
  1. Unify request user contract to include `user_id` in `express.d.ts`.
  2. Update all reads to a single helper, e.g. `const userId = req.user?.user_id`.
  3. Add regression test for authenticated `/quota/status` and `/search/resolve` to confirm quota buckets are per-user.

---

### [medium] Public diagnostics endpoints expose internals and are expensive in dev mode
- **File**: `backend/src/routes/system.routes.ts`
- **Why this is risky**:
  - `/database` in non-prod returns full table counts and per-recipe integrity details (potential data exposure, high query load).
  - No auth/authorization gate on system endpoints.
- **Exact fix**:
  - Require admin auth for `/system/database` and `/system/stats` (and ideally all `/system/*` except shallow health).
  - Keep output minimal in all environments (remove per-row detail from API; move deep checks to internal scripts).

---

### [low] ID generation by `Date.now()` can collide under concurrent writes
- **File**: `backend/src/routes/pairing.routes.ts` (`/save`, `const id = \`recipe_${Date.now()}\``)
- **Why this is risky**:
  - Two requests in the same millisecond can generate identical IDs, causing insert failure and nondeterministic 500s.
- **Exact fix**:
  - Use DB-generated UUID/ULID (preferred) or `crypto.randomUUID()`.
  - Align ID strategy with other tables/migrations for consistency.

---

## Quick Risk Prioritization
1. **Critical**: async error path in Express 4 (`search.routes.ts`)  
2. **High**: idempotency race in Redis Lua script  
3. **High**: auth token revocation/rotation gaps  
4. **Medium**: JWT field mismatch -> wrong quota identity  
5. **Medium**: open diagnostic endpoints/data exposure  
6. **Low**: `Date.now()` ID collision risk

## Notes
- No files were modified (review-only), except creating this report as requested.
- I did not run heavy tests; findings are from static review and API/runtime behavior analysis.