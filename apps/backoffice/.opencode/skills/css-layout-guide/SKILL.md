---
name: css-layout-guide
description: >
  Expert guidance on when and how to use CSS Grid vs Flexbox vs Hybrid layouts in HTML.
  Use this skill whenever the user asks about layout decisions, requests a UI component,
  builds a full page, designs a dashboard, asks which CSS approach to use, or requests
  HTML/CSS/Tailwind code involving any kind of spatial arrangement of elements.
  Trigger even for vague layout requests like "how do I center this", "make a card grid",
  "sticky footer", "navbar", "sidebar layout", or "responsive columns" — these are all
  layout problems that benefit from this skill. When in doubt, use it.
---

# CSS Layout Guide

This skill governs how Claude reasons about and implements HTML layouts using CSS Grid,
Flexbox, or a combination of both.

---

## Step 1 — Detect Output Mode

Infer from the user's prompt whether they want **advice** or **code**. Don't ask unless
truly ambiguous.

| Signal                                                         | Output Mode                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| "which should I use", "when do I use", "what's the difference" | Advice only                                                   |
| "make a layout", "build a navbar", "create a card grid"        | Code + brief rationale                                        |
| "why is my layout broken", "how do I fix this"                 | Advice first, then code if needed                             |
| Ambiguous                                                      | Default to **code + a short comment explaining the approach** |

When producing code, always default to **Tailwind CSS v4** unless the user specifies
vanilla CSS or another framework.

---

## Step 2 — Choose the Layout Strategy

Use contextual reasoning — not rigid rules. The goal is to pick the approach that gives
the cleanest, most maintainable result for this specific situation.

### Use Grid when:

- The layout is **structural**: page shell, dashboard, multi-column content areas
- You need **two-dimensional control** (rows AND columns simultaneously)
- Children should align consistently regardless of their content size
- You want named areas (`grid-template-areas`) for visual clarity
- You need to stack elements without `position: absolute`
- The layout is strictly vertical and you want minimal code

### Use Flexbox when:

- The layout is **content-driven**: tags, buttons, nav items, chips
- Items should **wrap naturally** like text (varying widths)
- You need to **isolate or push** specific items using `margin-auto`
- The layout needs to switch axis easily (row ↔ column via media queries)
- You need to expand clickable areas via `flex-grow`

### Use a Hybrid when:

- Grid governs the **page or section structure**; Flexbox handles **internal component alignment**
- This is the most common real-world pattern — default to it for anything beyond trivial layouts

> **Hybrid example**: Grid defines header/sidebar/main/footer. Inside a card, Flexbox
> arranges the icon, title, and action button.

---

## Step 3 — Tailwind v4 Implementation Patterns

Reference these concrete patterns when generating code. Each maps a common layout
problem to its cleanest Tailwind v4 solution.

### 3.1 Equal-Width Multi-Column Cards

**Problem**: Cards in a row must have equal width regardless of content length.

**Grid (preferred)**:

```html
<div class="grid grid-cols-3 gap-6">
  <div class="...">Card 1</div>
  <div class="...">Card 2</div>
  <div class="...">Card 3</div>
</div>
```

> Parent defines the columns. Children need no sizing rules.

**Flexbox (if content-driven sizing is needed)**:

```html
<div class="flex gap-6">
  <div class="flex-1">Card 1</div>
  <div class="flex-1">Card 2</div>
  <div class="flex-1">Card 3</div>
</div>
```

> Each child must explicitly opt into equal sizing via `flex-1`.

---

### 3.2 Sticky Footer (Viewport-Height Layout)

**Problem**: Footer floats mid-page when content is short.

**Grid (preferred — minimal code)**:

```html
<body class="grid grid-rows-[auto_1fr_auto] min-h-screen">
  <header>...</header>
  <main>...</main>
  <!-- grows to fill remaining space -->
  <footer>...</footer>
</body>
```

---

### 3.3 Aligned Button at Card Bottom

**Problem**: Cards with varying text lengths have misaligned action buttons.

**Auto-margin (most efficient)**:

```html
<div class="flex flex-col h-full">
  <h3>Title</h3>
  <p class="grow">Variable length text...</p>
  <button>Action</button>
</div>
```

> `grow` on the paragraph absorbs leftover space, pushing the button down.

**Alternative — Grid**:

```html
<div class="grid grid-rows-[auto_1fr_auto] h-full">
  <h3>Title</h3>
  <p>Variable length text...</p>
  <button>Action</button>
</div>
```

---

### 3.4 Full Page Layout with Named Areas

**Problem**: Complex page shell with header, sidebar, main content, footer.

```html
<div
  class="grid min-h-screen grid-rows-[auto_1fr_auto]
            grid-cols-[240px_1fr]
            [grid-template-areas:'header_header'_'sidebar_main'_'footer_footer']"
>
  <header class="[grid-area:header]">...</header>
  <aside class="[grid-area:sidebar]">...</aside>
  <main class="[grid-area:main]">...</main>
  <footer class="[grid-area:footer]">...</footer>
</div>
```

> Named areas make the CSS mirror the visual layout. Rearranging is done in one place.

---

### 3.5 Responsive Columns Without Media Queries

**Problem**: Column count should adapt to viewport without explicit breakpoints.

```html
<div
  class="grid gap-6"
  style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))"
>
  ...
</div>
```

> Browser fits as many 300px columns as possible; extras wrap automatically.
> Use inline style when Tailwind's grid utilities don't cover the `minmax` pattern cleanly.

---

### 3.6 Content-Driven Tag / Chip Cloud

**Problem**: Tags should be only as wide as their text and wrap naturally.

**Flexbox (preferred — Grid would force uniform column widths)**:

```html
<div class="flex flex-wrap gap-2">
  <span class="px-3 py-1 rounded-full bg-blue-100">Tag One</span>
  <span class="px-3 py-1 rounded-full bg-blue-100">Longer Tag</span>
  <span class="px-3 py-1 rounded-full bg-blue-100">X</span>
</div>
```

---

### 3.7 Navbar with Isolated Items

**Problem**: Push nav links to the right while keeping the logo on the left.

```html
<nav class="flex items-center gap-6 px-8 py-4">
  <a href="/" class="mr-auto font-bold">Logo</a>
  <!-- pushes everything else right -->
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <button>Sign in</button>
</nav>
```

> `mr-auto` on the logo absorbs all leftover horizontal space.

---

### 3.8 Text Overlay on Image (No Absolute Positioning)

**Problem**: Overlay text centered on an image without `position: absolute`.

```html
<div class="grid place-items-center">
  <img src="..." class="[grid-area:1/1] w-full" />
  <h2 class="[grid-area:1/1] z-10 text-white text-2xl font-bold">
    Overlay Text
  </h2>
</div>
```

> Both children occupy the same grid cell. Grid alignment properties handle centering.

---

## Step 4 — Vanilla CSS Fallback

If the user requests vanilla CSS (or Tailwind isn't appropriate), translate the same
patterns using standard properties:

| Tailwind class     | Vanilla CSS equivalent                                 |
| ------------------ | ------------------------------------------------------ |
| `grid grid-cols-3` | `display: grid; grid-template-columns: repeat(3, 1fr)` |
| `flex flex-wrap`   | `display: flex; flex-wrap: wrap`                       |
| `flex-1`           | `flex: 1`                                              |
| `grow`             | `flex-grow: 1`                                         |
| `mr-auto`          | `margin-right: auto`                                   |
| `gap-6`            | `gap: 1.5rem`                                          |
| `min-h-screen`     | `min-height: 100vh`                                    |

---

## Guiding Principles

- **Grid is the structural default.** When in doubt about a multi-element layout, reach for Grid first.
- **Flexbox is for flow.** When content should dictate size and wrapping, Flexbox wins.
- **Hybrids are normal, not a last resort.** Most real UIs use both.
- **Prefer parent-level control.** A solution that only touches the parent container is more maintainable than one that styles every child.
- **Explain your choice briefly.** When producing code, a one-line comment on _why_ Grid or Flexbox was chosen helps the user learn and course-correct if needed.
