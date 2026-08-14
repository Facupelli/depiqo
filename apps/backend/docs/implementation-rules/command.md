# Command Rule

## Use When

Use this rule when adding or changing an application-layer command for a state-changing backend use case.

Use `query.md` instead for read-only use cases.

## Role

A Command is a plain object that represents a user's intent to change state. It carries the input data needed to execute a single use case. It is created by the controller and dispatched to the `CommandBus`, which routes it to the corresponding Application Service (`@CommandHandler`).

Commands are application-layer objects. They are not domain objects and not DTOs — they sit between the two.

## Repo Convention

- Each state-changing use case has its own Command class.
- A Command describes a single, atomic intent: `CreateBookingCommand`, `CancelBookingCommand`, `AssignEquipmentCommand`.
- File: `[use-case-name].command.ts`
- Class: `[UseCaseName]Command`
- Commands are created by controllers and dispatched through `CommandBus`.
- Commands are handled by the corresponding Application Service / `@CommandHandler`.
- Request DTOs and Commands remain separate even when their shapes look similar.

## Must Do

- Use a plain class with `readonly` properties and a single constructor.
- Carry only the input data needed by the use case.
- Use domain types where appropriate, such as `BookingPeriod` instead of separate raw `Date` fields.
- Keep properties as primitives when they are already primitives in the domain, such as IDs, strings, and enums.
- Have the controller construct domain types before building the Command.
- Prefer minimal handler confirmations such as the `id` of a created resource or `void`.
- Use a `Result` type as the handler return when the use case can fail with a known domain/application error.

## Must Not Do

- Do not add methods, validation, or business logic to a Command.
- Do not reuse a Request DTO class as a Command.
- Do not pass full DTOs, entities, Prisma records, or request objects as Command payloads.
- Do not use Commands for read-only use cases.
- Do not return business data or read models from command-side handlers.
- Do not make handlers construct domain types when the controller can construct them before dispatch.

## Minimal Shape

```typescript
import { BookingPeriod } from '../../domain/booking-period.value-object';

export class CreateBookingCommand {
  constructor(
    public readonly tenantId: string,
    public readonly equipmentId: string,
    public readonly customerId: string,
    public readonly period: BookingPeriod,
  ) {}
}
```

For commands with many properties, use a props object instead of positional arguments:

```typescript
export class CreateBookingCommand {
  public readonly tenantId: string;
  public readonly equipmentId: string;
  public readonly customerId: string;
  public readonly period: BookingPeriod;

  constructor(props: { tenantId: string; equipmentId: string; customerId: string; period: BookingPeriod }) {
    this.tenantId = props.tenantId;
    this.equipmentId = props.equipmentId;
    this.customerId = props.customerId;
    this.period = props.period;
  }
}
```

## Examples

Local repository examples:

- `src/modules/order/application/commands/create-order/create-order.command.ts`
- `src/modules/tenant/location/application/commands/create-location/create-location.command.ts`

### Correct: controller builds domain type before constructing the command

```typescript
// In the controller
const command = new CreateBookingCommand({
  tenantId: this.getTenantId(),
  equipmentId: dto.equipmentId,
  customerId: dto.customerId,
  period: new BookingPeriod(dto.startDate, dto.endDate),
});
```

### Wrong: passing raw primitives when a domain type exists

```typescript
// The command now leaks the BookingPeriod construction concern into the handler
const command = new CreateBookingCommand({
  tenantId: this.getTenantId(),
  equipmentId: dto.equipmentId,
  customerId: dto.customerId,
  startDate: dto.startDate,
  endDate: dto.endDate,
});
```

### Correct: command carries only what the use case needs

```typescript
export class CancelBookingCommand {
  constructor(
    public readonly bookingId: string,
    public readonly tenantId: string,
    public readonly reason: string,
  ) {}
}
```

### Wrong: command carries the full entity or DTO

```typescript
export class CancelBookingCommand {
  constructor(
    public readonly booking: BookingEntity,
  ) {}
}
```

## Related Rules

- `application-service.md`
- `controller.md`
- `request-dto.md`
- `domain-error.md`
- `error-handling-problem-details.md`
