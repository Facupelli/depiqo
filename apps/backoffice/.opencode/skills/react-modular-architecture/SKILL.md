---
name: react-modular-architecture
description: >
  Guides Claude to build modularized React applications using established UI patterns
  from Presentation Domain Data Layering. Use this skill whenever the user is:
  - Building a new React feature or page
  - Adding functionality to an existing React feature
  - Refactoring existing React components that mix concerns
  - Asking how to structure or organize React code
  - Writing any substantial React code (more than a single trivial component)

  Always apply this skill for React work that involves state, data fetching, business
  logic, or multiple components. Do not wait for the user to ask for "clean architecture"
  — apply it proactively. Even when modifying existing code that doesn't follow these
  patterns, nudge toward the layered approach as part of the change.
---

# React Modular Architecture Skill

## Core Philosophy

React is a **view library**, not a framework. A React application is a TypeScript
application that happens to use React for its UI. Treat it that way.

The key insight: **separate what things ARE (domain models) from what things DO
(hooks/services) from what things LOOK LIKE (components)**. This separation lets
you change any one layer without touching the others.

> Read `references/patterns.md` for deeper explanations and full code examples
> of each pattern described below.

---

## The Four Layers

Every feature is composed of these layers, each with a single responsibility:

### 1. View (`components/`)

- Pure, presentational React components
- Receive everything via props — no data fetching, no business logic
- Should read like HTML with variables
- Stateless whenever possible; if state is needed, it belongs in a hook

```tsx
// ✅ Good: pure, focused on rendering
const PaymentMethods = ({ options }: { options: PaymentMethod[] }) => (
  <>
    {options.map((method) => (
      <label key={method.provider}>
        <input type="radio" name="payment" value={method.provider}
          defaultChecked={method.isDefaultMethod} />
        <span>{method.label}</span>
      </label>
    ))}
  </>
);

// ❌ Bad: fetching and transforming data inside a component
const PaymentMethods = () => {
  useEffect(() => {
    fetch('/api/payment-methods').then(...)
  }, [])
  ...
}
```

### 2. Hooks (`hooks/`)

- Manage state and side effects
- Bridge between the view and the layers below (models, services)
- Think of a hook as a **state machine behind a view**: UI events go in, new state comes out
- Never contain raw fetch calls — delegate to the service layer

```ts
// hooks/usePaymentMethods.ts
export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    fetchPaymentMethods().then(setPaymentMethods);
  }, []);

  return { paymentMethods };
};
```

### 3. Models (`models/`)

- Plain TypeScript classes or objects — **no React, no hooks, no JSX**
- Encapsulate business logic, data mapping, and domain rules
- Handle conversion from remote/API shapes to local domain shapes
- This code is reusable outside React (other views, backend services, CLI tools)

```ts
// models/PaymentMethod.ts
class PaymentMethod {
  constructor(private remote: RemotePaymentMethod) {}

  get provider() {
    return this.remote.name;
  }
  get label() {
    return `Pay with ${this.provider}`;
  }
  get isDefaultMethod() {
    return this.provider === "cash";
  }
}
```

### 4. Services (`services/`)

- Encapsulate data fetching and external system access
- Act as an **Anti-Corruption Layer**: convert remote data shapes into domain models
- Keep all URL/API knowledge in one place
- Pure async functions — no React, no state

```ts
// services/paymentService.ts
export const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const response = await fetch("https://api.example.com/payment-methods");
  const methods: RemotePaymentMethod[] = await response.json();
  return convertPaymentMethods(methods);
};
```

---

## Folder Structure

Organize by **feature**, not by type. Every feature is self-contained:

```
src/
└── features/
    └── payment/
        ├── components/
        │   ├── Payment.tsx          ← feature root component
        │   ├── PaymentMethods.tsx   ← sub-component
        │   └── DonationCheckbox.tsx ← sub-component
        ├── hooks/
        │   ├── usePaymentMethods.ts
        │   └── useRoundUp.ts
        ├── models/
        │   └── PaymentMethod.ts
        ├── services/
        │   └── paymentService.ts
        └── utils.ts                 ← pure helper functions (label formatting, etc.)
```

Shared/reusable code (used by multiple features) lives in:

```
src/
├── components/   ← shared UI components
├── models/       ← shared domain models
└── services/     ← shared service utilities
```

---

## TypeScript Rules

Always use TypeScript. Key practices:

- Define types for remote (API) shapes separately from local (domain) shapes
- Use interfaces for contracts between layers (especially for Strategy pattern)
- Use classes with typed getters for domain models — encapsulates logic cleanly
- Name remote types explicitly: `RemotePaymentMethod` vs `PaymentMethod`

```ts
// types.ts (per feature or shared)
export interface RemotePaymentMethod {
  name: string; // shape from the API
}

export interface LocalPaymentMethod {
  provider: string; // shape used in the UI
  label: string;
}
```

---

## When to Apply Each Refactoring Step

Use this as a decision checklist when building or refactoring:

| Smell                                                                          | Action                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------ |
| Component has `useEffect` + `fetch`                                            | Extract a service function                       |
| Component has `useState` + logic                                               | Extract a custom hook                            |
| Inline data mapping / transformation                                           | Extract a domain model class                     |
| `if/switch` on a variant (country, type, role...) scattered in multiple places | Apply Strategy pattern                           |
| Sub-section of JSX is self-contained                                           | Extract a sub-component                          |
| Inline string formatting / label logic                                         | Extract a `utils.ts` helper function             |
| Prop passed through a component that doesn't use it                            | Feature Context (see advanced patterns)          |
| Component accepts 5+ props controlling its internal structure                  | Compound Components (see advanced patterns)      |
| Hook manages two or more unrelated concerns                                    | Split into focused hooks (see advanced patterns) |

---

## Refactoring Approach

When working on **existing code** that doesn't follow these patterns:

1. Don't rewrite everything at once — refactor one layer at a time
2. Start with the most impactful split: **separate view from non-view code first**
3. Then extract hooks, then models, then services
4. Each step should leave the behavior identical — only the structure changes
5. Call out what you're doing: "I'm extracting the data fetching into a service layer here, so the hook stays clean"

---

## Single-File Adaptation

When working in a **single-file context** (Claude.ai artifacts, sandboxes, demos),
file separation is impossible — but the four layers still apply. Express them as
named regions within the file, top to bottom:

```tsx
// ── Models ────────────────────────────────────────────────────────────────
class PaymentMethod { ... }

// ── Services ──────────────────────────────────────────────────────────────
const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => { ... }

// ── Hooks ─────────────────────────────────────────────────────────────────
const usePaymentMethods = () => { ... }

// ── Components ────────────────────────────────────────────────────────────
const PaymentList = ({ methods }: { methods: PaymentMethod[] }) => ( ... )
const PaymentPage = () => { ... }
```

**Rules for single-file work:**

- Models are still classes or typed factory functions — not inline object literals
- Services are still named async functions — not anonymous callbacks inside `useEffect`
- Hooks still never contain raw `fetch` calls — they call the service functions above them
- Components are still pure — they receive everything via props or context
- The separation is logical (clear regions), not physical (separate files)

Co-location is acceptable; mixing concerns is not.

---

## Patterns Reference

For detailed explanations and full examples of:

- **Strategy Pattern** (replacing scattered conditionals with polymorphism)
- **Anti-Corruption Layer** (service functions as a gateway to external data)
- **Extract Hook** (moving state machines out of components)
- **Domain Model** (encapsulating logic in plain TypeScript classes)

→ Read `references/patterns.md`

## Advanced Patterns Reference

For managing complexity beyond the four-layer split — component communication,
prop reduction, and hook discipline:

- **Feature Context** — page-level shared state to stop prop drilling
- **Compound Components** — namespace pattern to eliminate prop-heavy leaf components
- **Hook Splitting** — one concern per hook; compose them in a page hook

→ Read `references/advanced-patterns.md`

**When to reach for these:** As soon as you notice props traveling through
components that don't use them, a component accepting 5+ structural props,
or a hook that does more than one thing.
