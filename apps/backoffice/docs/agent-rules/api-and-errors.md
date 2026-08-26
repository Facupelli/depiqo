# API And Error Rules

Prefer existing shared API and error-handling primitives over ad hoc request logic.

API and contract expectations:

- Prefer `apiFetch` and related shared helpers over raw `fetch` when calling the backend.
- Keep authentication and session behavior consistent with the existing helpers in `src/lib/` and auth-related features.
- Reuse backend response contracts instead of reshaping them unnecessarily.
- Validate boundary inputs with the existing schema layer rather than ad hoc parsing.

Error handling expectations:

- Prefer existing error types and patterns over raw `throw new Error(...)` when a structured app error already exists.
- Use `ProblemDetailsError` for backend or API failures surfaced through `apiFetch`.
- Do not silently swallow async errors.
- In route loaders and server functions, either map errors intentionally or let them bubble to the established route-level boundaries.
- Keep error messages actionable and specific.

For TanStack Query structure, query key design, and mutation patterns, use the `tanstack-query` skill.

For React-side effect decisions, use the `react-use-effect-guard` skill.
