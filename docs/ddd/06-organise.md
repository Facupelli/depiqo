# 06 - Organise

## Purpose

This step records how the system should be organized for solo development before final bounded contexts are defined.

Because there is only one developer, this step does not map teams to bounded contexts.

Instead, it identifies cognitive boundaries, areas that must be kept close together, areas that should remain independent, and areas that should stay boring/simple.

## Candidate areas to keep close

Rental order state, asset assignment, asset blocking, and confirmed price snapshot must be designed together because they form the rental commitment.

## Candidate areas to keep separate

Customer-facing lightweight flow should stay separate from professional workflow complexity.

Notifications should stay separate from core confirmation.

Contract signing should stay separate from order state.

Reporting should stay separate from operational decisions.

## Areas to keep simple

Tenant/user management, authentication, notifications, basic reporting, and contract signing infrastructure should remain simple unless future evidence shows they need richer modeling.
