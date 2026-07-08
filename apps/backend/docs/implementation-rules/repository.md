# Repository Rule

## Use When

Use this rule when adding or changing command-side persistence for an aggregate root.

Use `query.md` for read-model database access. Query Handlers normally inject `PrismaService` directly instead of using repositories.

## Role

A Repository is a concrete Prisma-backed persistence component responsible for loading and saving aggregates.

Repositories sit on the command side. They encapsulate aggregate persistence concerns, use mappers to translate between Prisma records and domain entities, and keep persistence details out of Application Services and entities.

## Repo Convention

- Create one repository per aggregate root.
- Repositories are concrete classes by default.
- Repositories are NestJS providers decorated with `@Injectable()`.
- Command-side Application Services may depend on concrete Prisma-backed repositories.
- This codebase does not introduce repository ports/interfaces by default.
- Query Handlers usually bypass repositories and read directly with `PrismaService`.
- Repositories use mappers for domain ↔ persistence translation.
- Repositories may participate in Prisma transactions or a project transaction context when needed.

Introduce a port/interface only when it provides concrete value, such as multiple implementations, external dependency isolation, an anti-corruption boundary, a stable public module contract, or a test seam that cannot be handled otherwise. The goal is aggregate persistence clarity, not database swapability theatre.

## Must Do

- Load aggregates as domain entities.
- Save aggregates back to persistence.
- Persist child entities through the aggregate root repository.
- Use straightforward aggregate persistence methods such as `findById()`, `load()`, `save()`, or focused aggregate-loading helpers.
- Add domain-shaped helper methods only when they genuinely help a command-side use case load the aggregate state it needs.
- Use mappers instead of inline persistence/domain translation.
- Accept a Prisma transaction client or project transaction context when participating in an Application Service transaction.
- Prefer persisted normalized columns and database constraints when uniqueness depends on normalized values such as trimmed/case-insensitive names or serial numbers.

## Must Not Do

- Do not create repositories for every child entity inside an aggregate.
- Do not introduce `IRepository`, `OrderRepositoryPort`, or similar abstractions by default.
- Do not use repositories as the default read-model path.
- Do not enforce domain rules inside repositories.
- Do not make business decisions inside repositories.
- Do not scatter persistence translation details into Application Services.
- Do not load broad collections for high-cardinality uniqueness checks unless it is an explicit, temporary trade-off.

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

  async findById(id: string, tenantId: string): Promise<BookingEntity | null> {
    const record = await this.prisma.booking.findFirst({
      where: { id, tenantId },
    });

    return record ? BookingMapper.toDomain(record) : null;
  }

  async findActiveForEquipment(tenantId: string, equipmentId: string): Promise<BookingEntity[]> {
    const records = await this.prisma.booking.findMany({
      where: {
        tenantId,
        equipmentId,
        status: { not: 'CANCELLED' },
      },
    });

    return records.map(BookingMapper.toDomain);
  }

  async save(entity: BookingEntity): Promise<void> {
    await this.prisma.booking.upsert({
      where: { id: entity.id },
      create: BookingMapper.toPersistence(entity),
      update: BookingMapper.toUpdateData(entity),
    });
  }

  async saveWithinTransaction(entity: BookingEntity, tx: Prisma.TransactionClient): Promise<void> {
    await tx.booking.upsert({
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
