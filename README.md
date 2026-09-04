# 1 Billion

Personal Founder OS. Web app + iPhone home-screen PWA.

> The app is not the mission. The app exists to make me execute the mission.

See `PLAN.md` for the full build plan and `CLAUDE.md` for working rules.

## Stack
Next.js 16 (App Router, TypeScript, Tailwind v4) · Supabase (Postgres, Auth, RLS) · Vercel · web-push · Google Calendar API.

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev                  # http://localhost:3000
```

## Checks
```bash
npm run typecheck
npm run lint
npm run build
```

## Deploy
Push to `main`. Vercel builds and deploys automatically. Env vars are set in the Vercel project (same names as `.env.example`).

## Install on iPhone
Open the Vercel URL in Safari → Share → Add to Home Screen. Launch from the icon (required for push notifications later).
