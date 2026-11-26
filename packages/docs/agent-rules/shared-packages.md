# Shared Package Rules

Shared packages define contracts and tooling used across the monorepo. Prefer small, compatibility-aware changes.

General rules:

- Prefer additive changes over breaking changes when updating shared contracts.
- Update the source package artifact rather than editing generated output in `dist/`.
- Keep package exports explicit and stable.
- Use nearby source files as the primary examples for naming and file placement.
- When changing a shared contract, think through both backend and web consumers before finalizing the shape.

Package roles:

- `@repo/api-contracts` holds backend/web API contracts, DTO schemas, and shared contract enums.
- `@repo/typescript-config` holds shared TypeScript compiler config.

Validation guidance:

- For package-only changes, run the package's own build or lint command when available.
- When a shared package change affects apps, rebuild the package and validate the affected consumers. See the [non-browser verification guide](../../../docs/verification.md) for Backend and Backoffice setup and checks.

Representative examples:

- shared contract entrypoint: `packages/api-contracts/src/index.ts`
