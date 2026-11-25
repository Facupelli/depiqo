---
name: delete-comment
description: Audit and delete in-scope TypeScript comments in Depiqo, preserve architectural decisions and required directives, report workarounds, and tighten the comment lint baseline.
---

# Delete comments

1. Run `pnpm lint:comments:baseline inventory` from the repository root. Use the requested paths, or review the full inventoried scope if none are given. Read each comment with the surrounding code, relevant tests, and existing documentation. Do not edit generated or vendored files.
2. Classify each comment:
   - **Tautology**: repeats names, control flow, or behavior visible in the code. Delete it.
   - **Stale**: contradicts current behavior, describes a superseded implementation, or comments out dead code. Verify and delete it.
   - **Excuse**: justifies a workaround or leaves unfinished work which should have an owner. Delete explanatory prose and report a concrete follow-up with a path, impact, and verification criteria. Group repetitions by underlying problem. Do not create external issues unless asked.
   - **Decision Record**: preserves a non-obvious, costly-to-reverse choice with a real trade-off. Use the owning workspace's ADR conventions. Update an existing ADR where possible, or create one in the owning architecture docs. Use `docs/adr/` for decisions spanning workspaces. Delete the inline comment only after preserving the reasoning.
3. Preserve functional directives, licenses, and safety comments required by an existing rule until the underlying code or configuration can remove the need for them. Defer any other comments whose intent you cannot establish or whose removal would lose useful context. Do not treat a successful compilation alone as proof that deleting a directive is safe.
4. Verify the diff preserves behavior. In TSX, remove the surrounding braces only for a comment-only expression and check that the resulting whitespace does not change rendered text. Validate the affected workspaces and run `node --test scripts/comment-lint.test.mjs`.
5. Shrink `.comment-baseline.json` with `pnpm lint:comments:baseline prune`. Review its diff: there must be no new fingerprints or extra copies. Run `pnpm lint:comments`; use `pnpm lint:comments:baseline check <target-ref>` to check for baseline growth against the target branch.
6. Report counts removed and remaining, physical lines shed, ADR paths, and follow-up issues. Distinguish functional exceptions and deferred work from cleaned comments. Report any validation gaps.
