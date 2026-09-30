# Jobwork — frontend

React UI for the Jobwork quotation tool: brands, customers, and the ChatGPT-style Get Quote workspace.

Stack: Vite, React 18, TypeScript, Redux Toolkit, Tailwind CSS.

## Setup

```bash
npm install
npm run dev     # http://localhost:5175 — proxies /api to the backend on :4000
```

The backend must be running (see the `jobwork-BE` repository). The dev proxy target is set in `vite.config.ts`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` |

## Layout

- `src/pages/*` — one folder per screen (jobwork = Get Quote chat, companies = brands, customers, users, roles, settings).
- `src/components/ui/*` — shared pieces (BrandFiles, BrandPrompts, Thinking, tables, badges).
- `src/api/*` — typed API calls (axios, `/api` base, bearer token from localStorage).
- `src/store/*` — Redux slices (app settings, AI status, background training jobs).
- `src/lib/*` — helpers (formatting, theme, thinking-indicator phrase pools).
