---
name: zustand-store-design
description: >
  Expert guidance for designing, structuring, and reviewing Zustand stores in React applications.
  Use this skill whenever the user mentions Zustand, asks how to structure client state, wants to
  design a new store, or shares existing store code for review or improvement. Trigger even for
  adjacent phrases like "global state", "state management", "zustand slice", "zustand context",
  or "store design" — the user doesn't need to say "design a store" explicitly. Always use this
  skill before writing any Zustand code or giving any Zustand advice.
---

# Zustand Store Design

This skill encodes best practices for designing Zustand stores, based on TkDodo's authoritative
posts: "Working with Zustand" and "Zustand and React Context".

It covers two modes:

- **Design mode** – help the user design a new store from scratch
- **Review mode** – critique and improve an existing store

---

## Step 1: Determine the Mode

- If the user shares existing store code → enter **Review mode**
- If the user is describing something to build → enter **Design mode**
- If unclear, ask: _"Are you designing a new store or would you like me to review an existing one?"_

---

## Step 2 (Design mode only): Determine the Scope

Before writing or advising on any store, determine whether it should be **global** or
**context-scoped**. This is the most important architectural decision.

### Infer from context first

**Strong signals for a global store:**

- Auth, session, or current user state
- App-wide UI state (sidebar, theme, feature flags, notifications)
- Shopping cart or other app-level domain state
- State that multiple unrelated parts of the app need simultaneously

**Strong signals for a context-scoped store:**

- The component is reusable (design system components, data grids, multi-step forms)
- The store needs to be initialized from props
- Multiple instances of the same component may appear on one page
- State is only relevant to a specific route or feature subtree (e.g. "Dashboard filters")
- The user mentions testing isolation as a concern

**If signals are ambiguous**, ask exactly one clarifying question before proceeding:

> _"Will this store be used across the whole app, or is it specific to a particular feature,
> route, or reusable component?"_

Do not ask this question if the scope is already clear from context.

---

## Pattern A: Global Store

Use when state is truly app-wide. Apply all five rules below.

### Rule 1 — Never export the raw store

The `create(...)` call should never be exported. Consumers must never be able to subscribe to
the entire store accidentally.

```ts
// ✅ correct
const useBearStore = create<BearState>()((set) => ({ ... }))

export const useBears = () => useBearStore((state) => state.bears)
```

```ts
// ❌ wrong — exposes the whole store
export const useBearStore = create<BearState>()((set) => ({ ... }))

// This accidentally subscribes to everything:
const { bears } = useBearStore()
```

### Rule 2 — Prefer atomic selectors

Selectors are compared with strict equality by default. Returning a new object or array on every
call causes unnecessary re-renders, even if the values didn't change.

```ts
// ❌ returns a new object every render → always triggers re-render
const { bears, fish } = useBearStore((state) => ({
  bears: state.bears,
  fish: state.fish,
}));

// ✅ atomic — one hook per value
export const useBears = () => useBearStore((state) => state.bears);
export const useFish = () => useBearStore((state) => state.fish);
```

If multiple values are genuinely needed in one call, use `shallow` from `zustand/shallow` as the
equality function. But prefer atomic hooks when possible.

### Rule 3 — Separate actions from state

Actions are static — they never change. Grouping them under a single `actions` key lets you
export one hook for all mutations without any performance cost.

```ts
const useBearStore = create<BearState>()((set) => ({
  bears: 0,
  fish: 0,
  actions: {
    increasePopulation: (by: number) =>
      set((state) => ({ bears: state.bears + by })),
    eatFish: () => set((state) => ({ fish: state.fish - 1 })),
    removeAllBears: () => set({ bears: 0 }),
  },
}));

export const useBears = () => useBearStore((state) => state.bears);
export const useFish = () => useBearStore((state) => state.fish);
export const useBearActions = () => useBearStore((state) => state.actions);
```

Destructuring from `useBearActions()` is fine — since actions never change, subscribing to all
of them at once has no performance cost.

```ts
const { increasePopulation } = useBearActions();
```

### Rule 4 — Model actions as events, not setters

Actions should express _intent_, not raw state mutations. Business logic belongs in the store,
not in the component.

```ts
// ❌ setter — logic leaks into the component
setCount(count + 1);
setItems(items.filter((i) => i.id !== id));

// ✅ event — store owns the logic
increasePopulation(1);
removeItem(id);
```

### Rule 5 — Keep stores small and single-responsibility

Zustand encourages multiple small stores over one large one. If you need to combine stores,
do it in a custom hook — not by merging stores.

```ts
// ✅ compose stores at the hook level
export const useCurrentUserProfile = () => {
  const currentUser = useCredentialsStore((state) => state.currentUser);
  const profile = useUsersStore((state) => state.users[currentUser]);
  return profile;
};
```

Combining a store with server state (React Query) follows the same pattern:

```ts
export const useFilteredTodos = () => {
  const filters = useFilterStore((state) => state.applied);
  return useQuery({
    queryKey: ["todos", filters],
    queryFn: () => getTodos(filters),
  });
};
```

---

## Pattern B: Context-Scoped Store

Use when:

- The store needs to be initialized from props
- The component must be reusable / instantiable multiple times
- Testing isolation is a priority
- The state is scoped to a subtree, not the whole app

### The pattern

Use `createStore` (vanilla, from `'zustand'`) inside a `useState` initializer — this ensures
the store is created once per provider mount. Pass the store instance via React Context.

```ts
import { createStore, useStore } from 'zustand'

// 1. Define state shape
interface BearState {
  bears: number
  actions: {
    increasePopulation: (by: number) => void
    removeAllBears: () => void
  }
}

// 2. Create context
const BearStoreContext = React.createContext<ReturnType<typeof createStore<BearState>> | null>(null)

// 3. Provider — initializes store with props
interface BearStoreProviderProps {
  initialBears: number
  children: React.ReactNode
}

export const BearStoreProvider = ({ children, initialBears }: BearStoreProviderProps) => {
  const [store] = React.useState(() =>
    createStore<BearState>((set) => ({
      bears: initialBears,         // ✅ true initialization from props, not sync
      actions: {
        increasePopulation: (by) => set((state) => ({ bears: state.bears + by })),
        removeAllBears: () => set({ bears: 0 }),
      },
    }))
  )

  return (
    <BearStoreContext.Provider value={store}>
      {children}
    </BearStoreContext.Provider>
  )
}

// 4. Base hook — reads store from context
const useBearStore = <T>(selector: (state: BearState) => T): T => {
  const store = React.useContext(BearStoreContext)
  if (!store) throw new Error('Missing BearStoreProvider')
  return useStore(store, selector)
}

// 5. Public hooks — same atomic selector pattern as global stores
export const useBears       = () => useBearStore((state) => state.bears)
export const useBearActions = () => useBearStore((state) => state.actions)
```

### Why `useState` and not `useRef` for store creation

`useState(() => createStore(...))` uses the initializer function form, which runs only once.
This prevents re-creating the store on every render while keeping the store instance stable.
`useRef` works too, but requires a null-check on every access. `useState` is cleaner.

### Key advantages over global stores

| Problem               | Global store                                     | Context-scoped store                  |
| --------------------- | ------------------------------------------------ | ------------------------------------- |
| Initialize from props | Requires `useEffect` sync (causes double render) | True initialization in `useState`     |
| Test isolation        | Requires mocking + manual resets between tests   | Each render tree gets its own store   |
| Multiple instances    | State is shared/overwritten across instances     | Each provider instance is independent |

---

## Review Mode

When the user shares existing store code, evaluate it against each rule and report findings.

### Review checklist

1. **Raw store exported?** → Recommend wrapping in custom hooks
2. **Selectors returning objects/arrays without `shallow`?** → Flag re-render risk; suggest atomic hooks
3. **Actions mixed with state at the top level?** → Suggest grouping under `actions` key
4. **Actions named as setters (`setX`, `updateY`)?** → Suggest renaming to express intent
5. **One large store doing too much?** → Suggest splitting by responsibility
6. **Store initialized with `useEffect` from props?** → Suggest Context-scoped pattern
7. **Store used in a reusable component or rendered multiple times?** → Suggest Context-scoped pattern

### Review output format

For each issue found:

- State the **rule violated** (by name)
- Show the **problematic code** snippet
- Show the **corrected version**
- Briefly explain **why** it matters

If no issues are found, confirm which rules the store already follows and note any optional
improvements.

---

## Quick Reference

| Concern                     | Recommendation                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------- |
| Store access                | Never export raw store; always use custom hooks                                        |
| Selector granularity        | One hook per value (atomic)                                                            |
| Actions                     | Group under `actions` key; export single `useXActions()` hook                          |
| Action naming               | Events (`removeAllBears`) not setters (`setBears`)                                     |
| Store size                  | Small + single-responsibility; compose in hooks                                        |
| Scope                       | Global for app-wide state; Context-scoped for features, reusable components, prop-init |
| Combining stores            | Custom hooks, not store merging                                                        |
| Combining with server state | Custom hook wrapping both `useStore` and `useQuery`                                    |
