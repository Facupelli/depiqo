# Request DTO Rule

## Use When

Use this rule when adding or changing an HTTP Request DTO for a request body, query params, or route params.

Use `response-dto.md` for API output contracts.

## Role

A Request DTO defines the shape and validation rules for data arriving from the outside world. It is the first line of defense against invalid transport input — data that passes DTO validation is considered safe to pass to the application layer as typed request data.

Request DTOs are API contracts between the client and server. They are not domain objects and must not contain business logic.

## Repo Convention

- Request DTOs are defined as Zod schemas using `nestjs-zod`.
- Always define or import a Zod schema first, then derive the class with `createZodDto()`.
- The schema is the single source of truth. The class exists for NestJS DI and pipe integration.
- Prefer shared schemas from `@repo/api-contracts` when the request contract is shared with other workspace consumers.
- When the schema is local to the backend, export both the schema and DTO class when the schema is reused in tests or by other schemas.
- File: `[use-case-name].request.dto.ts`
- Schema: `[UseCaseName]Schema`
- Class: `[UseCaseName]RequestDto`

## Must Do

- Validate and type incoming transport data.
- Keep DTOs transport-layer only.
- Use primitives, plain objects, or arrays of primitives.
- Coerce dates with `z.coerce.date()` so ISO string inputs from HTTP become `Date` values.
- Validate UUIDs with `z.string().uuid()`.
- Coerce query params explicitly because all query params arrive as strings.
- Map DTO + request context into a Command or Query in the controller.
- Enforce domain invariants again in domain objects, domain services, or application policies.

## Must Not Do

- Do not put business rules in DTO schemas.
- Do not import domain entities, Value Objects, or Domain Errors into DTO files.
- Do not use DTO validation as the source of truth for domain correctness.
- Do not merge Request DTOs with Commands or Queries.
- Do not pass DTOs directly to `CommandBus`, `QueryBus`, or application services.
- Do not use async persistence-backed validation in DTO schemas.
- Do not put availability, permissions, tenant-specific policies, pricing rules, or persistence-backed decisions in DTO schemas.

## Minimal Shape

For request bodies:

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateBookingSchema = z.object({
  equipmentId: z.string().uuid(),
  customerId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export class CreateBookingRequestDto extends createZodDto(CreateBookingSchema) {}
```

For query params, use the same pattern and coerce types explicitly:

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const FindBookingsSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export class FindBookingsRequestDto extends createZodDto(FindBookingsSchema) {}
```

Tenant id and authenticated actor context should usually come from request context/decorators, not from client-supplied DTO fields.

## Examples

### Correct: schema validates format and type, not business rules

```typescript
export const CreateBookingSchema = z.object({
  equipmentId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
```

### Acceptable: request-level consistency for client feedback

```typescript
export const CreateBookingSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'endDate must be after startDate',
  });
```

This does not replace the domain invariant. `BookingPeriod` or the relevant domain policy must still reject an invalid period. DTO validation filters external input; domain guards protect correctness.

### Wrong: domain/application decision inside the DTO schema

```typescript
export const CreateBookingSchema = z
  .object({
    equipmentId: z.string().uuid(),
  })
  .refine(async (data) => isEquipmentAvailable(data.equipmentId), {
    message: 'Equipment is unavailable',
  });
```

Availability, permissions, tenant-specific policies, pricing rules, and persistence-backed decisions belong in the application/domain flow, not in DTO schemas.

### Correct: controller maps DTO to Command — they stay separate

```typescript
@Post()
async create(@Body() dto: CreateBookingRequestDto, @CurrentTenant() tenantId: string) {
  const command = new CreateBookingCommand({
    tenantId,
    equipmentId: dto.equipmentId,
    customerId: dto.customerId,
    period: new BookingPeriod(dto.startDate, dto.endDate),
  });

  const result = await this.commandBus.execute(command);
  // ...
}
```

### Wrong: passing the DTO directly to the command bus or service

```typescript
await this.commandBus.execute(dto);
```

The DTO is not a Command. It carries HTTP-layer concerns and lacks domain typing.

### Correct: reusing the schema for composition

```typescript
const DateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const CreateBookingSchema = z
  .object({
    equipmentId: z.string().uuid(),
    customerId: z.string().uuid(),
  })
  .merge(DateRangeSchema);
```

## Related Rules

- `controller.md`
- `command.md`
- `query.md`
- `response-dto.md`
- `value-object.md`
- `domain-error.md`
- `error-handling-problem-details.md`
