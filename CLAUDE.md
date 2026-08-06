# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint over the project

There is no test suite configured yet.

## Environment

The app requires a `.env` file (gitignored) with:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are consumed in `src/supabaseClient.js` via `import.meta.env`. Do not read or edit `.env` — it holds live Supabase credentials.

## Architecture

This is an early-stage React 19 + Vite app with Supabase as the backend (auth + database). Current state is auth-only with a placeholder dashboard; the product is planned to grow Tasks, Calendar, Bills, and Hobbies modules (see the placeholder note in `src/Dashboard.jsx`).

- **Session flow**: `src/App.jsx` is the root component. It subscribes to `supabase.auth.getSession()` / `onAuthStateChange` and holds the session in state, rendering `Auth` when there's no session and `Dashboard` when there is. This session-gating pattern is the app's core routing mechanism today — there is no router wired up yet despite `react-router-dom` being a dependency.
- **Supabase client**: `src/supabaseClient.js` creates a single shared client from env vars. Import `{ supabase }` from here rather than instantiating new clients.
- **Auth**: `src/Auth.jsx` is a single component handling both sign-in and sign-up (toggled via local state) against `supabase.auth.signInWithPassword` / `supabase.auth.signUp`.
- **Dashboard**: `src/Dashboard.jsx` currently just confirms the logged-in session and exposes sign-out; this is the extension point for upcoming feature modules.

`zustand`, `recharts`, `date-fns`, and `lucide-react` are already dependencies but not yet used in code — they're there for the planned modules (state management, charts, date handling, icons respectively).

## Schema

- **`categories` table**: `id`, `user_id`, `name`, `is_preset` (legacy — the original design lazily seeded 3 preset categories per user; presets were removed entirely in a later migration, so this column is now unused and always `false` for every row, but wasn't dropped), `color` (hex string, auto-assigned from a fixed 10-color palette, cycling as categories are added; user can recolor afterward), `created_at`.
- **`tasks.category_id`**: nullable FK to `categories.id`, `on delete set null` — deleting a category clears it from any tasks using it rather than blocking the delete.
- **Cap of 10 categories per user**, enforced two ways together: an app-level check before showing "add custom category" in the UI, *and* a DB trigger (`enforce_category_cap`) as defense-in-depth. See "Cross-row integrity rules" below for when this dual approach applies vs. app-level-only.

## Migration review conventions

- Every migration gets checked for `DROP`/`DELETE`/`TRUNCATE` before running, as already established.
- Beyond that: **if a migration modifies or deletes existing data — not just schema — flag it explicitly and distinctly**, e.g. "this migration modifies existing data," so it doesn't get mistaken for a routine additive change (which is the norm for this project's migrations so far). A migration that only adds tables/columns/constraints doesn't need this flag; one with a `DELETE`, `UPDATE`, or data backfill does.

## Cross-row integrity rules

When adding a constraint that protects a shared/reusable resource across multiple rows (e.g. a count cap on how many categories a user can have in total), **prefer app-level check + DB trigger together**, not app-level alone — the app check alone can't stop a second tab, a retried request, or a future code path from bypassing it, and the resource is shared/reused elsewhere so a bad row is harder to clean up after the fact.

This is distinct from **per-row format details** (e.g. the `custom_dates` recurrence type's 20-date cap on a single row's own jsonb array) — those can stay app-level only, since they don't involve counting across rows or protecting a resource other rows depend on.

## Commit conventions
- After each individually-tested feature, propose a commit to the user — never batch multiple untested features into one commit, and never commit until the user approves.
- Prefix commit messages by type: feat:, fix:, refactor:, chore:, docs:
- Show `git diff` for review before committing.

## End-of-session checklist
Before ending a session, confirm with the user:
1. All changes committed and pushed to origin/main
2. Any schema/behavior changes summarized for the user to log in project memory
3. Time spent this session, for the user to log

## Long-running or interrupted commands
- If a git (or other shell) command seems to be taking unusually long, don't just keep waiting silently — flag it explicitly to the user (e.g. "this is taking longer than expected, want me to check status, or have you already run it manually?").
- If the user interrupts a running tool call, don't assume they've called off the task — they may be troubleshooting or completing it outside the session. Check in on what actually happened (e.g. `git status`, `git log origin/main -1`) before deciding what to do next, rather than treating the interruption as a rejection.

### git push investigation (2026-08-03 update)
The two earlier apparent `git push` "hangs" in this session were traced to a missed "Allow once" permission prompt in the terminal — not a network, credential, or proxy issue as originally suspected. When the prompt is answered promptly, `git push` completes normally within seconds.

Keep the 30-second cap on any push attempt, and if it's approaching that cap, explicitly check whether a permission prompt is sitting unanswered before assuming it's a genuine stall.

### git push convention (2026-08-06 update)
The underlying issue above is considered resolved. Claude may run `git push` again (no longer restricted to the user pushing manually) — but must ask for the user's confirmation before each push rather than pushing automatically once a commit is ready. Once confirmed, push with the 30-second cap as described above.

### Blocked commands

`rm -rf` is blocked by this project's Claude Code permission settings regardless of target — even for confirmed-harmless scratch files well outside the repo. This is expected behavior, not a bug to work around (e.g. by chaining it differently or trying alternate flags). If cleanup of such files is needed, ask the user to run it themselves. On Windows plain PowerShell (not Git Bash/WSL, which is what Claude Code's Bash tool uses here), the user-facing equivalent is `Remove-Item -Recurse -Force <path>`.
