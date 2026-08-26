---
name: react-use-effect-guard
description: >
  Enforces correct useEffect usage in React code. Use this skill whenever
  React code is involved — even if the user does not mention useEffect.
  Claude tends to reach for useEffect as a default solution; this skill
  prevents that. Trigger on any request to write, review, or refactor React
  components, hooks, or features. This includes vague requests like "add a
  feature", "make this component do X", or "help me with this React code".
---

# React useEffect Guard

Reference: https://react.dev/learn/you-might-not-need-an-effect

## Core mental model

`useEffect` is for **synchronizing with external systems** — things outside React's control (DOM APIs, browser APIs, third-party libraries, network subscriptions). It is an escape hatch, not a general-purpose tool.

The key question to ask before writing any `useEffect`:

> _"Is this code running because the component appeared on screen, or because something else happened?"_

- **Because the component appeared** → `useEffect` may be appropriate
- **Because the user did something** → event handler
- **Because some state/props changed and I need a derived value** → compute during render

---

## Decision flowchart

Before writing or accepting any `useEffect`, run through this:

1. **Can this value be computed from existing state or props?**
   → Yes: compute inline during render. No `useEffect`, no extra state.
   → If expensive: wrap in `useMemo`, not `useEffect` + `useState`.

2. **Is this triggered by a user action (click, submit, input, drag)?**
   → Yes: put it in the event handler, not an `useEffect`.
   → Shared logic across handlers: extract a function, call it from each handler.

3. **Am I resetting or adjusting state when a prop changes?**
   → Resetting _all_ state: pass a `key` prop to the component instead.
   → Resetting _partial_ state: store an ID or primitive instead of the derived object, compute the rest during render.

4. **Am I chaining Effects that trigger each other via state?**
   → Move all the computation into the event handler that started the chain.

5. **Am I passing data up to a parent via an Effect?**
   → Invert the flow: let the parent fetch and pass data down as props.

6. **Am I notifying a parent about internal state changes via an Effect?**
   → Call the parent callback directly inside the event handler alongside `setState`.

7. **Am I running one-time app initialization in an Effect?**
   → Use a module-level variable (`let didInit = false`) or run the code at module scope outside the component.

8. **Am I subscribing to an external data store?**
   → Prefer `useSyncExternalStore` over a manual `useEffect` subscription.

9. **Am I fetching data that should stay synchronized with what's on screen?**
   → `useEffect` is appropriate here — but always add a cleanup function to handle race conditions (`let ignore = false`).

10. **Am I syncing with a truly external system?** (DOM, third-party widget, browser API, WebSocket)
    → `useEffect` is the right tool. Proceed.

---

## Anti-pattern quick reference

| Situation                           | ❌ Wrong                                        | ✅ Right                                       |
| ----------------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| Derive value from state/props       | `useEffect` + `setState`                        | Compute inline or `useMemo`                    |
| React to user action                | `useEffect` watching state set by handler       | Logic directly in event handler                |
| Reset state on prop change          | `useEffect(() => setState(null), [prop])`       | `key` prop on the component                    |
| Adjust partial state on prop change | `useEffect` watching prop                       | Compute derived value during render            |
| Share logic between handlers        | `useEffect` watching a trigger flag             | Extract shared function, call from handlers    |
| POST request on form submit         | `useEffect` watching `jsonToSubmit` state       | Call `fetch` directly in `handleSubmit`        |
| Chain of state updates              | Multiple `useEffect`s triggering each other     | Single event handler computing all next state  |
| App initialization                  | `useEffect(() => init(), [])`                   | Module-level `didInit` guard or top-level code |
| Notify parent of state change       | `useEffect(() => onChange(state), [state])`     | Call `onChange` in the event handler directly  |
| Pass data to parent                 | Child fetches → `useEffect` → calls `onFetched` | Parent fetches, passes data down as prop       |
| Subscribe to external store         | Manual `useEffect` with `addEventListener`      | `useSyncExternalStore`                         |
| Data fetching (screen-driven)       | `useEffect` without cleanup                     | `useEffect` with `ignore` flag cleanup         |

---

## Behavior rules

**When writing React code unprompted:**
Silently apply the correct pattern. Do not lecture the user about `useEffect` unless they ask why.

**When Claude's own solution would misuse `useEffect`:**
Catch it before writing. Explain briefly why the Effect is unnecessary and what pattern to use instead.

**When the user explicitly asks to use `useEffect` for a bad case:**
Refuse to write it. Explain the specific reason it's wrong (use the flowchart above), and ask a clarifying question to understand what they're actually trying to achieve — then propose the correct alternative.
