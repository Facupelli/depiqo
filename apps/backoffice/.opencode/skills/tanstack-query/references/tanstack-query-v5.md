# TanStack Query v5 — Knowledge Base

Synthesized from 5 video sources. Use this as the authoritative reference for all TanStack Query v5 decisions.

---

## Core Concepts & Mental Models

TanStack Query manages **server state** — data that lives on a backend and must be fetched asynchronously. It is not a replacement for local UI state (`useState`).

- **Cache as a Key-Value Store:** The `QueryClient` functions like a large object. Query Keys are the unique identifiers (keys); fetched data is the value.
- **Fresh vs. Stale:** Cached data is either _fresh_ (use immediately) or _stale_ (needs refetching). By default, data becomes stale instantly (`staleTime: 0`). Set `staleTime` explicitly to control this.
- **Query Keys drive everything:** When a key changes (e.g., a page number or ID updates), TanStack Query automatically fetches new data and caches it separately under the new key.

---

## Enforced Patterns

### 1. Custom Hooks

Never call `useQuery` or `useMutation` directly in a component. Always wrap them:

```typescript
// ✅ Correct
export function useContacts(page: number) {
  return useQuery(contactQueries.list(page));
}

// ❌ Wrong — direct call in component
function ContactList() {
  const { data } = useQuery({ queryKey: ["contacts"], queryFn: fetchContacts });
}
```

### 2. Query Key Factories

Centralize all query keys in a factory object. This prevents key mismatches during invalidation or prefetching:

```typescript
export const contactQueries = {
  all: () => ["contacts"] as const,
  lists: () => [...contactQueries.all(), "list"] as const,
  list: (page: number) =>
    queryOptions({
      queryKey: [...contactQueries.lists(), page],
      queryFn: () => fetchContacts(page),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...contactQueries.all(), "detail", id],
      queryFn: () => fetchContact(id),
    }),
};
```

**Hierarchical invalidation** is the key superpower here. Because keys are nested, `invalidateQueries` cascades down the hierarchy:

```typescript
// Invalidates EVERYTHING contact-related (lists + details)
queryClient.invalidateQueries({ queryKey: contactQueries.all() });

// Invalidates only list queries — detail cache stays intact
queryClient.invalidateQueries({ queryKey: contactQueries.lists() });

// Invalidates only this one specific contact detail
queryClient.invalidateQueries({ queryKey: contactQueries.detail(id).queryKey });
```

**Default rule:** use global `meta`-based invalidation for standard cases. Use surgical per-level invalidation only when you need fine-grained control — for example, updating a single contact where you want to refresh lists (the name may appear there) but not evict every other detail from cache.

### 3. `queryOptions()` Helper

Use `queryOptions()` to define reusable, typed query configurations:

```typescript
// Define once
export const userQuery = (id: string) =>
  queryOptions({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

// Reuse anywhere
const { data } = useQuery(userQuery(id));
await queryClient.prefetchQuery(userQuery(id));
const data = useSuspenseQuery(userQuery(id));
```

### 4. Global Mutation Handling via `meta`

Use `meta` fields and `MutationCache` to handle invalidations and notifications globally — not per-mutation:

```typescript
// Mutation — declare intent via meta
const useDeleteContact = () => {
  return useMutation({
    mutationFn: (id: string) => client.deleteContact(id),
    meta: {
      invalidates: contactQueries.all(),
      successMessage: "Contact deleted successfully!",
    },
  });
};

// QueryClient — handle globally
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSettled: (data, error, variables, context, mutation) => {
      if (mutation.meta?.invalidates) {
        queryClient.invalidateQueries({ queryKey: mutation.meta.invalidates });
      }
    },
    onSuccess: (data, variables, context, mutation) => {
      if (mutation.meta?.successMessage) {
        toast.success(mutation.meta.successMessage);
      }
    },
  }),
});
```

---

## Anti-patterns to Avoid

| Anti-pattern                      | Why it's wrong                                            | Fix                                                                   |
| --------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| Missing params in query key       | Cache returns wrong data for different params             | Always include every variable the `queryFn` uses                      |
| Per-component loading spinners    | Causes "spinner hell" — flickering UI                     | Use React Suspense for coordinated loading                            |
| Fire-and-forget invalidation      | Race condition — list refreshes before server finishes    | Always `await` the mutation before `invalidateQueries`                |
| Using `useMutation` unnecessarily | Adds complexity when simple `fetch` + invalidate suffices | Only use `useMutation` when you need `isPending`, callbacks, or retry |
| Hardcoded inline query keys       | Key mismatches during invalidation                        | Always use the Query Key Factory                                      |

---

## Key APIs

### `useQuery`

Primary hook for reading data:

```typescript
const { data, isPending, isError, refetch } = useQuery({
  queryKey: ["contacts", page],
  queryFn: () => fetchContacts(page),
  staleTime: 60_000,
});
```

### `useMutation`

For CUD operations. Provides `mutate`, `mutateAsync`, and lifecycle callbacks:

```typescript
const { mutate, isPending } = useMutation({
  mutationFn: (newContact: Contact) => createContact(newContact),
  onSuccess: () => {
    /* per-mutation override if needed */
  },
});
```

### `useInfiniteQuery`

For pagination and infinite scroll:

```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ["contacts", "infinite"],
  queryFn: ({ pageParam }) => fetchContacts(pageParam),
  initialPageParam: 1,
  getNextPageParam: (lastPage, pages) => lastPage.nextPage ?? undefined,
});
```

### `useSuspenseQuery`

Suspends the component while loading. Use with React Suspense boundaries:

```typescript
// Component suspends until data is ready — no isPending check needed
const { data } = useSuspenseQuery(contactQueries.list(page));
```

### `QueryClient` Methods

```typescript
// Invalidate and refetch
await queryClient.invalidateQueries({ queryKey: contactQueries.all() });

// Prefetch before navigation
await queryClient.prefetchQuery(contactQueries.detail(id));

// Manually write to cache
queryClient.setQueryData(contactQueries.all(), updatedData);

// Read from cache
const cached = queryClient.getQueryData(contactQueries.all());
```

### `enabled` Flag — Dependent Queries

```typescript
const { data: user } = useQuery({
  queryKey: ["user", email],
  queryFn: () => fetchUser(email),
});

const { data: projects } = useQuery({
  queryKey: ["projects", user?.id],
  queryFn: () => fetchProjects(user!.id),
  enabled: !!user?.id, // Only runs after user is available
});
```

---

## Advanced Patterns

### Optimistic Updates (Cache-level)

```typescript
const mutation = useMutation({
  mutationFn: updateContact,
  onMutate: async (newContact) => {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey: contactQueries.all() });

    // Snapshot current value for rollback
    const previousContacts = queryClient.getQueryData(contactQueries.all());

    // Optimistically update cache
    queryClient.setQueryData(contactQueries.all(), (old) =>
      old.map((c) => (c.id === newContact.id ? newContact : c)),
    );

    return { previousContacts };
  },
  onError: (err, newContact, context) => {
    // Rollback on error
    queryClient.setQueryData(contactQueries.all(), context?.previousContacts);
  },
  onSettled: () => {
    // Always refetch to sync with server
    queryClient.invalidateQueries({ queryKey: contactQueries.all() });
  },
});
```

### Dynamic `queryOptions` — The "Menace" Pattern

When the same query needs different behavior in different components (e.g., `enabled` in one, always-on in another), make `queryOptions` accept an optional overrides argument:

```typescript
export const contactQueries = {
  list: (page: number, overrides?: Partial<UseQueryOptions>) =>
    queryOptions({
      queryKey: [...contactKeys.lists(), page],
      queryFn: () => fetchContacts(page),
      ...overrides, // Caller can override enabled, staleTime, select, etc.
    }),
};

// Usage — disabled until user interacts
useQuery(contactQueries.list(page, { enabled: isSearchActive }));

// Usage — always runs, with a custom selector
useQuery(
  contactQueries.list(page, { select: (data) => data.map((c) => c.name) }),
);
```

Use this pattern sparingly — only when a query genuinely needs different runtime behavior across callsites. Don't add `overrides` by default.

### Optimistic Updates (UI-level)

For simpler cases, use `useMutationState` to read pending mutations and reflect them in the UI without touching the cache.

### Prefetching on Hover

```typescript
function ContactLink({ id }: { id: string }) {
  const queryClient = useQueryClient();

  return (
    <Link
      to={`/contacts/${id}`}
      onMouseEnter={() => queryClient.prefetchQuery(contactQueries.detail(id))}
    >
      View Contact
    </Link>
  );
}
```

### Selectors

Use `select` to transform data before it reaches the component. The component only re-renders if the _transformed_ result changes:

```typescript
const { data: contactNames } = useQuery({
  ...contactQueries.list(page),
  select: (data) => data.map((c) => c.name), // Component only re-renders if names change
});
```

### `initialData` vs `placeholderData`

|                             | `initialData`                                    | `placeholderData`                |
| --------------------------- | ------------------------------------------------ | -------------------------------- |
| Persisted in cache          | ✅ Yes                                           | ❌ No                            |
| Triggers background refetch | Only if stale                                    | Always                           |
| Use case                    | Data you already have (e.g., from list → detail) | Prevent flicker while paginating |

```typescript
// placeholderData for pagination — keeps old data visible while new page loads
const { data } = useQuery({
  ...contactQueries.list(page),
  placeholderData: (previousData) => previousData,
});
```

---

## Zod Integration

Always validate API responses:

```typescript
import { z } from "zod";

const ContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const fetchContact = async (id: string) => {
  const res = await fetch(`/api/contacts/${id}`);
  const json = await res.json();
  return ContactSchema.parse(json); // Throws if shape is wrong
};
```
