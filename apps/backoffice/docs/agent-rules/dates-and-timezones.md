# Backoffice Date and Timezone Conventions

## Timezone policies

Operational rental times use the effective operational timezone:

```text
branch.timezone
-> tenant.config.timezone
-> UTC
```

Examples:

- `pickupAt`
- `returnAt`
- Rental calendar and scheduling times

Administrative and event timestamps use the tenant timezone:

```text
tenant.config.timezone
-> UTC
```

Examples:

- `createdAt`
- `updatedAt`
- `confirmedAt`
- `cancelledAt`
- Signing lifecycle timestamps

Date-only values such as `YYYY-MM-DD` are business dates and must not be timezone-converted.

## Implementation

- Use the shared timezone helpers and hooks under `src/shared/timezone/`.
- Use explicit timestamp formatting from `src/lib/dates/`.
- Do not use the browser or runtime timezone implicitly for business timestamps.
- Do not call `dayjs.tz.setDefault(...)`.
- Do not duplicate the branch -> tenant -> UTC fallback logic in features.
- Do not put timezone metadata into the selected-branch Zustand store.
