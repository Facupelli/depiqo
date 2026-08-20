# Equipment Rental SaaS

B2B multi-tenant platform for equipment rental businesses. Manages inventory, bookings, pricing, and billing with support for both serialized assets and bulk stock.

## Tech Stack

| Layer      | Technology                |
| ---------- | ------------------------- |
| Backend    | NestJS (modular monolith) |
| Frontend   | TanStack Start (React)    |
| Database   | PostgreSQL + Prisma       |
| Auth       | Passport JWT              |
| Queue      | BullMQ + Redis            |
| Validation | Zod                       |

## Architecture Highlights

- **Multi-tenancy**: Row-level security with `tenant_id` column on every table
- **Modular monolith**: Clear module boundaries (Inventory, Rental, Pricing, Billing, Users) ready for microservice extraction
- **Pragmatic DDD**: Aggregates, entities, value objects, and domain services enforce business invariants
- **CQRS**: Command/query separation — aggregates for writes, read models for queries
- **Temporal data**: PostgreSQL `tstzrange` for booking/rental periods with exclusion constraints
- **BFF pattern**: TanStack Start frontend acts as BFF, enabling SSR with streaming while hiding backend API
- **API errors**: RFC 7807 Problem Details for standardized error responses
- **Observability**: Canonical logging with Pino — structured JSON logs with request correlation

## Project Structure

```
equipment-rental-2/
├── apps/
│   ├── backend/     # NestJS API (port 3001)
│   └── web/         # TanStack Start frontend (port 3000)
├── packages/
│   ├── types/       # Shared TypeScript interfaces
│   ├── api-contracts/ # Shared API contracts and Zod schemas
│   └── ...
```

## Documentation

- [Backend README](./apps/backend/README.md) — Detailed architecture decisions (ADR)
- [Database Schema](./apps/backend/DB_README.md) — Schema documentation with diagrams
- [Canonical Logging](./apps/backend/CANONICAL_LOGGING.md) — Logging pattern explanation
