# Response DTO

## Role

A Response DTO defines the exact shape of data returned to the client. It acts as the API contract on the output side: only properties declared in the Response DTO are exposed to the caller, protecting internal domain model details from leaking through the API.

Response DTOs are defined using Zod schemas with `nestjs-zod`, consistent with Request DTOs.

---

## Rules

### Whitelist, never blacklist

- Define explicitly which properties are returned. Do not take an entity or Prisma record and strip fields from it.
- If a new field is added to the domain model or database, it will not appear in the response until it is explicitly added to the Response DTO. This is intentional — it prevents accidental data exposure.

### Primitives only

- Response DTO properties must be primitives or plain objects/arrays of primitives.
- Never include domain objects (entities, value objects) in a response DTO.
- Dates should be serialized as ISO strings (`z.string().datetime()`) since JSON has no native Date type.

### No business logic

- A Response DTO describes a data shape. It does not compute, transform, or enforce rules.
- Any transformation of data before it reaches the DTO (e.g. formatting a date range into a human-readable string) is done in the controller or a dedicated presenter, not inside the DTO.

### Stability as an API contract

- Response DTOs should be treated as stable contracts. Removing or renaming a field is a breaking change.
- When the internal domain model changes, update the mapper/controller to maintain the existing response shape. If a breaking change is unavoidable, version the endpoint.

### Naming

- File: `[resource-name].response.dto.ts` (shared across use cases for the same resource) or `[use-case-name].response.dto.ts` (when the response is specific to one use case).
- Schema: `[ResourceName]ResponseSchema` or `[UseCaseName]ResponseSchema`
- Class: `[ResourceName]ResponseDto` or `[UseCaseName]ResponseDto`

---

## Structure

### Standard resource response (reused across use cases)

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const BookingResponseSchema = z.object({
  id: z.string().uuid(),
  equipmentId: z.string().uuid(),
  customerId: z.string().uuid(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export class BookingResponseDto extends createZodDto(BookingResponseSchema) {}
```

### Use-case-specific response (e.g. creation confirmation)

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateBookingResponseSchema = z.object({
  id: z.string().uuid(),
});

export class CreateBookingResponseDto extends createZodDto(CreateBookingResponseSchema) {}
```

### Paginated list response

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const BookingListItemSchema = z.object({
  id: z.string().uuid(),
  equipmentId: z.string().uuid(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const FindBookingsResponseSchema = z.object({
  data: z.array(BookingListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export class FindBookingsResponseDto extends createZodDto(FindBookingsResponseSchema) {}
```

---

## Examples

### ✅ Correct: controller explicitly maps to response DTO

```typescript
// In the controller
const result = await this.queryBus.execute(query);
return new BookingResponseDto({
  id: result.id,
  equipmentId: result.equipmentId,
  customerId: result.customerId,
  status: result.status,
  startDate: result.startDate.toISOString(),
  endDate: result.endDate.toISOString(),
  createdAt: result.createdAt.toISOString(),
});
```

### ❌ Wrong: returning a Prisma record or domain entity directly

```typescript
// Exposes all fields from the Prisma record, including internal ones
return await this.prisma.booking.findUnique({ where: { id } });

// Exposes domain internals and makes the API dependent on the entity shape
return bookingEntity;
```

---

### ✅ Correct: creation response returns only the new resource ID

```typescript
// Commands return minimal data — the client can fetch the full resource if needed
return new CreateBookingResponseDto({ id: result.value.id });
```

### ❌ Wrong: creation response returns the full entity

```typescript
// Unnecessary — couples the create response shape to the domain model
return new BookingResponseDto({ ...bookingEntity.props, id: bookingEntity.id });
```

---

### ✅ Correct: versioning when a future breaking change is needed

```typescript
// Current controller keeps the existing response shape
@Get(':id')
async findOne(@Param('id') id: string): Promise<BookingResponseDto> { ... }

// A future versioned controller introduces the new shape only when required
@Get(':id')
@Version('3')
async findOneV3(@Param('id') id: string): Promise<BookingResponseDtoV3> { ... }
```
