# Controller

## Role

A Controller is the entry point for an external request into the application. It parses and validates input, builds a command or query, dispatches it to the application layer, and maps the result to an HTTP response.

Controllers contain no business logic. They are thin translation layers between HTTP and the application core.

---

## Rules

### One controller per use case

- Each use case has its own controller class.
- Do not consolidate multiple unrelated use cases into one controller.

### Responsibilities

- Accept validated Request DTOs.
- Extract contextual data not supplied by the client, such as `tenantId` or authenticated actor identity.
- Map DTO + context into a command or query.
- Dispatch through `CommandBus` or `QueryBus`.
- Map `Result` values and Domain Errors into HTTP responses.

### Error mapping

- Controllers are the HTTP boundary where application failures become HTTP responses.
- For v2 APIs, use Problem Details (`problem-details.md`) instead of ad-hoc Nest HTTP exceptions.
- Prefer module-level Problem Details mappers such as `toSomeProblem(error)` over inline `instanceof` HTTP mapping.
- Rethrow or let unrecognized infrastructure failures propagate to the global Problem Details filter.

### What never belongs in a controller

- Business rules
- Direct Prisma calls
- Persistence logic
- Cross-aggregate orchestration

---

## Structure

```typescript
import { Body, ConflictException, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentTenant } from 'src/core/decorators/current-tenant.decorator';

import { CreateBookingCommand } from '../create-booking.command';
import { CreateBookingRequestDto } from '../create-booking.request.dto';
import { CreateBookingResponseDto } from '../create-booking.response.dto';
import { BookingPeriod } from '../../domain/booking-period.value-object';
import { EquipmentUnavailableError } from '../../domain/errors/booking.errors';

@Controller('bookings')
export class CreateBookingHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateBookingRequestDto,
    @CurrentTenant() tenantId: string,
  ): Promise<CreateBookingResponseDto> {
    const command = new CreateBookingCommand({
      tenantId,
      equipmentId: dto.equipmentId,
      customerId: dto.customerId,
      period: new BookingPeriod(dto.startDate, dto.endDate),
    });

    const result = await this.commandBus.execute(command);

    if (result.isErr()) {
      const error = result.error;

      if (error instanceof EquipmentUnavailableError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }

    return new CreateBookingResponseDto({ id: result.value.id });
  }
}
```

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentTenant } from 'src/core/decorators/current-tenant.decorator';

import { FindBookingsQuery } from '../find-bookings.query';
import { FindBookingsRequestDto } from '../find-bookings.request.dto';
import { FindBookingsResponseDto } from '../find-bookings.response.dto';

@Controller('bookings')
export class FindBookingsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async findAll(
    @Query() dto: FindBookingsRequestDto,
    @CurrentTenant() tenantId: string,
  ): Promise<FindBookingsResponseDto> {
    const result = await this.queryBus.execute(new FindBookingsQuery(tenantId, dto.status, dto.page, dto.pageSize));

    return new FindBookingsResponseDto(result);
  }
}
```

---

## Examples

### Correct: `tenantId` comes from request context, not client input

```typescript
async create(
  @Body() dto: CreateBookingRequestDto,
  @CurrentTenant() tenantId: string,
): Promise<CreateBookingResponseDto>
```

### Wrong: accepting `tenantId` from the request body

```typescript
async create(@Body() dto: CreateBookingRequestDto): Promise<CreateBookingResponseDto> {
  const command = new CreateBookingCommand({ tenantId: dto.tenantId, ... });
}
```

---

### Correct: v2 Problem Details mapping

```typescript
if (result.isErr()) {
  throw toBookingProblem(result.error);
}
```

### Acceptable in legacy/non-v2 code: explicit mapping of Domain Errors

```typescript
if (result.isErr()) {
  const error = result.error;
  if (error instanceof EquipmentUnavailableError) throw new ConflictException(error.message);
  if (error instanceof BookingCannotBeCancelledError) throw new UnprocessableEntityException(error.message);
  throw error;
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
  period: new BookingPeriod(dto.startDate, dto.endDate),
});
```

### Wrong: business logic inside the controller

```typescript
const existing = await this.prisma.booking.findMany({ where: { equipmentId: dto.equipmentId } });

if (existing.length > 0) {
  throw new ConflictException('Equipment not available');
}
```
