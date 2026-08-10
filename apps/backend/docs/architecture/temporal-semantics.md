# Temporal Semantics

Use this document when adding or changing a temporal field in active V2 backend code.

## Choose the Correct Type

| Business concept | TypeScript and API | PostgreSQL |
| --- | --- | --- |
| Absolute instant | `Date` / offset ISO-8601 datetime | `TIMESTAMPTZ(3)` |
| Local calendar date | `LocalDate` / `YYYY-MM-DD` | `DATE` |
| Local clock time | minutes from midnight | `INTEGER` |
| Absolute instant range | `DateRange` / two instants | `tstzrange` |
| Timezone | IANA timezone identifier | `TEXT` or tenant configuration |

Use an absolute instant for `createdAt`, `updatedAt`, `deletedAt`, rental `periodStart` and `periodEnd`, lifecycle timestamps, document timestamps, token expirations, and owner-contract `validFrom` and `validTo`.

Use a local date for a birth date, branch schedule override date, and promotion or coupon validity date.

Use local time for a rule such as "the branch opens at 09:00". Store it as minutes from midnight. It is not an instant until it is evaluated with a particular local date and IANA timezone.

## API Rules

An instant identifies one exact moment. API inputs must include `Z` or a numeric UTC offset:

```text
Valid:   2026-08-10T13:00:00Z
Valid:   2026-08-10T10:00:00-03:00
Invalid: 2026-08-10T10:00:00
```

Use `ExplicitOffsetInstantSchema` from `@repo/api-contracts` for instant inputs. It validates the offset and produces a `Date` for application use. Responses serialize instants as ISO-8601 datetimes with an explicit offset, normally canonical `Z` strings.

A local date has no time or timezone component:

```text
Valid:   2026-08-10
Invalid: 2026-08-10T00:00:00Z
```

Use `LocalDateSchema` and `LocalDate` from `@repo/api-contracts` for local-date API fields. Do not expose a local date as a datetime string.

## Prisma and PostgreSQL

New V2 absolute instants must use an explicit PostgreSQL mapping:

```prisma
createdAt DateTime @default(now()) @db.Timestamptz(3)
```

Do not use an unannotated Prisma `DateTime` or `TIMESTAMP WITHOUT TIME ZONE` for a new V2 absolute instant. `Session.expire` intentionally uses `@db.Timestamptz(6)` to preserve its existing microsecond precision.

Local calendar dates use PostgreSQL `DATE`:

```prisma
birthDate DateTime @db.Date
```

Prisma transports a PostgreSQL `DATE` as a JavaScript `Date`. This is a persistence-adapter detail only, not application or domain semantics. Convert only at that boundary with:

```text
LocalDate <-> localDateToPrismaDate / prismaDateToLocalDate <-> Prisma DATE transport Date
```

The shared helpers live in `src/core/temporal/local-date.ts`. Their conversion does not use a tenant or branch timezone.

## Effective Timezone

Tenant Management owns effective timezone resolution:

```text
branch.timezone
  -> tenant.config.timezone
  -> UTC
```

Timezone values must be valid IANA identifiers. Consumers must obtain the resolved timezone through Tenant Management's public API rather than recreating the fallback chain.

`get-rentals` is the intentional exception: its set-based raw SQL must resolve a timezone per joined branch row. Its SQL mirrors Tenant Management's trimmed branch-to-tenant-to-UTC resolution and must remain aligned with it.

Rentals do not snapshot timezone. Their current local presentation uses the branch's current effective timezone.

## Conversions and Calendar Semantics

These are different operations:

```text
absolute instant + effective IANA timezone -> LocalDate
LocalDate <-> Prisma DATE transport Date
```

The first operation derives a local calendar interpretation of an instant. For example, Pricing derives `calculationLocalDate` from its calculation instant and pricing timezone before evaluating promotion or coupon validity.

The second operation preserves a calendar date in PostgreSQL and has no timezone semantics.

Rental calendar filters are inclusive local dates. Convert them to this half-open absolute range using the effective branch timezone:

```text
[from local midnight, day-after-to local midnight)
```

Rental periods and asset reservation ranges are also half-open:

```text
[periodStart, periodEnd)
```

Their overlap test is:

```text
rentalStart < filterEnd
AND rentalEnd > filterStart
```

Keep `V2AssetBlock.period` as `tstzrange`; do not replace it with `tsrange`.

Promotion and coupon `validFrom` and `validUntil` are inclusive local-date boundaries. Same-day validity is valid. Owner-contract validity remains instant based:

```text
validFrom <= instant < validTo
```

## DST

Never assume a local calendar day is exactly 24 hours.

Derive local calendar boundaries from local dates and IANA timezone rules. Do not obtain branch-local dates by UTC truncation. Do not introduce a new policy for nonexistent or ambiguous local schedule times without an explicit business decision.

## Raw SQL and PostgreSQL Sessions

`TIMESTAMPTZ` stores an absolute instant independently of the PostgreSQL session display timezone. Production connections should nevertheless default to UTC for deterministic operations:

```sql
ALTER ROLE <backend_runtime_role> SET TimeZone TO 'UTC';
```

Restart the backend afterward so pooled connections are recreated. This is operational hardening, not an application-correctness dependency for `TIMESTAMPTZ`.

`instant AT TIME ZONE effective_timezone` is correct when deriving a branch-local calendar value. `get-rentals-calendar` also uses `AT TIME ZONE 'UTC'` with `to_char(... "Z")` only as a localized PrismaPg raw-query adapter workaround to emit canonical API strings. It is not the general way to read a `TIMESTAMPTZ` value and does not reinterpret its storage.

## Legacy Boundary

Legacy temporal tables are frozen pending removal after the V2 production migration. Their `TIMESTAMP WITHOUT TIME ZONE` fields are not active V2 temporal debt unless an active V2 runtime path still depends on them.

## Developer Checklist

```text
Does the value identify one exact moment?
  -> Date, explicit-offset API datetime, TIMESTAMPTZ

Does it identify a calendar date regardless of timezone?
  -> LocalDate, YYYY-MM-DD API value, DATE

Does it mean "09:00 at this branch"?
  -> local time, minutes from midnight

Does an instant need a local calendar interpretation?
  -> resolve the effective IANA timezone first

Does it reserve an absolute interval?
  -> DateRange and tstzrange with [start, end) semantics
```

## Related Code

- `../../../packages/api-contracts/src/explicit-offset-instant.schema.ts`
- `../../../packages/api-contracts/src/local-date.schema.ts`
- `../../src/core/temporal/local-date.ts`
- `../../src/modules/tenant-management/public-api/tenant-management.public-api.ts`
- `../../src/modules/rental-commitment/features/get-rentals-calendar/get-rentals-calendar.handler.ts`
