# Patterns Reference

Deep explanations and full code examples for the four key patterns used in
the React Modular Architecture skill.

---

## 1. Extract Hook

**When to use:** A component has `useState` + logic intertwined with rendering.
The hook becomes the "state machine behind the view" — UI events go in, new state comes out.

**Before:**

```tsx
export const Payment = ({ amount }: { amount: number }) => {
  const [agreeToDonate, setAgreeToDonate] = useState(false);

  const total = agreeToDonate ? Math.floor(amount + 1) : amount;
  const tip = parseFloat((Math.floor(amount + 1) - amount).toPrecision(10));

  return (
    <div>
      <input
        type="checkbox"
        onChange={() => setAgreeToDonate((v) => !v)}
        checked={agreeToDonate}
      />
      <button>${total}</button>
    </div>
  );
};
```

**After:**

```ts
// hooks/useRoundUp.ts
export const useRoundUp = (amount: number) => {
  const [agreeToDonate, setAgreeToDonate] = useState(false);

  const { total, tip } = useMemo(
    () => ({
      total: agreeToDonate ? Math.floor(amount + 1) : amount,
      tip: parseFloat((Math.floor(amount + 1) - amount).toPrecision(10)),
    }),
    [amount, agreeToDonate],
  );

  const updateAgreeToDonate = () => setAgreeToDonate((v) => !v);

  return { total, tip, agreeToDonate, updateAgreeToDonate };
};
```

```tsx
// components/Payment.tsx
export const Payment = ({ amount }: { amount: number }) => {
  const { total, tip, agreeToDonate, updateAgreeToDonate } = useRoundUp(amount);

  return (
    <div>
      <input
        type="checkbox"
        onChange={updateAgreeToDonate}
        checked={agreeToDonate}
      />
      <button>${total}</button>
    </div>
  );
};
```

**Why it matters:** The component is now a pure function of what the hook returns.
It can be tested by testing the hook independently. The rendering logic and the
state logic never need to change together.

---

## 2. Domain Model (Extract Class)

**When to use:** Logic about an entity (validation, formatting, defaults, mapping)
is scattered across components, hooks, or inline arrow functions.

**Smell:**

```tsx
// Logic about PaymentMethod scattered in multiple places
defaultChecked={method.provider === 'cash'}           // in component
label: `Pay with ${method.name}`                      // in hook
extended.push({ provider: 'cash', label: 'Pay in cash' }) // in service
```

**After:**

```ts
// models/PaymentMethod.ts
export class PaymentMethod {
  constructor(private remote: RemotePaymentMethod) {}

  get provider(): string {
    return this.remote.name;
  }

  get label(): string {
    if (this.provider === "cash") return `Pay in ${this.provider}`;
    return `Pay with ${this.provider}`;
  }

  get isDefaultMethod(): boolean {
    return this.provider === "cash";
  }
}

export const payInCash = new PaymentMethod({ name: "cash" });
```

```tsx
// In the component — no logic, just reads properties
<input defaultChecked={method.isDefaultMethod} />
<span>{method.label}</span>
```

**Why it matters:** All knowledge about what a `PaymentMethod` IS lives in one place.
If the API changes its shape, you fix it in one class. If the label format changes,
same. The class has no React dependency — it can be unit tested with plain TS.

---

## 3. Strategy Pattern (Replace Conditional with Polymorphism)

**When to use:** You have `if/switch` on a variant (country, user role, plan type...)
that appears in multiple files. Adding a new variant means touching all those places
— this is the "Shotgun Surgery" smell.

**Smell:**

```ts
// Scattered in hook:
total: countryCode === "JP"
  ? Math.floor(amount / 100 + 1) * 100
  : Math.floor(amount + 1);

// Scattered in util:
const currencySign = countryCode === "JP" ? "¥" : "$";

// Scattered in component:
{
  countryCode === "JP" ? "¥" : "$";
}
{
  total;
}
```

**Solution — define a strategy interface:**

```ts
// models/PaymentStrategy.ts
export interface RoundUpStrategy {
  (amount: number): number;
}

export class CountryPayment {
  constructor(
    private readonly _currencySign: string,
    private readonly algorithm: RoundUpStrategy,
  ) {}

  get currencySign(): string {
    return this._currencySign;
  }

  getRoundUpAmount(amount: number): number {
    return this.algorithm(amount);
  }

  getTip(amount: number): number {
    return parseFloat((this.getRoundUpAmount(amount) - amount).toPrecision(10));
  }
}
```

**Define concrete strategies:**

```ts
// models/paymentStrategies.ts
export const australianPayment = new CountryPayment("$", (amount) =>
  Math.floor(amount + 1),
);

export const japanesePayment = new CountryPayment(
  "¥",
  (amount) => Math.floor(amount / 100 + 1) * 100,
);

export const danishPayment = new CountryPayment(
  "Kr.",
  (amount) => Math.floor(amount / 10 + 1) * 10,
);
```

**Inject strategy into hook and component:**

```ts
// hooks/useRoundUp.ts
export const useRoundUp = (amount: number, strategy: CountryPayment) => {
  const [agreeToDonate, setAgreeToDonate] = useState(false);

  const { total, tip } = useMemo(
    () => ({
      total: agreeToDonate ? strategy.getRoundUpAmount(amount) : amount,
      tip: strategy.getTip(amount),
    }),
    [agreeToDonate, amount, strategy],
  );

  const updateAgreeToDonate = () => setAgreeToDonate((v) => !v);

  return { total, tip, agreeToDonate, updateAgreeToDonate };
};
```

```tsx
// components/Payment.tsx
export const Payment = ({
  amount,
  strategy = australianPayment,
}: {
  amount: number;
  strategy?: CountryPayment;
}) => {
  const { total, tip, agreeToDonate, updateAgreeToDonate } = useRoundUp(amount, strategy);
  ...
};
```

**Why it matters:** Adding a new country is now a single new `CountryPayment` instance.
No existing files change. The branching is gone from hooks, components, and utils.

---

## 4. Anti-Corruption Layer (Service / Gateway)

**When to use:** Data fetching and remote-to-local data transformation is happening
inside hooks or components. You want to isolate the application from the shape of
external APIs.

**Smell:**

```ts
// Inside a hook — mixing React state management with fetch + data mapping
useEffect(() => {
  fetch("https://api.example.com/payment-methods")
    .then((res) => res.json())
    .then((data: RemotePaymentMethod[]) => {
      const mapped = data.map((m) => ({
        provider: m.name,
        label: `Pay with ${m.name}`,
      }));
      mapped.push({ provider: "cash", label: "Pay in cash" });
      setPaymentMethods(mapped);
    });
}, []);
```

**After — extract a service function:**

```ts
// services/paymentService.ts
const convertPaymentMethods = (
  methods: RemotePaymentMethod[],
): PaymentMethod[] => {
  if (methods.length === 0) return [];
  const converted = methods.map((m) => new PaymentMethod(m));
  converted.push(payInCash);
  return converted;
};

export const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const response = await fetch("https://api.example.com/payment-methods");
  const methods: RemotePaymentMethod[] = await response.json();
  return convertPaymentMethods(methods);
};
```

```ts
// hooks/usePaymentMethods.ts — now clean and focused on state only
export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    fetchPaymentMethods().then(setPaymentMethods);
  }, []);

  return { paymentMethods };
};
```

**Why it matters:**

- The API URL and response shape are contained in one file
- If the API changes its shape, you update `paymentService.ts` only
- The service function is a plain async function — testable without React
- The hook stays focused on React state management only
- The conversion logic is reusable outside React

---

## Summary: Which Pattern for Which Smell?

| Symptom                                            | Pattern                         |
| -------------------------------------------------- | ------------------------------- |
| State + logic inside a component                   | Extract Hook                    |
| Business rules / formatting scattered across files | Domain Model (Extract Class)    |
| `if/switch` on a variant in multiple places        | Strategy Pattern                |
| `fetch` + data mapping inside a hook or component  | Anti-Corruption Layer (Service) |
