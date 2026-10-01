<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Antigravity Git Automation Rules

- When implementing a feature, fix, or user task:
  1. Inspect `git status` after making code changes.
  2. Stage the modified and new relevant files (`git add <files>`). Never stage secrets or `.env` files.
  3. Create a concise conventional commit message (`feat: ...`, `fix: ...`, `refactor: ...`).
  4. Automatically push the commit to GitHub: `git push origin HEAD`.
  5. Provide the commit hash and confirmed status in your response.
