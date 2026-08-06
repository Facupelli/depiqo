# Notifications MVP TODO

## Existing capabilities

Notifications renders and sends email through Resend, resolves channel/suppression policies, accepts idempotency keys, and reacts asynchronously to rental-created-by-customer, rental-confirmed, and rental-cancelled events. Document Signing delegates signing-invitation delivery through the same orchestrator.

## Missing or incomplete capabilities

### [ ] Persist delivery attempts and provider responses

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** Staff can determine whether a confirmation, cancellation, or signing email was delivered or failed.
- **Current evidence:** `NotificationOrchestrator` returns in-memory attempted/delivered/skipped/failed arrays; no notification/attempt Prisma models, repositories, or admin queries exist.
- **Gap:** Delivery outcome disappears after the call and async event handlers have no operational audit trail.
- **Expected behavior:** Persist notification intent, recipients, channel attempts, provider ID/response, timestamps, and terminal/retryable state without storing unnecessary sensitive body data.
- **Lifecycle rules:** Business transactions remain committed when delivery fails; attempts are append-only/auditable.
- **Owning module:** Notifications
- **Dependencies:** Provider adapters and tenant/customer recipient APIs.
- **Side effects:** Notification and attempt records.
- **Acceptance criteria:** Every dispatch is queryable with provider outcome and correlation to the triggering rental/contract event.
- **Suggested tests:** Provider success/failure integration tests and E2E operational status query.

### [ ] Retry failed deliveries idempotently

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** A transient provider outage does not permanently lose a rental or signing notification.
- **Current evidence:** Dispatch passes an idempotency key to the provider, but there is no durable queue/outbox, retry job, retry command, or attempt state.
- **Gap:** Failures are returned/logged only and asynchronous event publication itself is best-effort after commit.
- **Expected behavior:** Durable intents retry transient failures with backoff and provider idempotency; permanent failures remain visible for manual action.
- **Lifecycle rules:** Retries never duplicate one logical notification; suppressed/muted channels are not treated as provider failures.
- **Owning module:** Notifications
- **Dependencies:** Durable post-commit event/outbox infrastructure.
- **Side effects:** New attempt records and terminal status updates.
- **Acceptance criteria:** Simulated transient failure eventually delivers once after restart and records all attempts.
- **Suggested tests:** Worker integration, restart recovery, duplicate-event idempotency, and permanent failure tests.

### [ ] Cover the operational rental and contract lifecycle

- **Priority:** P1
- **Status:** Partial
- **MVP scenario:** Customers and staff receive essential preparation, change, readiness, handover, return, completion, contract, and exception messages.
- **Current evidence:** Only three rental handlers and signing invitation composition are registered in `notifications.module.ts`; no handlers exist for rental edits, preparation, handover/return, completion, signing completion/expiry, or failed delivery escalation.
- **Gap:** Most lifecycle events have no communication path.
- **Expected behavior:** Add only MVP-critical notifications when owning modules emit completed business events, with recipient/channel policy per type.
- **Lifecycle rules:** Notifications never decide transitions and failure never rolls back business state.
- **Owning module:** Notifications
- **Dependencies:** Rental Commitment and Contracts lifecycle events.
- **Side effects:** Durable delivery intents/attempts.
- **Acceptance criteria:** The documented critical-event matrix maps each event to recipients, templates, suppression, and observable delivery.
- **Suggested tests:** Event-to-template contract tests and full-lifecycle E2E assertions.

### [ ] Make event consumption durable and deduplicated

- **Priority:** P0
- **Status:** Partial
- **MVP scenario:** A process crash after rental commit cannot lose its confirmation email, and duplicate event delivery cannot send twice.
- **Current evidence:** `PrismaUnitOfWork` publishes in-memory events after commit and logs publication failure; handlers use `@OnEvent(..., { async: true })`. No outbox or consumer ledger exists.
- **Gap:** Post-commit events can be lost and idempotency is delegated to an external provider without durable local deduplication.
- **Expected behavior:** Persist event/notification intent in the business transaction or use a durable outbox, then consume with a stable event ID and deduplication record.
- **Lifecycle rules:** At-least-once delivery is safe; one logical recipient/channel notification is created once.
- **Owning module:** Notifications
- **Dependencies:** Cross-cutting outbox support and event IDs from owning modules.
- **Side effects:** Outbox/consumer records.
- **Acceptance criteria:** Crash and duplicate-delivery tests prove eventual single logical notification.
- **Suggested tests:** Database-backed outbox integration, consumer replay, and process-restart E2E test.
