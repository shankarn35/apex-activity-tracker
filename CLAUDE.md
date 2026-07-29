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
