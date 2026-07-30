# StageHome — Next.js/React → Laravel/PHP Frontend Migration

## Critical, honest disclosure

**This code has never been booted, run, or tested.** My sandbox's network
cannot reach `repo.packagist.org` (confirmed: `composer create-project`
fails with an HTTP 403 from Packagist itself), meaning I could not
install the actual Laravel framework, run `composer install`, boot a
dev server, or execute a single PHPUnit test — unlike every other piece
of this project this session, which was genuinely run and tested.

**What I could verify**: every one of the 22 PHP files here passes
`php -l` (real syntax linting, via a genuinely installed PHP 8.3 CLI) —
zero syntax errors. That confirms these files are syntactically valid
PHP and structurally follow Laravel 11's real conventions (the
`Application::configure()` bootstrap style, PSR-4 autoloading,
`Illuminate\Support\Facades\*` usage, Blade template syntax). It does
**not** confirm the application actually boots, that routes resolve
correctly end-to-end, or that the Blade templates render without error
against real framework classes.

## Architecture

- **Backend**: `apps/api-py` (FastAPI/SQLAlchemy/PostgreSQL) — unchanged,
  remains the single source of truth for all data and business logic.
- **Frontend**: `apps/web-laravel` (Laravel 11/PHP 8.3) — a thin
  presentation layer. Every page fetches data from the FastAPI backend
  via `App\Services\StageHomeApiClient` (Guzzle/Laravel's `Http` facade)
  and renders it with Blade templates. No database connection of its own,
  no Eloquent models — deliberately, since duplicating the data layer in
  two frameworks would be a real design mistake, not a feature.

## What's covered (structurally, unverified)

Home, Counties (list/detail), Universities (list/detail), Search,
Property detail, Blog (list/detail), Register, Login, Logout, Tenant
dashboard.

## What's NOT covered

Manager/Admin dashboards, property CRUD forms, the full booking flow UI
(quote → hold → confirm), payment initiation UI, agreement signing UI,
reviews submission, support tickets, favourites toggle wiring (the button
markup exists in `properties/show.blade.php` but isn't wired to a real
route/controller action yet), and password reset. Also not done: any of
Laravel's own default scaffolding files that `composer create-project`
normally generates automatically (most `config/*.php` files beyond
`services.php`, the default middleware stack, `phpunit.xml`, etc.) —
only what was hand-written for this specific task exists.

## To actually get this running

1. On a machine with real internet access: `composer create-project
   laravel/laravel:^11.0 stagehome-laravel-fresh`, then copy this
   directory's `app/`, `routes/web.php`, and `resources/views/` over the
   fresh skeleton (keeping the fresh skeleton's own `config/`,
   `bootstrap/`, and other framework files, merging in `services.php`'s
   one addition).
2. `composer install`
3. Set `STAGEHOME_API_BASE_URL` in `.env` to the live FastAPI backend.
4. `php artisan key:generate`
5. `php artisan serve`
6. Only then can this actually be tested against the real backend.

## Why I'm disclosing this so explicitly

Every other piece of this project — the FastAPI backend, its 39 tests,
the SQLAlchemy models — was built and genuinely verified running real
code in this sandbox. This is different, and pretending otherwise would
be dishonest. The Packagist block is a real, external, unavoidable
constraint of this specific development environment, not a corner cut.
