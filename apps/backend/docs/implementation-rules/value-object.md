# Value Object Rule

## Use When

Use this rule when modeling a domain concept defined by its attributes rather than identity, especially when the concept has validation, behavior, or multiple fields that belong together.

Use `entity.md` instead when identity and lifecycle matter.

## Role

A Value Object represents a domain concept defined entirely by its attributes. Unlike entities, Value Objects are interchangeable when their properties are identical.

Value Objects are immutable and are the primary tool for encapsulating simple domain validation. They ensure that data entering an aggregate or entity is valid from the moment of construction.

Value Objects simplify aggregates by moving focused validation and small domain behavior out of aggregate roots. A root that receives a `BookingPeriod` or `ProductPrice` can trust that the value is valid and focus on larger business invariants.

## Repo Convention

- Value Objects live in the domain layer.
- Value Objects are pure TypeScript/domain objects.
- Value Objects are immutable and identity-less.
- Value Objects encapsulate meaningful domain validation and small domain behavior.
- Value Objects are constructed before being passed into aggregates/entities when they guard input validity.
- Mappers serialize and deserialize Value Objects for persistence.
- Static factories are allowed when they make construction clearer.

## Decision Guide

Create a Value Object when:

- A concept involves multiple fields that belong together, such as `Address`, `MoneyAmount`, or `BookingPeriod`.
- A relationship between fields requires an invariant, such as a date range where start must be before end.
- A single primitive carries non-trivial validation or domain behavior, such as a positive `ProductPrice`.

Do not create a Value Object when:

- The wrapper exists only for type aesthetics.
- The value has no meaningful validation or behavior.
- The value is plain data such as a simple `name: string` or `description: string`.
- The concept has identity and lifecycle, in which case it should be an Entity.

## Must Do

- Compare Value Objects by structure/attributes.
- Keep all state `readonly`.
- Return new instances for mutation-like operations.
- Validate on construction or through a static factory.
- Ensure invalid Value Objects cannot exist.
- Throw/fail fast on invalid construction data.
- Keep infrastructure and framework concerns out.
- Keep database serialization pure when exposing serialization helpers.
- Let mappers invoke serialization helpers; the Value Object itself must not interact with persistence.

## Must Not Do

- Do not add an ID field.
- Do not use public setters.
- Do not mutate internal state.
- Do not create primitive wrappers just for type aesthetics.
- Do not put NestJS decorators, Prisma types, HTTP concerns, logging, or external service calls inside Value Objects.
- Do not let aggregates duplicate validation that belongs in a Value Object.

## Minimal Shape

```typescript
export class BookingPeriod {
  constructor(
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {
    if (endDate <= startDate) {
      throw new Error('Booking period end date must be after start date');
    }
  }

  overlaps(other: BookingPeriod): boolean {
    return this.startDate < other.endDate && other.startDate < this.endDate;
  }

  equals(other: BookingPeriod): boolean {
    return this.startDate.getTime() === other.startDate.getTime()
      && this.endDate.getTime() === other.endDate.getTime();
  }
}
```

Invalid construction may throw a domain-specific error or another fail-fast exception appropriate for the local domain model. See `domain-error.md` for expected domain failures.

## Examples

### Correct: self-validating value

```typescript
const price = new ProductPrice(10.50);
product.updatePrice(price);
```

The `ProductPrice` ensures it is valid upon creation. The aggregate root can now trust `price` is positive.

### Wrong: validation leaked to caller or root

```typescript
if (newPrice > 0) {
  product.price = newPrice;
}
```

Trivial validation is handled by the caller or the root, leading to duplicate logic and possible invalid states.

### Correct: immutable operation returns a new instance

```typescript
const total = salary.add(bonus);
```

Adding to money returns a new instance.

### Wrong: mutation of internal state

```typescript
salary.amount += bonus.amount;
```

Mutating internal state breaks the Value Object contract.

## Related Rules

- `entity.md`
- `aggregate.md`
- `domain-error.md`
- `mapper.md`
- `request-dto.md`
- `application-service.md`
