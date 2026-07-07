# Controller

## Role

A Controller is the HTTP entry point for one use case. It parses validated transport input, extracts request context, builds a command/query, dispatches it to the application layer, and maps the result to an HTTP response.

Controllers are thin translation layers. They contain no business logic.

For error handling, follow `error-handling-problem-details.md`.

---

## Rules

### One controller per use case

- Each use case has its own controller class.
- Do not consolidate unrelated use cases into one controller.

### Responsibilities

- Accept validated Request DTOs.
- Extract contextual data not supplied by the client, such as tenant id or authenticated actor identity.
- Map DTO + context into a command or query.
- Dispatch through `CommandBus` or `QueryBus`.
- Return response DTO-shaped success values.
- Convert expected `Result.Err` values into `ProblemException` at the HTTP edge.

### Error mapping

- Controllers are where HTTP-facing application failures become Problem Details responses.
- Use `ProblemException` and `createProblemDetails(...)` for current APIs.
- Prefer a small controller-local `to<Feature>Problem(error)` function and problem map.
- Extract to `<feature>.http-errors.ts` only when the mapping becomes large or reused.
- Let unexpected infrastructure/programmer failures propagate to the global `ProblemDetailsFilter`.
- Do not throw ad-hoc Nest HTTP exceptions for expected use-case failures in current code.

### What never belongs in a controller

- Business rules.
- Direct Prisma calls.
- Persistence logic.
- Cross-aggregate orchestration.
- Manual logging of expected failures.

---

## Structure

```typescript
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { CurrentTenant } from 'src/core/decorators/current-tenant.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { CreateBookingCommand } from './create-booking.command';
import { CreateBookingError, CreateBookingErrorCode } from './create-booking.errors';
import { CreateBookingRequestDto } from './create-booking.request.dto';
import { CreateBookingResponseDto } from './create-booking.response.dto';

@Controller('bookings')
export class CreateBookingHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateBookingRequestDto,
    @CurrentTenant() tenantId: string,
  ): Promise<CreateBookingResponseDto> {
    const result = await this.commandBus.execute<
      CreateBookingCommand,
      Result<CreateBookingResponseDto, CreateBookingError>
    >(
      new CreateBookingCommand({
        tenantId,
        equipmentId: dto.equipmentId,
        customerId: dto.customerId,
        startDate: dto.startDate,
        endDate: dto.endDate,
      }),
    );

    if (result.isErr()) {
      throw toCreateBookingProblem(result.error);
    }

    return result.value;
  }
}

function toCreateBookingProblem(error: CreateBookingError): ProblemException {
  const problem = createBookingProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const createBookingProblemMap = {
  'booking.equipment_unavailable': {
    type: createProblemType('booking.equipment_unavailable'),
    title: 'Equipment unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'The selected equipment is not available for the requested period.',
  },
  'booking.invalid_period': {
    type: createProblemType('booking.invalid_period'),
    title: 'Invalid booking period',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The booking period is invalid.',
  },
} satisfies Record<
  CreateBookingErrorCode,
  {
    type: string;
    title: string;
    status: HttpStatus;
    detail: string;
  }
>;
```

Query controllers follow the same shape, except they dispatch through `QueryBus` and usually use `@Get()` with `@Query()` DTOs.

---

## Examples

### Correct: tenant id comes from request context, not client input

```typescript
async create(
  @Body() dto: CreateBookingRequestDto,
  @CurrentTenant() tenantId: string,
): Promise<CreateBookingResponseDto>
```

### Wrong: accepting tenant id from the request body

```typescript
async create(@Body() dto: CreateBookingRequestDto): Promise<CreateBookingResponseDto> {
  const command = new CreateBookingCommand({ tenantId: dto.tenantId, ... });
}
```

---

### Correct: Result error mapped to Problem Details at the HTTP edge

```typescript
if (result.isErr()) {
  throw toCreateBookingProblem(result.error);
}
```

### Wrong: generic catch-all HTTP mapping

```typescript
if (result.isErr()) {
  throw new BadRequestException('Something went wrong');
}
```

---

### Correct: controller only maps DTO + context into a command

```typescript
const command = new CreateBookingCommand({
  tenantId,
  equipmentId: dto.equipmentId,
  customerId: dto.customerId,
  startDate: dto.startDate,
  endDate: dto.endDate,
});
```

### Wrong: business logic inside the controller

```typescript
const existing = await this.prisma.booking.findMany({ where: { equipmentId: dto.equipmentId } });

if (existing.length > 0) {
  throw new ConflictException('Equipment not available');
}
```

---

## Canonical Example

Use this implemented slice as the source of truth for current controller error flow:

```text
apps/backend/src/modules/pricing/features/calculate-cart-price/calculate-cart-price.controller.ts
```
