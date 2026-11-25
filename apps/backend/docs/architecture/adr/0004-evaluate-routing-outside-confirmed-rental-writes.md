# Evaluate routing outside confirmed rental writes

Confirmed-rental delivery changes and reschedules evaluate routing and read mutable branch delivery configuration before opening the equipment write transaction. Routing depends on external I/O and must not keep reservation locks open. The authoritative write reloads the rental, checks the expected version and lifecycle against server time, and checks updated reservation periods before committing; preview and mutation reuse the same proposal rules rather than trusting a client-provided quote.

An agreed transportation price is not a policy exception. A routed exception applies only to the authorized scope, with attribution from trusted server context. Carrying unchanged terms forward does not trigger a new route or quote, but a newly evaluated scope cannot inherit its previous exception. Address-only edits must not silently take new transportation minutes from changed branch configuration. Resizing must preserve closed participation and its reservation history, or fail if the proposed terms are incompatible with it. Until physical delivery and collection have authoritative completion facts, delivery-condition edits use the scheduled rental start as a conservative cutoff.

Backoffice requests a fresh read-only reschedule preview rather than reusing a cached commercial proposal. The write checks the resulting review identity against its own preparation. For routed delivery, the identity selects material terms and scope, not authorization or agreement attribution or calculation timestamps; those are not inputs to the review.

See [Rental Commitment](../../../src/modules/rental-commitment/README.md) and [ADR 0001](0001-rental-asset-reservation-concurrency-strategy.md).
