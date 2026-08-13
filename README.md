# Nsplit

Modern expense splitting for groups - web (Next.js) + mobile (Expo SDK 54).

## Docs

See [ARCHITECTURE.md](./ARCHITECTURE.md) for folder structure, schema, auth, permissions, split/balance engines, offline sync, and API map.

## Apps

| Path | Stack |
|------|--------|
| `web/` | Next.js App Router, JavaScript, Tailwind, **MongoDB + Mongoose**, Zod |
| `Nsplit/` | Expo SDK 54, React Native, SQLite offline queue |
| `shared/` | Pure domain engines (split, balance, permissions, categories) |

## Quick start (web)

1. Start MongoDB locally (or use Atlas)
2. Copy `web/.env.example` → `web/.env` and set `MONGODB_URI`
3. From `web/`:

```bash
npm install
npm run dev
```

4. Open http://localhost:3000 - sign up, create a group, add expenses

Default local URI:

```text
mongodb://127.0.0.1:27017/nsplit
```

Collections are created automatically on first write (no migrate/push step).

## Tests

```bash
cd shared && node --test
# or from web:
npm test
```

## Mobile

```bash
cd Nsplit
npm install
# set EXPO_PUBLIC_API_URL to your Next.js origin
npx expo start
```

Offline sync modules live under `Nsplit/src/db` and `Nsplit/src/sync`.
