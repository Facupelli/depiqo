# Upstream provenance

Repository: https://github.com/dmmulroy/anti-slop
Commit: c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b

The rule implementations and required shared helpers in this directory were
vendored from the upstream commit above.

DEPIQO intentionally vendors only the rules it has reviewed and selected.
Future upstream changes must be reviewed and incorporated deliberately.

## Intentional deviations

### `no-unknown-parameters`

The pinned upstream rule exempts `cause: unknown`. DEPIQO exempts both
`cause: unknown` and `error: unknown` because both represent the same legitimate
arbitrary thrown-value boundary, and DEPIQO conventionally names these
parameters `error`.
