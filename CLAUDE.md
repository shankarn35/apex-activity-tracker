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

Going forward: keep the 30-second cap on any push attempt, and if it's approaching that cap, explicitly check whether a permission prompt is sitting unanswered before assuming it's a genuine stall. Keep the standing convention (user pushes manually, Claude reports when a commit is ready) in place for a few more sessions to confirm this is fully resolved before revisiting letting Claude push directly again.
