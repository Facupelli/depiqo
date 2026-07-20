# Advanced Patterns Reference

Three patterns for managing complexity beyond the four-layer split:
component communication, prop reduction, and hook discipline.

All examples are written as **single-file compatible** code — no imports
from other files, classes and functions defined at the top of the file.

---

## 1. Feature Context (Page-Level Shared State)

**When to use:**
More than two components in the same feature/page need the same data.
Passing it as props means intermediate components carry data they don't use.

**The rule of thumb:**

> If a prop travels through a component that doesn't use it, it belongs in a context.

**Smell:**

```tsx
// Page passes selectedId down to Panel, which passes it to Detail,
// which finally uses it — but Panel itself never reads selectedId.
const Page = () => {
  const { items, selectedId, onSelect } = useItems();
  return <Panel items={items} selectedId={selectedId} onSelect={onSelect} />;
};

const Panel = ({ items, selectedId, onSelect }) => (
  // Panel doesn't use selectedId — it just passes it along
  <div>
    <List items={items} onSelect={onSelect} />
    <Detail selectedId={selectedId} />
  </div>
);
```

**After — feature context:**

```tsx
// 1. Define context and a typed hook to consume it
interface OrdersContextValue {
  items: Order[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

const useOrdersContext = (): OrdersContextValue => {
  const ctx = useContext(OrdersContext);
  if (!ctx)
    throw new Error("useOrdersContext must be used inside OrdersProvider");
  return ctx;
};

// 2. Provider owns all the state — lives at the page/feature root
const OrdersProvider = ({ children }: { children: React.ReactNode }) => {
  const { items, selectedId, onSelect } = useOrders(); // your hook
  return (
    <OrdersContext.Provider value={{ items, selectedId, onSelect }}>
      {children}
    </OrdersContext.Provider>
  );
};

// 3. Components consume only what they need — no prop drilling
const Panel = () => (
  <div>
    <List />
    <Detail />
  </div>
);

const List = () => {
  const { items, onSelect } = useOrdersContext();
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} onClick={() => onSelect(item.id)}>
          {item.label}
        </li>
      ))}
    </ul>
  );
};

const Detail = () => {
  const { selectedId, items } = useOrdersContext();
  const item = items.find((i) => i.id === selectedId);
  if (!item) return <p>Select an item</p>;
  return <p>{item.label}</p>;
};

// 4. Page composes everything cleanly
const OrdersPage = () => (
  <OrdersProvider>
    <Panel />
  </OrdersProvider>
);
```

**Why it matters:**

- `Panel` no longer knows about `selectedId` — it just composes children
- Each component declares exactly the data it needs
- Adding a new consumer anywhere in the tree requires zero changes to intermediate components

---

## 2. Compound Components (Reduce Leaf Props via Composition)

**When to use:**
A component receives many props that control its internal structure or variants.
The caller knows more about layout than the component does.

**The rule of thumb:**

> If a component accepts props that just decide _which sub-parts to render_,
> those sub-parts should be separate components the caller composes directly.

**Smell:**

```tsx
// Caller has to know about header, footer, actions, and badge variants
<Card
  title="Order #123"
  subtitle="March 2026"
  badge="Pending"
  badgeVariant="warning"
  actions={[{ label: "Cancel", onClick: handleCancel }]}
  footer="Last updated 2h ago"
/>
```

**After — compound component:**

```tsx
// 1. Define sub-components — each owns one visual concern
const CardRoot = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`card ${className ?? ""}`}>{children}</div>;

const CardHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <div className="card-header">
    <h3>{title}</h3>
    {subtitle && <p>{subtitle}</p>}
  </div>
);

const CardBadge = ({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "warning" | "success";
}) => <span className={`badge badge--${variant}`}>{label}</span>;

const CardFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="card-footer">{children}</div>
);

// 2. Attach sub-components as properties of the root (namespace pattern)
const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Badge: CardBadge,
  Footer: CardFooter,
});

// 3. Caller composes exactly what it needs — nothing more
const OrderCard = ({ order }: { order: Order }) => (
  <Card>
    <Card.Header title={`Order #${order.id}`} subtitle={order.date} />
    <Card.Badge label={order.status} variant="warning" />
    <Card.Footer>
      <button onClick={handleCancel}>Cancel</button>
    </Card.Footer>
  </Card>
);
```

**Why it matters:**

- `Card` has no knowledge of orders, statuses, or actions — it's a pure layout primitive
- The caller controls structure; the sub-components control appearance
- Adding a new card layout variant requires zero changes to `Card` itself
- Each sub-component is independently testable and reusable

**When NOT to use:**
If the internal structure never varies between callers, a single component with
a few props is simpler and preferable. Compound components earn their complexity
only when the caller needs real structural control.

---

## 3. Hook Splitting (One Concern Per Hook)

**When to use:**
A single hook manages multiple unrelated concerns — remote data AND local UI state,
or multiple independent async operations. It becomes a god-object that's hard to
test, hard to read, and couples unrelated logic.

**The rule of thumb:**

> One hook = one concern. If you need to explain what a hook does with "and", split it.

**Smell:**

```ts
// useOrdersPage manages: fetching, filtering, selection, AND modal state
// Nothing here is wrong individually — but they're unrelated concerns bundled together
const useOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchOrders().then(setOrders);
  }, []);

  const filtered = orders.filter(
    (o) => filter === "all" || o.status === filter,
  );
  const selected = orders.find((o) => o.id === selectedId) ?? null;

  return {
    filtered,
    filter,
    setFilter,
    selectedId,
    setSelectedId,
    selected,
    isModalOpen,
    setIsModalOpen,
  };
};
```

**After — split by concern:**

```ts
// Concern 1: remote data only
const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders().then(setOrders);
  }, []);

  return { orders };
};

// Concern 2: filtering derived from orders
const useOrderFilter = (orders: Order[]) => {
  const [filter, setFilter] = useState("all");
  const filtered = orders.filter(
    (o) => filter === "all" || o.status === filter,
  );
  return { filtered, filter, setFilter };
};

// Concern 3: selection state
const useOrderSelection = (orders: Order[]) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = orders.find((o) => o.id === selectedId) ?? null;
  return { selectedId, setSelectedId, selected };
};

// Concern 4: modal visibility — generic, reusable
const useDisclosure = () => {
  const [isOpen, setIsOpen] = useState(false);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  return { isOpen, open, close };
};

// Page hook composes them — reads like a table of contents for the page
const useOrdersPage = () => {
  const { orders } = useOrders();
  const { filtered, filter, setFilter } = useOrderFilter(orders);
  const { selectedId, setSelectedId, selected } = useOrderSelection(orders);
  const modal = useDisclosure();

  return {
    filtered,
    filter,
    setFilter,
    selectedId,
    setSelectedId,
    selected,
    modal,
  };
};
```

**Why it matters:**

- Each hook is independently testable with minimal setup
- `useDisclosure` is now reusable for any modal/drawer/tooltip in the app
- `useOrderFilter` can be reused if another page needs the same filtering logic
- The page hook becomes a readable composition — a map of what the page does
- Changing how filtering works never touches selection logic or data fetching

**Composition pattern:**
When a page has many concerns, write a top-level "page hook" that composes
the smaller hooks. The page component calls only the page hook — one line,
clean interface.

---

## Summary: Which Pattern for Which Problem?

| Symptom                                                                       | Pattern               |
| ----------------------------------------------------------------------------- | --------------------- |
| Props passed through components that don't use them                           | Feature Context       |
| Component accepts props that control its internal structure                   | Compound Components   |
| A hook manages two or more unrelated concerns                                 | Hook Splitting        |
| Generic stateful behavior repeated across hooks (open/close, toggle, counter) | Extract reusable hook |
