# TriWheel Frontend

Next.js app for passengers, drivers, admin operators, and super admins.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to your Laravel API base URL (for local proxy, `/triwheel-api` works in development).

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint
