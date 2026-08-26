# Response DTO Rule

## Use When

Use this rule when adding or changing an HTTP Response DTO for API output.

Use `request-dto.md` for API input validation contracts.

## Role

A Response DTO defines the exact shape of data returned to the client. It acts as the API contract on the output side: only properties declared in the Response DTO are exposed to the caller, protecting internal domain model and persistence details from leaking through the API.

Response DTOs are defined using Zod schemas with `nestjs-zod`, consistent with Request DTOs.

## Repo Convention

- Response DTOs use Zod schemas with `nestjs-zod`.
- File: `[resource-name].response.dto.ts` for responses shared across use cases for the same resource.
- File: `[use-case-name].response.dto.ts` for responses specific to one use case.
- Schema: `[ResourceName]ResponseSchema` or `[UseCaseName]ResponseSchema`.
- Class: `[ResourceName]ResponseDto` or `[UseCaseName]ResponseDto`.
- Creation command responses normally return minimal confirmation, usually `{ id }`.
- List responses use explicit item schemas and pagination metadata.
- Transformations happen before DTO construction, usually in the controller or a dedicated presenter.

## Must Do

- Explicitly whitelist returned fields.
- Return primitives, plain objects, or arrays of primitives.
- Serialize dates as ISO strings using `z.string().datetime()` because JSON has no native Date type.
- Treat Response DTOs as stable API contracts.
- Map domain, read-model, or persistence data into the response shape explicitly.
- Keep the existing response shape stable when internal domain or persistence models change.
- Version the endpoint or response contract if a breaking response change is unavoidable.

## Must Not Do

- Do not return Prisma records directly.
- Do not return domain entities, aggregates, or Value Objects directly.
- Do not expose fields by spreading entities/records and deleting unwanted properties.
- Do not include business logic, transformation logic, or rule enforcement inside DTOs.
- Do not make response shape depend on internal domain or persistence structure.
- Do not return full entities from create commands by default.

## Minimal Shape

### Standard resource response

Use this shape when the response is reused across use cases for the same resource.

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

### Use-case-specific response

Use this shape for narrow responses such as creation confirmations.

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

## Examples

### Correct: controller explicitly maps to response DTO

```typescript
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

### Wrong: returning a Prisma record or domain entity directly

```typescript
return await this.prisma.booking.findUnique({ where: { id } });
```

```typescript
return bookingEntity;
```

The first example exposes all fields from the Prisma record, including internal ones. The second exposes domain internals and makes the API depend on the entity shape.

### Correct: creation response returns only the new resource ID

```typescript
return new CreateBookingResponseDto({ id: result.value.id });
```

Commands return minimal data. The client can fetch the full resource if needed.

### Wrong: creation response returns the full entity

```typescript
return new BookingResponseDto({ ...bookingEntity.props, id: bookingEntity.id });
```

This unnecessarily couples the create response shape to the domain model.

### Correct: versioning when a future breaking change is needed

```typescript
@Get(':id')
async findOne(@Param('id') id: string): Promise<BookingResponseDto> {
  // Keep the existing response shape.
}

@Get(':id')
@Version('3')
async findOneV3(@Param('id') id: string): Promise<BookingResponseDtoV3> {
  // Introduce the new shape only when required.
}
```

## Related Rules

- `controller.md`
- `request-dto.md`
- `command.md`
- `query.md`
- `mapper.md`
- `repository.md`
- `error-handling-problem-details.md`
