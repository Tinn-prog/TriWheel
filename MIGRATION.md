# TriWheel Next.js and Laravel Migration

The original PHP/MySQL app has been moved into `legacy-php/` as a migration
reference. The new split-stack apps now live at the repository root:

- `frontend/`: Next.js App Router UI.
- `backend/`: Laravel API and database layer.
- `legacy-php/`: previous PHP pages, styles, and public image assets.
- `uploads/`: existing uploaded files to migrate into Laravel storage.

## Local Development

Start Laravel:

```bash
cd backend
php artisan serve
```

Start Next.js:

```bash
cd frontend
npm run dev
```

Default URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api`
- Health check: `http://localhost:8000/api/health`

## Environment

The old PHP app connected to MySQL database `triwheel_db` with user `root` and
no password. The Laravel `.env.example` has been aligned to that database name.
Update `backend/.env` before running real MySQL migrations.

## Migration Order

1. Authentication: move `login.php`, `signup.php`, password reset, sessions, and
   role checks into Laravel auth endpoints.
2. Passenger workflow: move ride request, status polling, cancellation, history,
   and feedback from `passenger.php`.
3. Driver workflow: move queue, status changes, ride acceptance, completion, and
   driver feedback from `driver.php`.
4. Admin workflow: move dashboards, user management, driver/passenger
   verification, and audit logs.
5. Uploads: move `uploads/driver_docs` into Laravel storage and serve documents
   through authorized routes.
6. UI: rebuild PHP pages as Next.js routes and components, using the Laravel API.

## Current Baseline

- Legacy PHP files are isolated in `legacy-php/` so the root can focus on the
  new frontend and backend.
- Laravel API routing is enabled in `backend/routes/api.php`.
- Domain migrations exist for users, drivers, vehicles, rides, and audit logs.
- Eloquent models exist for the core TriWheel entities.
- Next.js uses a shared API URL helper (`frontend/src/lib/api.ts`) and role-based app routes.
