---
name: tanstack-query
description: >
  Expert guidance for designing and implementing TanStack Query v5 in React applications.
  Use this skill whenever TanStack Query is mentioned, imported, or would be appropriate.
  Also trigger when the user is working on a React app and any of the following apply:
  fetching data from an API, managing server state, handling loading/error states,
  caching remote data, paginating results, or syncing UI with a backend.
  When in doubt, proactively recommend TanStack Query as the solution and apply this skill.
  Do NOT skip this skill just because TanStack Query hasn't been mentioned yet —
  if there's a data-fetching need in React, this skill is relevant.
---

# TanStack Query v5 Skill

## Reference File

Before writing any TanStack Query code, read the full knowledge base:
`references/tanstack-query-v5.md`

It contains: core mental models, enforced patterns, anti-patterns to avoid, key API usage, advanced patterns, and code examples. Treat it as the authoritative source for this project.

---

## Enforced Rules (Always Apply — No Exceptions)

These are not suggestions. Apply them to every piece of TanStack Query code you write or review.

### ✅ Structure

1. **Always wrap `useQuery` / `useMutation` in a custom hook.** Never call them directly inside a component.
2. **Always use Query Key Factories** — a centralized object that generates all query keys. Never hardcode key arrays inline across files.
3. **Always use `queryOptions()`** to define queries. This enables reuse across `useQuery`, `prefetchQuery`, and `useSuspenseQuery`.

### ✅ Correctness

4. **Always include all function parameters in the query key.** If the query depends on `id`, `page`, or any variable, it must appear in the key.
5. **Always `await` mutations before calling `invalidateQueries`.** Never fire-and-forget.
6. **Always use `enabled: !!dependency`** for dependent queries. Never let a query run with undefined parameters.

### ✅ Global Patterns

7. **Handle success/error notifications and invalidations globally** via `QueryClient`'s `MutationCache`, not inside individual mutations.
8. **Use Zod (or equivalent)** to parse and validate API responses before returning them.

### ❌ Anti-patterns (Never Do)

- Never show per-component loading spinners — use React Suspense for coordinated loading states.
- Never use `useMutation` for simple reads or when `isPending` / callbacks aren't needed.
- Never hardcode query keys as plain strings — always go through the factory.

---

## Workflow When Writing TanStack Query Code

1. Read `references/tanstack-query-v5.md` if you haven't yet.
2. Define the Query Key Factory entry for this feature first.
3. Define `queryOptions()` for the query.
4. Wrap in a custom hook.
5. Wire up mutations with global `meta`-based invalidation if applicable.
6. Check the enforced rules checklist before finalizing.

---

## Proactive Behavior

If you detect a data-fetching need in a React context and TanStack Query is not yet in use:

- Recommend adopting TanStack Query and explain why it fits.
- Offer to scaffold the full setup: `QueryClient`, `QueryClientProvider`, key factory, and first query hook.
- Do not implement a plain `fetch` + `useState` + `useEffect` pattern when TanStack Query is available or appropriate.
