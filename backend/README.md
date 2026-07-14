# TriWheel Backend

Laravel API for TriWheel (auth, rides, drivers, passengers, admin).

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

API routes live in `routes/api.php`. Keep the scheduler running in production so deleted-account purge jobs run:

```bash
php artisan schedule:work
```
