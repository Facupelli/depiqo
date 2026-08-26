# Backoffice UI Design Rules

These rules define the intended visual language and interaction quality for the DEPIQO backoffice.

## Visual Language

Use a restrained, premium SaaS visual language.

Use Tailwind `neutral` as the default palette for application chrome, surfaces, borders, backgrounds, and secondary text.

Use the application's primary blue treatment for primary actions, active states, selected states, links, and important interactive highlights. Prefer the existing semantic theme token when available.

Reserve additional colors for information with semantic meaning, such as statuses, warnings, errors, success states, and data visualization.

Favor subtle borders, low-contrast surfaces, and restrained shadows.

Use the existing icon library for interface icons, with consistent sizing and visual weight.

## Information Hierarchy

Design each view around its primary user goal.

Prioritize the information and actions needed to complete that goal. Secondary information should have lower visual weight.

Use typography, spacing, alignment, and separators to establish hierarchy before introducing additional containers.

Use cards when the boundary has clear semantic or interaction value.

Keep repetitive rows and cards compact. Give primary values and outcomes stronger visual emphasis than secondary metadata.

Surface the most important and frequent actions directly. Group lower-priority actions when that improves clarity.

## Components and Layout

Use existing shared backoffice components and shadcn primitives whenever they fit the requirement.

Before creating new UI infrastructure, inspect the repository for existing shared components and shadcn primitives that fit the requirement. Reuse those implementation building blocks when appropriate.

Use `ui-design.md` and the task-specific requirements as the design authority.

Keep component geometry consistent through the existing design system: control heights, spacing, radii, typography, and interaction states should feel part of the same product.

Choose the UI surface according to the amount and complexity of the task. Small focused forms generally belong in compact dialogs. Larger workflows may use dedicated pages or broader surfaces when the content requires them.

## Terminology and Actions

Use consistent terminology for the same domain concept and the same semantic action.

Choose action labels according to what the operation actually does. Distinct operations may use distinct verbs when their meaning differs.

Prefer concise, specific labels that tell the user what will happen.

## Loading, Empty, Error, and Completion States

Give asynchronous actions immediate visual feedback.

Use skeletons when loading structured page content where preserving the expected layout improves perceived speed.

Use standard loading indicators for short or localized operations.

Empty states should explain the relevant condition and, when appropriate, provide the most useful next action.

Errors should be actionable when the system can explain what the user needs to change or do next.

Successful operations should provide clear completion feedback proportional to the importance of the action.

## Destructive Actions

Match confirmation friction to the consequence and reversibility of the action.

Use clear confirmation for destructive operations and explain meaningful consequences before completion.

Use stronger confirmation for highly destructive, irreversible, or financially significant actions.

Offer undo only when the underlying operation can be safely and correctly reversed.

## Density and Restraint

Keep application chrome visually quiet so content and actions remain the focus.

Avoid unnecessary duplication of metrics, metadata, actions, or decorative elements.

Prefer fewer, stronger visual decisions over many competing ones.

A page should feel complete because its hierarchy is clear, not because every area is filled.
