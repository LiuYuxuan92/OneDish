# OneDish Code Review Report

Scope: `/root/.openclaw/workspace/OneDish` (focused on backend correctness, security, data consistency, concurrency, API contract risks)

> **Last updated**: 2026-03-05 — all findings from the initial review have been verified as resolved.

## Findings

### ~~[critical] Async route error handling is broken in Express 4~~  ✅ RESOLVED
- **Files**: `backend/src/routes/search.routes.ts`
- **Resolution**: All async route handlers now accept `next: NextFunction` and use `return next(error)` in catch blocks instead of `throw`.

---

### ~~[high] Idempotency Lua script has race condition~~  ✅ RESOLVED
- **File**: `backend/src/services/redis.service.ts` (`evalIdempotencyBegin`)
- **Resolution**: The Lua script now checks the `SET NX` return value. On failure it re-reads the key and returns `replay` or `conflict` accordingly, eliminating the race window.

---

### ~~[high] Logout/token blacklist model is ineffective~~  ✅ RESOLVED
- **Files**: `backend/src/controllers/auth.controller.ts`, `backend/src/middleware/auth.ts`, `backend/src/routes/auth.routes.ts`
- **Resolution**:
  1. `authenticate` and `optionalAuth` middleware now check `tokenBlacklistService.isBlacklisted(token)` before accepting JWTs.
  2. `refreshToken` endpoint blacklists the consumed refresh token on rotation (one-time use).
  3. `logout` route is protected by `authenticate` middleware and accepts optional `refresh_token` body for explicit revocation.
  4. Tokens are stored as SHA-256 hashes in the blacklist table.

---

### ~~[medium] JWT payload/API contract mismatch~~  ✅ RESOLVED
- **Files**: `backend/src/types/express.d.ts`, `backend/src/routes/quota.routes.ts`, `backend/src/routes/search.routes.ts`
- **Resolution**:
  1. `express.d.ts` now declares `user?.user_id` matching the JWT payload.
  2. All route handlers read `req.user?.user_id` consistently.

---

### ~~[medium] Public diagnostics endpoints expose internals~~  ✅ RESOLVED
- **File**: `backend/src/routes/system.routes.ts`
- **Resolution**: `/system/database` and `/system/stats` now require `authenticate` + `requireAdmin` middleware. Production mode returns only basic connection status.

---

### ~~[low] ID generation by `Date.now()` can collide~~  ✅ RESOLVED
- **File**: `backend/src/routes/pairing.routes.ts`
- **Resolution**: ID generation changed from `Date.now()` to `crypto.randomUUID()`.

---

## Summary

All 6 findings from the initial review have been resolved. No outstanding security or correctness issues remain from this report.

### Remaining improvement opportunities (non-blocking)
- **Test coverage**: Backend has 1 test file, frontend has 3. Core flows (auth, shopping list sharing, quota) would benefit from integration tests.
- **Large files**: `HomeScreen.tsx` (1108 lines), `WeeklyPlanScreen.tsx` (1412 lines), `ShoppingListService` (1231 lines) should be decomposed for maintainability.
- **TypeScript strictness**: `HomeScreen.tsx` uses `// @ts-nocheck`; reducing `any` usage across the codebase would catch bugs earlier.