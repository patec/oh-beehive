<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
## Server Actions rules

- Files with `'use server'` at the top level must export **only async functions**. This is enforced by the bundler, not TypeScript, so `tsc --noEmit` will not catch violations.
- Never put pure/sync helpers in a `'use server'` file. Extract them to a plain module in `src/lib/` (no directive) and import from there.
- Client components that call server actions (e.g. via `form action={...}`) must import those actions from a `'use server'` file. If the same file also needs to export a sync utility, move the utility out first.

<!-- END:nextjs-agent-rules -->
