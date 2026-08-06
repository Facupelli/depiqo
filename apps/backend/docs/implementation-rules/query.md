# Query and Query Handler Rule

## Use When

Use this rule when adding or changing a read-only backend use case, including the Query object and its Query Handler.

Use `command.md` instead for state-changing use cases.

## Role

A Query represents a user's intent to retrieve data. A Query Handler executes it and returns the requested read model.

Queries are read-only. They must never mutate state, write to the database, or trigger side effects.

Query Handlers are deliberately allowed to bypass aggregate repositories and read directly with Prisma. Read models do not need to pass through entities, aggregates, or mappers. Direct Prisma access is limited to models owned by the Query Handler's module.

## Repo Convention

- One Query class per read use case.
- One `@QueryHandler` per Query.
- Query classes are plain classes with `readonly` properties and a single constructor.
- Query Handlers are decorated with `@QueryHandler(TheQuery)` and implement `IQueryHandler<TQuery, TResult>`.
- Query Handlers inject `PrismaService` directly by default for models owned by their module (see `docs/architecture/overview.md` for cross-module access rules).
- Cross-module reads go through the owning module's public API or a local projection explicitly owned by the consuming module (see `docs/architecture/overview.md`).
- Query Handlers return caller-shaped read models.
- Query Handlers usually bypass repositories, aggregates, and mappers.
- Tenant-scoped queries must include `tenantId`.

## Must Do

- Keep Queries and Query Handlers read-only.
- Keep Query objects free of methods, validation, and business logic.
- Use primitives in Query objects: IDs, strings, enums, filters, and pagination params.
- Verify model ownership before every Prisma query (see `docs/architecture/overview.md`).
- Select only the fields needed from Prisma.
- Return explicit read model shapes instead of blindly returning persistence records.
- For paginated list queries, return `data`, `total`, `page`, and `pageSize`.
- Always filter tenant-scoped data by `tenantId`.

## Must Not Do

- Do not mutate state in a Query Handler.
- Do not write to the database from a Query Handler.
- Do not trigger side effects from a Query Handler.
- Do not instantiate aggregates for normal read models.
- Do not use domain mappers in a Query Handler by default.
- Do not call Domain Services in a Query Handler by default.
- Do not route read models through command-side repositories by default.
- Do not query another module's owned Prisma models directly (see `docs/architecture/overview.md` for full cross-module access rules).
- Do not return raw Prisma records blindly.
- Do not omit tenant scoping for tenant-scoped data.

Exception: if a read truly requires domain computation that cannot be expressed cleanly otherwise, use domain objects intentionally and sparingly.

## Minimal Shape

```typescript
export class FindBookingsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly status?: string,
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
  ) {}
}
```

```typescript
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { FindBookingsQuery } from './find-bookings.query';

export interface BookingListItem {
  id: string;
  equipmentId: string;
  customerId: string;
  status: string;
  startDate: Date;
  endDate: Date;
}

export interface FindBookingsResult {
  data: BookingListItem[];
  total: number;
  page: number;
  pageSize: number;
}

@QueryHandler(FindBookingsQuery)
export class FindBookingsQueryHandler implements IQueryHandler<FindBookingsQuery, FindBookingsResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: FindBookingsQuery): Promise<FindBookingsResult> {
    const { tenantId, status, page, pageSize } = query;

    const where = {
      tenantId,
      ...(status ? { status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        select: {
          id: true,
          equipmentId: true,
          customerId: true,
          status: true,
          periodStart: true,
          periodEnd: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: data.map((record) => ({
        id: record.id,
        equipmentId: record.equipmentId,
        customerId: record.customerId,
        status: record.status,
        startDate: record.periodStart,
        endDate: record.periodEnd,
      })),
      total,
      page,
      pageSize,
    };
  }
}
```

## Examples

### Correct: Query Handler reads directly from Prisma

```typescript
async execute(query: GetBookingByIdQuery): Promise<BookingDetail | null> {
  const record = await this.prisma.booking.findUnique({
    where: { id: query.bookingId, tenantId: query.tenantId },
    select: { id: true, status: true, periodStart: true, periodEnd: true },
  });

  if (!record) return null;

  return {
    id: record.id,
    status: record.status,
    startDate: record.periodStart,
    endDate: record.periodEnd,
  };
}
```

### Wrong: mapping aggregates just to build a read model

```typescript
const record = await this.prisma.booking.findUnique({ where: { id: query.bookingId } });
const entity = BookingMapper.toDomain(record);
return BookingPresenter.toResponse(entity);
```

### Correct: always filtering by `tenantId`

```typescript
const bookings = await this.prisma.booking.findMany({
  where: { tenantId: query.tenantId, status: query.status },
});
```

### Wrong: querying without tenant scope

```typescript
const bookings = await this.prisma.booking.findMany({
  where: { status: query.status },
});
```

## Related Rules

- `command.md`
- `controller.md`
- `request-dto.md`
- `response-dto.md`
- `repository.md`
- `mapper.md`
- `error-handling-problem-details.md`
