# Repository Rule

## Use When

Use this rule when adding or changing command-side persistence for an aggregate root.

Use `query.md` for read-only use cases. Query Handlers and command-side handlers query read-model or supporting data directly with Prisma, provided the current module owns the accessed Prisma models.

## Role

A Repository is a concrete Prisma-backed persistence component responsible for loading and saving aggregates.

Repositories sit on the command side. They encapsulate aggregate persistence concerns, use mappers to translate between Prisma records and domain entities, and keep persistence details out of Application Services and entities.

## Repo Convention

- Create one repository per aggregate root.
- Repositories are concrete classes by default.
- Repositories are NestJS providers decorated with `@Injectable()`.
- Command-side Application Services may depend on concrete Prisma-backed repositories.
- This codebase does not introduce repository ports/interfaces by default.
- Query Handlers and command-side supporting reads bypass repositories and read directly with `PrismaService` or the active Prisma transaction client.
- Repositories use mappers for domain ↔ persistence translation.
- Repository methods may accept an optional Prisma transaction client or project transaction context.
- Transaction participation does not change the operation's name. Use `findById(..., tx)` and `save(entity, tx)`, not `findByIdWithinTransaction()` or `saveWithinTransaction()`.

Introduce a port/interface only when it provides concrete value, such as multiple implementations, external dependency isolation, an anti-corruption boundary, a stable public module contract, or a test seam that cannot be handled otherwise. The goal is aggregate persistence clarity, not database swapability theatre.

## Must Do

- Load aggregates as domain entities.
- Save aggregates back to persistence.
- Persist child entities through the aggregate root repository.
- Use straightforward aggregate persistence methods such as `findById()`, `load()`, and `save()`.
- A repository read must reconstitute an aggregate root or entity that the use case needs in order to invoke business behavior.
- Load all children and Value Objects required to make that aggregate behaviorally complete.
- Use mappers instead of inline persistence/domain translation.
- Accept a Prisma transaction client or project transaction context when participating in an Application Service transaction.
- Prefer persisted normalized columns and database constraints when uniqueness depends on normalized values such as trimmed/case-insensitive names or serial numbers.

## Must Not Do

- Do not create repositories for every child entity inside an aggregate.
- Do not introduce `IRepository`, `OrderRepositoryPort`, or similar abstractions by default.
- Do not use repositories for read models or command-supporting data that does not reconstitute an aggregate/entity for behavior.
- Do not add repository methods for existence checks, uniqueness checks, impact analysis, affected-record IDs, counts, reporting, dropdown options, projections, or other scalar/partial-record reads. Query module-owned models directly through Prisma instead.
- Do not use a repository to access models owned by another module (see `docs/architecture/overview.md` for full cross-module access rules).
- Do not enforce domain rules inside repositories.
- Do not make business decisions inside repositories.
- Do not scatter persistence translation details into Application Services.
- Do not load broad collections for high-cardinality uniqueness checks unless it is an explicit, temporary trade-off.
- Do not encode transaction context in method names with suffixes such as `WithinTransaction`.

## Minimal Shape

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';

import { BookingEntity } from '../domain/booking.entity';
import { BookingMapper } from './booking.mapper';

@Injectable()
export class BookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BookingEntity | null> {
    const db = tx ?? this.prisma;
    const record = await db.booking.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    return record ? BookingMapper.toDomain(record) : null;
  }

  async save(entity: BookingEntity, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx ?? this.prisma;
    await db.booking.upsert({
      where: { id: entity.id },
      create: BookingMapper.toPersistence(entity),
      update: BookingMapper.toUpdateData(entity),
    });
  }
}
```

## Examples

### Correct: one repository per aggregate root

```typescript
export class OrderRepository {
  async findById(id: string, tenantId: string): Promise<OrderEntity | null> { ... }
  async save(order: OrderEntity): Promise<void> { ... }
}
```

### Wrong: repository per child entity inside the same aggregate

```typescript
export class OrderLineRepository {}
export class OrderNoteRepository {}
export class OrderRepository {}
```

### Correct: repository uses mapper

```typescript
const record = await this.prisma.order.findUniqueOrThrow({ where: { id } });
return OrderMapper.toDomain(record);
```

### Wrong: Application Service owns persistence translation details

```typescript
const record = await this.prisma.order.findUniqueOrThrow({ where: { id } });
const order = OrderEntity.reconstitute({ ...record });
```

### Correct: supporting command read bypasses the repository

```typescript
await this.prisma.$transaction(async (tx) => {
  const duplicate = await tx.ratePlan.findFirst({
    where: { tenantId, normalizedName, id: { not: ratePlanId } },
    select: { id: true },
  });

  const affectedOfferIds = await tx.rentalOfferRatePlan.findMany({
    where: { ratePlanId },
    select: { rentalOfferId: true },
  });

  const ratePlan = await this.ratePlanRepository.findById(ratePlanId, tenantId, tx);
  ratePlan.correct(command.name, command.tiers);
  await this.ratePlanRepository.save(ratePlan, tx);
});
```

This is valid only when the current module owns all queried models (see `docs/architecture/overview.md` for cross-module access rules).

### Wrong: repository methods for existence and impact reads

```typescript
await this.ratePlanRepository.findIdByName(tenantId, normalizedName, tx);
await this.ratePlanRepository.findAffectedRentalOfferIds(ratePlanId, tx);
```

Neither method reconstitutes the RatePlan aggregate for behavior.

### Correct: Query Handler bypasses repository for a read model

```typescript
const rows = await this.prisma.order.findMany({
  where: { tenantId },
  select: { id: true, status: true, createdAt: true },
});
```

### Wrong: forcing a read model through an aggregate repository without need

```typescript
const orders = await this.orderRepository.findAllForDashboard(tenantId);
return orders.map(OrderPresenter.toDashboardRow);
```

## Related Rules

- `mapper.md`
- `aggregate.md`
- `entity.md`
- `application-service.md`
- `query.md`
- `domain-event.md`
- `error-handling-problem-details.md`
