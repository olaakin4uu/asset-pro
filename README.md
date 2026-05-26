# AssetPro

**Standalone Fixed Asset Management Platform**

Multi-tenant, IFRS-compliant fixed asset management with full depreciation engine, disposal workflows, transfer tracking, maintenance scheduling, and GL integration.

## Stack

- **Backend**: NestJS 11, TypeScript 5, PostgreSQL (schema-per-tenant), Prisma 7
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript 5, TanStack Query, Tailwind CSS, PrimeReact
- **Auth**: JWT (15-min access token + refresh), Passport.js

## Modules

| Module | Description |
|--------|-------------|
| Auth | Login, JWT, refresh tokens, 2FA |
| Core | Users, companies, branches, roles, permissions, approval workflows |
| Accounts | Chart of accounts (IFRS), journal entries, fiscal years, currencies, banks |
| Assets | Asset classes, fixed assets, depreciation, disposals, transfers, maintenance |
| Registration | Self-signup, tenant provisioning, schema-per-tenant setup |

## Quick Start

```bash
# Backend
cd assetprobackend
cp .env.example .env   # fill in DATABASE_URL + JWT_SECRET
npm install
npm run prisma:push    # push public schema
npm run start:dev

# Frontend (Phase 5)
cd assetprofrontend
cp .env.local.example .env.local
npm install
npm run dev
```

## Architecture

Each registered organisation gets its own PostgreSQL schema (`tenant_<slug>`), provisioned automatically at sign-up. The backend routes every request to the correct schema using the JWT `tenantSlug` claim.

See `/assetprobackend/.env.example` for all configuration options.
