# Nsplit Architecture

Production architecture for the Nsplit expense-splitting platform.  
Built on existing `/web` (Next.js App Router, JavaScript, Tailwind) and `/Nsplit` (Expo SDK 54).

---

## 1. Final folder structure

```text
nsplit/
├── ARCHITECTURE.md
├── shared/                          # Pure domain (no React / Next / Expo)
│   ├── package.json
│   ├── index.js
│   ├── permissions/
│   │   ├── index.js
│   │   └── roles.js
│   ├── split/
│   │   ├── index.js
│   │   ├── equal.js
│   │   ├── exact.js
│   │   ├── percentage.js
│   │   ├── shares.js
│   │   ├── custom.js
│   │   └── rounding.js
│   ├── balance/
│   │   ├── index.js
│   │   └── engine.js
│   ├── categories/
│   │   ├── index.js
│   │   └── mapping.js
│   ├── money/
│   │   └── amount.js                # minor-unit helpers (cents)
│   └── sync/
│       ├── mutation-types.js
│       └── idempotency.js
│
├── web/                             # Next.js — UI + API backend
│   ├── src/
│   │   ├── app/
│   │   │   ├── (public)/            # marketing + auth pages
│   │   │   │   ├── page.js          # /
│   │   │   │   ├── features/
│   │   │   │   ├── how-it-works/
│   │   │   │   ├── about/
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   ├── (app)/               # protected app shell
│   │   │   │   ├── layout.js
│   │   │   │   ├── dashboard/
│   │   │   │   ├── groups/
│   │   │   │   │   ├── page.js
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.js              # Overview
│   │   │   │   │       ├── expenses/
│   │   │   │   │       ├── activity/
│   │   │   │   │       ├── members/
│   │   │   │   │       ├── transfers/
│   │   │   │   │       └── settings/
│   │   │   │   ├── profile/
│   │   │   │   └── notifications/
│   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── groups/
│   │   │   │   ├── notifications/
│   │   │   │   ├── attachments/
│   │   │   │   └── sync/route.js
│   │   │   ├── layout.js
│   │   │   └── globals.css
│   │   ├── components/
│   │   ├── lib/
│   │   │   ├── db.js                 # MongoDB connect + helpers
│   │   │   ├── models/               # Mongoose models
│   │   │   ├── auth/
│   │   │   ├── permissions/
│   │   │   ├── activity/
│   │   │   ├── expenses/
│   │   │   ├── api-response.js
│   │   │   └── validations/
│   │   └── middleware.js
│   ├── package.json
│   └── ...
│
└── Nsplit/                          # Expo mobile
    ├── app/
    │   ├── (auth)/
    │   │   ├── login.tsx
    │   │   └── signup.tsx
    │   ├── (tabs)/
    │   │   ├── index.tsx            # Home
    │   │   ├── groups.tsx
    │   │   ├── activity.tsx
    │   │   └── profile.tsx
    │   ├── group/[id]/
    │   │   ├── index.tsx            # Overview
    │   │   ├── expenses.tsx
    │   │   ├── activity.tsx
    │   │   ├── members.tsx
    │   │   ├── transfers.tsx
    │   │   ├── settings.tsx
    │   │   └── add-record.tsx       # Expense | Income | Transfer tabs
    │   └── _layout.tsx
    ├── src/
    │   ├── api/                     # thin HTTP client → Next.js APIs
    │   ├── db/                      # SQLite (expo-sqlite)
    │   │   ├── schema.ts
    │   │   ├── client.ts
    │   │   └── repositories/
    │   ├── sync/
    │   │   ├── queue.ts
    │   │   ├── processor.ts
    │   │   ├── conflict.ts
    │   │   └── network.ts
    │   ├── stores/                  # UI state (optional)
    │   ├── theme/
    │   │   └── colors.ts            # Indigo design tokens
    │   └── components/
    ├── constants/
    ├── components/
    └── package.json
```

**Rules**
- Business logic for splits, balances, permissions lives in `shared/` (or `web/src/lib` re-exporting shared).
- Next.js is the only backend. Expo never embeds duplicate authority logic.
- Web stays JavaScript. Expo stays TypeScript + Expo SDK 54.
- shadcn/ui + Indigo theme are added to `/web` without replacing Next/Tailwind.
- Mobile Indigo tokens mirror web CSS variables (NativeWind optional enhancement on existing theme layer).

---

## 2. MongoDB / Mongoose models

Amounts are **integer minor units**. ODM: **Mongoose**.

Models live in `web/src/models/` (one file each). Collections are minimized by embedding:

```text
users                 (+ embedded oauthAccounts)
sessions
passwordresets
groups                (+ embedded settings, members[], invitations[])
expenses              (+ embedded payers, participants, splits, attachments)
incomes               (+ embedded receivers, attachments)
transfers
activities
notifications
mutationlogs
```

No separate `groupmembers` / `groupinvitations` / `categories` / `attachments` collections.
Member refs inside expenses/transfers use embedded `members._id` from the group document.

---

## 3. Entity relationships

```text
User 1──* Session
User 1──* Group (createdBy)
User *──* Group via GroupMember
Group embeds settings
Group 1──* GroupInvitation
Group 1──* Expense (embeds payers / participants / splits)
Group 1──* Income (embeds receivers)
Group 1──* Transfer (fromMember → toMember)
Group 1──* Activity
User 1──* Notification
User 1──* MutationLog (idempotency)
User 1──* OAuthAccount (future Google)
```

**Cascade highlights**
- Delete Group → clean related members (app-level); expenses/incomes/transfers soft-delete via `deletedAt`.
- Expense embeds payers/participants/splits (no orphan child collections).
- Soft-delete expenses/incomes/transfers via `deletedAt` for sync/conflict safety.

---

## 4. Authentication architecture

### Goals
- Email/password now
- Google button visible but disabled / “Coming soon” (API returns 501)
- Extensible OAuth without redesign

### Flow
1. **Register** — validate (Zod) → hash password (bcrypt) → create User → create Session → set cookie / return token
2. **Login** — verify password → create Session → set cookie / return token
3. **Logout** — revoke Session
4. **Me** — resolve session → return user
5. **Forgot password** — create `PasswordResetToken` (hashed), email link (dev: log token)
6. **Reset password** — validate token → update hash → invalidate token + sessions

### Session transport
| Client | Transport |
|--------|-----------|
| Web | `httpOnly` `Secure` `SameSite=Lax` cookie `nsplit_session` |
| Mobile | `Authorization: Bearer <opaqueToken>` + SecureStore |

Server stores **hashed** session tokens only. Same `Session` model for both.

### Middleware / guards
- Next.js middleware: protect `/dashboard`, `/groups`, `/profile`, `/notifications`
- API: `requireAuth()` on every protected route
- Future: `POST /api/auth/google` stubs to `{ error: "Not implemented" }` status 501

---

## 5. Permission architecture

### Roles (hierarchical)

| Permission | View | Add records | Edit/Delete records | Manage members/settings |
|------------|------|-------------|---------------------|-------------------------|
| VIEW_ONLY  | ✓    |             |                     |                         |
| ADD        | ✓    | ✓           |                     |                         |
| EDIT       | ✓    | ✓           | ✓                   |                         |
| ADMIN      | ✓    | ✓           | ✓                   | ✓                       |

### Enforcement
```text
shared/permissions → can(permission, action)
web/src/lib/permissions → assertGroupPermission(userId, groupId, action)
```

Every mutating API calls `assertGroupPermission` **before** DB writes.  
UI may hide actions; server is authoritative.

### Member add modes
1. **Add without notification** — create `GroupMember` if user exists (ADMIN)
2. **Invite/notify** — create `GroupInvitation` + `Notification`
3. **Add existing user** — lookup by email → membership

---

## 6. Split calculation architecture

Location: `shared/split/` — pure functions, no React.

```text
calculateSplit({
  method,          // EQUAL | EXACT | PERCENTAGE | SHARES | CUSTOM
  totalMinor,      // integer
  participants: [{ memberId, inputValue? }]
}) → {
  splits: [{ memberId, amountMinor, inputValue }],
  remainderDistributed: boolean,
  valid: boolean,
  errors: string[]
}
```

### Method rules
- **EQUAL** — floor division + distribute remainder (±1) by stable memberId order
- **EXACT / CUSTOM** — sum(inputs) must equal `totalMinor`
- **PERCENTAGE** — sum(percents) === 100; convert to minor with largest-remainder
- **SHARES** — amount ∝ shares; largest-remainder rounding

### Group defaults
`GroupSettings.defaultSplitMethod` + `defaultSplitConfig` seed new expense forms.  
User can override per expense. Server recalculates and validates; client preview only.

### Multiple payers (separate from split)
```text
validatePayers({ totalMinor, payers: [{ memberId, amountMinor }] })
→ sum(payers) === totalMinor
```

---

## 7. Balance calculation architecture

Location: `shared/balance/` — pure; server wraps with DB load.

```text
computeGroupBalances({
  members,
  expenses: [{ payers, splits, deletedAt }],
  incomes: [{ receivers, deletedAt }],
  transfers: [{ fromMemberId, toMemberId, amountMinor, deletedAt }]
}) → {
  byMemberId: {
    paidMinor,
    owedMinor,
    incomeMinor,
    transferredOutMinor,
    transferredInMinor,
    netMinor,          // +credit / −debt
  },
  pairwise: [{ from, to, amountMinor }] // simplified optional later
}
```

**Net formula (per member)**  
`net = paid − owed + incomeShare + transferredOut − transferredIn`

A transfer from A → B means A paid B (settlement): A's net rises, B's net falls.

Authoritative balances always come from `GET /api/groups/:id/balance`.  
Clients may preview locally; never persist client-computed balances as truth.

---

## 8. Offline local database architecture (Expo)

**Engine:** `expo-sqlite` (SDK 54 compatible)  
**Not** AsyncStorage as primary store.

### Local tables (mirror + sync meta)
- `users_cache`, `groups`, `group_members`, `group_settings`
- `expenses`, `expense_payers`, `expense_participants`, `expense_splits`
- `incomes`, `income_receivers`, `transfers`, `activities`
- `sync_queue`, `sync_state`, `conflicts`

### Local IDs
- Optimistic records use `local_*` or UUID `clientMutationId`
- After sync, map `serverId` ↔ `localId`

### Read path
1. UI reads SQLite first (instant)
2. Background pull when online refreshes cache

### Write path (offline-first)
1. Write to SQLite immediately
2. Enqueue mutation in `sync_queue`
3. Mark row `syncStatus = pending`
4. Processor drains queue when online

---

## 9. Sync architecture

### Client queue item
```json
{
  "mutationId": "uuid",
  "type": "expense.create",
  "entity": "expense",
  "payload": { ... },
  "clientTimestamp": "ISO",
  "baseVersion": 3,
  "retries": 0,
  "status": "pending"
}
```

### Server `POST /api/sync`
1. Authenticate
2. For each mutation (transactional batch or per-item txn):
   - Idempotency: if `mutationId` in `MutationLog` → return prior result (`DUPLICATE`)
   - Authorize
   - Validate with Zod + domain engines
   - Version check: if `baseVersion < server.version` and fields conflict → `CONFLICT` (do not overwrite)
   - Apply write + bump `version`
   - Write `Activity` + `MutationLog`
3. Return `{ results[], entities[] }`

### Reliability
- Exponential backoff: 1s, 2s, 4s, … cap 5m
- Persist queue across app restart
- Network listener auto-drains
- Subtle status: Offline → Syncing → Synced / Sync failed

### Conflict policy (v1)
- Server authoritative
- Conflicting mutation marked `CONFLICT`
- Local copy retained for future resolution UI
- No CRDTs

---

## 10. API endpoint structure

### Auth
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/register` | |
| POST | `/api/auth/login` | |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/me` | |
| POST | `/api/auth/forgot-password` | |
| POST | `/api/auth/reset-password` | |
| POST | `/api/auth/google` | **501 stub** |

### Users
| Method | Path |
|--------|------|
| GET/PATCH | `/api/users/me` |
| GET | `/api/users/search?email=` |

### Groups
| Method | Path |
|--------|------|
| GET/POST | `/api/groups` |
| GET/PATCH/DELETE | `/api/groups/:id` |
| GET/PATCH | `/api/groups/:id/settings` |
| GET | `/api/groups/:id/balance` |
| GET | `/api/groups/:id/activity` |

### Members & invitations
| Method | Path |
|--------|------|
| GET/POST | `/api/groups/:id/members` |
| PATCH/DELETE | `/api/groups/:id/members/:memberId` |
| GET/POST | `/api/groups/:id/invitations` |
| POST | `/api/groups/:id/invitations/:inviteId/accept` |
| POST | `/api/groups/:id/invitations/:inviteId/revoke` |

### Records
| Method | Path |
|--------|------|
| GET/POST | `/api/groups/:id/expenses` |
| GET/PATCH/DELETE | `/api/groups/:id/expenses/:expenseId` |
| GET/POST | `/api/groups/:id/income` |
| GET/PATCH/DELETE | `/api/groups/:id/income/:incomeId` |
| GET/POST | `/api/groups/:id/transfers` |
| GET/PATCH/DELETE | `/api/groups/:id/transfers/:transferId` |

### Other
| Method | Path |
|--------|------|
| GET/POST | `/api/notifications` |
| PATCH | `/api/notifications/:id/read` |
| POST | `/api/attachments` |
| POST | `/api/sync` |

### Common headers
- `Authorization: Bearer …` (mobile)
- Cookie session (web)
- `Idempotency-Key` / body `mutationId` for mutating offline-capable endpoints
- `X-Device-Id` optional

### Response shape
```json
{ "data": {}, "error": null, "meta": {} }
```

---

## Design tokens (Indigo)

Shared semantic colors for web CSS variables and Expo `theme/colors.ts`:

| Token | Light | Dark |
|-------|-------|------|
| primary | `#6366F1` | `#818CF8` |
| success | `#10B981` | `#34D399` |
| warning | `#F59E0B` | `#F59E0B` |
| danger | `#F43F5E` | `#F43F5E` |
| background | `#F8FAFC` | `#0B1020` |
| surface | `#FFFFFF` | `#111827` |
| soft | `#F1F5F9` | `#182033` |
| border | `#E2E8F0` | `#263247` |
| text | `#0F172A` | `#F8FAFC` |
| textMuted | `#64748B` | `#94A3B8` |

Financial: positive → emerald; owes → soft rose; pending → amber; settled → neutral.

---

## Implementation phases

1. Architecture + MongoDB/Mongoose models
2. Authentication
3. Groups + members + permissions
4. Split engine
5. Balance engine
6. Expenses + multi-payer
7. Income + transfers
8. Activity
9. Web dashboard
10. Expo mobile UI
11. Mobile SQLite
12. Offline queue
13. Sync API
14. Conflict / idempotency
15. Notifications
16. Testing + polish

---

## Existing setup notes

| Area | Status | Approach |
|------|--------|----------|
| Next.js App Router + JS + Tailwind | Present | Preserve; add Mongoose, Zod, Indigo |
| MongoDB + Mongoose | Replaced Prisma | `MONGODB_URI`, models in `web/src/lib/models` |
| Expo SDK 54 | Present | Preserve; do not migrate |
| NativeWind | Mentioned, not in package.json | Prefer theme tokens first |
| Shared domain | Present | `shared/` package for engines |
```
