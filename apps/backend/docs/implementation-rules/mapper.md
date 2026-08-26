# Mapper Rule

## Use When

Use this rule when adding or changing translation between command-side domain models and Prisma persistence records.

Use `query.md` for read-model shaping in Query Handlers. Query Handlers normally do not use domain mappers.

## Role

A Mapper translates between the domain model and the persistence model. It is the bridge between a domain entity or aggregate and the Prisma record shape.

Mappers are infrastructure-adjacent. They know about both domain objects and Prisma types, but they contain no business logic.

## Repo Convention

- Repositories use mappers when loading and saving aggregates on the command side.
- Query Handlers normally do not use mappers.
- Mappers are stateless utility classes with static methods.
- Mappers are not NestJS providers and are not decorated with `@Injectable()`.
- Use explicit methods such as `toDomain()`, `toPersistence()`, and optionally `toUpdateData()` when needed.
- Naming and shape translation between Prisma and domain models lives in mappers.

## Must Do

- Support both persistence-to-domain and domain-to-persistence translation.
- Call `Entity.reconstitute()` or `Aggregate.reconstitute()` from `toDomain()` when restoring existing records.
- Use `create()` only for new domain objects outside persistence rehydration.
- Serialize Value Objects into Prisma-compatible primitives or structured shapes.
- Map or cast domain enums to persistence equivalents when needed.
- Map child entities and Value Objects before passing them to the aggregate root's `reconstitute()`.
- Delegate child translation to child mappers where appropriate.
- Keep snake_case, Prisma-specific naming, and persistence shape concerns out of entities and Application Services.
- Let invalid persisted data fail naturally through `reconstitute()` or Value Object construction.

## Must Not Do

- Do not call `create()` when mapping existing persistence records to domain.
- Do not include computed properties or domain methods in persistence shapes.
- Do not push raw Prisma objects into entity constructors.
- Do not enforce business rules in mappers.
- Do not call domain behavior methods from mappers.
- Do not make business decisions in mappers.
- Do not scatter inline mapping logic throughout repository methods or Application Services.
- Do not use domain mappers by default for read models in Query Handlers.

## Minimal Shape

```typescript
import { Booking as PrismaBooking, Prisma } from '@prisma/client';

import { BookingEntity } from '../domain/booking.entity';
import { BookingPeriod } from '../domain/booking-period.value-object';
import { BookingStatus } from '../domain/booking-status.enum';

export class BookingMapper {
  static toDomain(record: PrismaBooking): BookingEntity {
    return BookingEntity.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      equipmentId: record.equipmentId,
      customerId: record.customerId,
      status: record.status as BookingStatus,
      period: BookingPeriod.fromDates(record.periodStart, record.periodEnd),
    });
  }

  static toPersistence(entity: BookingEntity): Prisma.BookingCreateInput {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      equipmentId: entity.equipmentId,
      customerId: entity.customerId,
      status: entity.status,
      periodStart: entity.period.start,
      periodEnd: entity.period.end,
    };
  }

  static toUpdateData(entity: BookingEntity): Prisma.BookingUpdateInput {
    return {
      status: entity.status,
      periodStart: entity.period.start,
      periodEnd: entity.period.end,
    };
  }
}
```

The exact Prisma input type may vary by persistence need. Prefer the most explicit Prisma type that matches the operation.

## Examples

### Correct: `toDomain()` uses `reconstitute()`

```typescript
static toDomain(record: PrismaBooking): BookingEntity {
  return BookingEntity.reconstitute({
    id: record.id,
    tenantId: record.tenantId,
    status: record.status as BookingStatus,
    period: BookingPeriod.fromDates(record.periodStart, record.periodEnd),
  });
}
```

### Wrong: `toDomain()` uses `create()`

```typescript
static toDomain(record: PrismaBooking): BookingEntity {
  return BookingEntity.create({
    equipmentId: record.equipmentId,
    customerId: record.customerId,
    period: BookingPeriod.fromDates(record.periodStart, record.periodEnd),
  });
}
```

### Correct: repository uses mapper after loading from Prisma

```typescript
const record = await this.prisma.booking.findUniqueOrThrow({ where: { id } });
return BookingMapper.toDomain(record);
```

### Wrong: inline mapping logic scattered through repository or service code

```typescript
return BookingEntity.reconstitute({
  id: record.id,
  tenantId: record.tenantId,
  status: record.status as BookingStatus,
  period: new BookingPeriod(record.periodStart, record.periodEnd),
});
```

### Correct: aggregate mapper delegates child mapping first

```typescript
const lines = record.lines.map(OrderLineMapper.toDomain);

return OrderEntity.reconstitute({
  id: record.id,
  tenantId: record.tenantId,
  status: record.status,
  lines,
});
```

### Wrong: query handler instantiates aggregates through mappers for a read model

```typescript
const record = await this.prisma.booking.findUnique({ where: { id: query.bookingId } });
const entity = BookingMapper.toDomain(record);
return BookingPresenter.toResponse(entity);
```

## Related Rules

- `repository.md`
- `aggregate.md`
- `entity.md`
- `value-object.md`
- `query.md`
- `application-service.md`
