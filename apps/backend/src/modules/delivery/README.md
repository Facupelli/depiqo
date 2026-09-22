# Delivery

Delivery owns the tenant's current branch delivery policy. It uses that policy and current Branch facts to determine transportation serviceability and propose current Delivery and Collection terms for a rental. It does not own the historical delivery facts accepted by a rental; Rental Commitment owns those facts.

## Business semantics

### Branch delivery policy

A Branch may have a current Delivery policy that defines whether transportation is offered and under what conditions. The policy governs current Delivery and Collection quotes, including route- and distance-based coverage, eligible service windows, normal-service pricing windows, special-hours pricing, and the time transportation requires the equipment to remain reserved.

Disabling Delivery makes the service unavailable for current quotes without discarding the configured policy. The policy can remain available for reuse if Delivery is enabled again later.

### Coverage and serviceability

Delivery determines whether requested transportation is serviceable under the current branch policy. Coverage is based on the route between the Branch operational location and the customer destination together with the policy's coverage limits.

### Delivery and Collection

Delivery and Collection are separate transportation legs. Each may contribute its own quoted charge under the current branch Delivery policy.

### Service times

The policy distinguishes times when transportation is eligible to occur from normal-service times used for ordinary pricing. Transportation may be eligible outside normal-service hours while requiring special-hours pricing.

### Transport reservation

Delivery terms may include transportation time that extends the period during which rental equipment must remain operationally reserved. Delivery determines the current proposed transportation terms; Rental Commitment uses the accepted transportation facts when establishing the rental's physical reservation period.

## Current and accepted delivery terms

Current Delivery configuration and quotes are mutable proposals. When a rental accepts Delivery or Collection terms, Rental Commitment owns the accepted historical delivery facts needed to understand that rental.

Later changes to branch Delivery configuration, coverage, pricing, schedules, or transportation rules must not reinterpret already accepted rental history. Existing rentals are understood from their accepted transportation facts, not from a newly calculated current quote.

## Boundaries

- Tenant Management owns Branch identity, operational location, and effective timezone. Delivery uses those current facts to evaluate transportation.
- Delivery owns the current branch Delivery policy, serviceability, and proposed Delivery/Collection terms.
- Rental Commitment owns Delivery/Collection terms once accepted as part of a rental's historical facts.
