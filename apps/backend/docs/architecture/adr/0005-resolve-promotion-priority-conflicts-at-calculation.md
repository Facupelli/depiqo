# Resolve promotion priority conflicts at calculation

Promotion authoring only rejects priority conflicts it can identify without rental data: active, unrestricted all-lines promotions with overlapping validity that can be considered together. A blanket uniqueness check would also reject valid configurations such as mutually exclusive rental-unit ranges. Rental pricing remains authoritative for conflicts that depend on the eligible lines and the payable effect.

The planner sorts by descending priority but does not stop at the first eligible non-stackable promotion. Whether it has a positive payable effect can only be established after higher-priority discounts have changed the line totals. A zero-effect promotion must not prevent later promotions from applying.
