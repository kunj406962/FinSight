# FinSight

FinSight is a full-stack personal finance web application. It ingests bank CSV exports, categorizes transactions with a trained ML model, detects spending anomalies, forecasts future spending with Prophet, and narrates weekly insights using Gemini AI — all surfaced through a React dashboard.

Built as a portfolio project demonstrating full-stack development, applied ML, and DevOps practices end to end.

---

## Table of Contents

- [What It Does](#what-it-does)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Known Limitations & Future Work](#known-limitations--future-work)

---

## What It Does

- **Uploads bank statements (CSV)** and automatically detects which bank format they came from
- **Categorizes every transaction** using a trained ML model (TF-IDF + Logistic Regression), with per-user manual correction that the model can be retrained on later
- **Detects anomalies** in spending using an Isolation Forest model
- **Forecasts future spending** per category using Facebook Prophet, with confidence bounds
- **Narrates a weekly summary** of spending, pace vs. expectations, and savings using Gemini AI
- **Tracks account balances** with a full reconciliation history (not just a single editable number)
- **Lets you search and filter transactions** globally across all accounts, with real server-side pagination
- **Surfaces everything on one Dashboard** — current vs. forecasted spend per category, income/savings outlook, and drill-down overlays for both individual category forecasts and all-time flagged anomalies

## How It Works

1. **Create an account** (chequing, savings, credit card, or other) with a starting balance.
2. **Upload a CSV export** from your bank. FinSight detects the bank format, parses transactions, and predicts a category for each one via the ML categorizer. This is a **preview step** — nothing is written to the database yet.
3. **Confirm the upload.** Transactions are inserted, any manual category corrections are saved to a per-user override table (checked before ML on all future uploads), and anomaly scoring is queued as a background task so the upload itself stays fast.
4. **Reconcile your balance** whenever your bank's actual balance drifts from FinSight's calculated one. Reconciliations are kept as a full history and the current balance always calculates forward from the most recent one — never additively, to avoid double-counting corrections.
5. **Browse and search transactions** — either scoped to one account, or globally across all accounts with account/category/date/search filters and real pagination.
6. **Check the Dashboard.** It loads your weekly cached insights (Gemini's narration of your spending pace, savings, and anomalies) plus a forecast for every supported category, all fetched up front so the whole picture loads together.
   - **Click any spending category card** to open a detail overlay: the full Prophet forecast curve (with confidence bounds) for that category, plus the actual transactions posted so far this month in that category.
   - **Click the anomaly count** to open an overlay listing every transaction ever flagged as anomalous, paginated.
7. **Income and Savings** get their own cards on the Dashboard showing this month's actual total against forecast — these categories are tracked for forecasting but intentionally excluded from the "spend" insights (they aren't spending behavior).

Categories `Health`, `Transfer`, and `Education` are permanently excluded from forecasting (not "insufficient data" — a deliberate design decision), and `Transfer`/`Savings` are detected heuristically rather than by the ML model since they aren't spending behavior either. Balance calculations are the one place transfers *are* included, since they still move real money.

## Tech Stack

**Backend**
- FastAPI
- Supabase (Postgres + Auth, JWT-based)
- scikit-learn — TF-IDF + Logistic Regression (categorization), Isolation Forest (anomaly detection)
- Prophet — per-category spending forecasts
- Gemini API (`google-genai` SDK) — weekly narrated insights, with `tenacity` retry on transient failures
- Pydantic, pytest
- `smtplib` — Gmail SMTP relay for auth emails (bypasses Supabase's default 2/hr sender limit)
- `standardwebhooks` — signature verification for the auth email hook

**Frontend**
- React + Vite (`react-ts` template)
- TypeScript, strict mode, no `any`
- Tailwind CSS v3
- `react-router-dom` v6
- Recharts — forecast charts on the Dashboard
- Axios (custom client), `@supabase/supabase-js` (password reset flow only)
- Vitest + React Testing Library

**DevOps**
- Docker + docker-compose (backend + frontend)
- GitHub Actions — single `ci.yml` running backend and frontend test jobs
- Render — backend hosting + auth email hook target
- Vercel — frontend hosting
- Docker Hub — backend image registry

## Architecture

```
┌─────────────┐        ┌──────────────┐        ┌─────────────────┐
│   React     │──HTTP──▶   FastAPI    │──────▶ │    Supabase      │
│  (Vercel)   │        │   (Render)   │        │ (Postgres + Auth)│
└─────────────┘        └──────┬───────┘        └─────────────────┘
                               │
                 ┌─────────────┼─────────────┐
                 ▼             ▼             ▼
          ┌───────────┐ ┌────────────┐ ┌───────────┐
          │ scikit-   │ │  Prophet   │ │  Gemini   │
          │ learn ML  │ │ Forecaster │ │  Insights │
          └───────────┘ └────────────┘ └───────────┘
```

CSV upload → ML categorization → confirmed insert → background anomaly scoring. Forecast and insights responses are cached server-side (per category/month, and per week respectively) so repeat Dashboard loads are fast.

## Project Structure

```
backend/app/
├── routers/          auth.py, accounts.py, upload.py, transactions.py, forecast.py, insights.py, email_hook.py
├── ml/               anomaly.py, categorizer.py, transfer_detector.py, forecaster.py, models/*.pkl
├── services/         db.py, gemini.py, email_sender.py, parsers/
└── schemas/          transactions.py (all Pydantic models)

frontend/src/
├── api/              client.ts, authToken.ts, supabaseClient.ts
├── context/          auth-context-value.ts, AuthContext.tsx, useAuth.ts
├── hooks/            useTransactionsQuery.ts
├── components/
│   ├── ui/           Button, Input, Alert, ConfirmationDialog, Modal
│   ├── auth/         AuthLayout, PasswordStrengthMeter
│   ├── accounts/     AccountForm, AccountMetrics, AccountRow, EmptyAccountsState
│   ├── transactions/ TransactionFilterBar, TransactionRow, PaginationControls
│   ├── dashboard/    SummaryPanel, CategoryCard, NonSpendCard, NarrationText,
│   │                 CategoryForecastOverlay, AnomalyOverlay
│   └── layout/       AppLayout, ProtectedRoute
├── pages/            Login, Signup, ForgotPassword, ResetPassword, ResendConfirmation,
│                     Accounts, AccountDetail, Transactions, Dashboard
├── types/models.ts
└── utils/            FormatCurrency.ts, dateRange.ts
```

## Database Schema

| Table | Purpose |
|---|---|
| `accounts` | User financial accounts — name, type, starting balance. Current balance is computed at read time, not stored. |
| `account_reconciliations` | Full history of balance reconciliations per account (not a single overwritable number). |
| `upload_batches` | One row per CSV upload — filename, detected bank, net-new transaction count. Deletable. |
| `transactions` | Every transaction — date, description, amount, category, anomaly flag/score (nullable — null until scored, permanently null for Transfer/Savings). |
| `category_overrides` | Per-user corrections to ML category predictions, checked before heuristics and before the ML model on every future classification. |
| `forecast_cache` | Caches `/forecast` responses for the remainder of the calendar month, per `(user, category, month)`. |
| `insights_cache` | Caches `/insights` responses for the remainder of the calendar week, per `(user, week_start)`. |

Row-level security is intentionally disabled on all custom tables — security is enforced entirely at the FastAPI layer via `get_current_user` and explicit `user_id` scoping on every query.

**Category enum (13 values):** `Food, Groceries, Transport, Utilities, Entertainment, Health, Shopping, Income, Transfer, Savings, Rent/Mortgage, Education, Other`.

## API Reference

| Endpoint | Purpose |
|---|---|
| `POST /auth/signup`, `/auth/login`, `/auth/logout` | Auth |
| `POST /auth/resend-confirmation` | Resend signup confirmation email |
| `POST /auth/email-hook` | Server-to-server auth email delivery (Gmail SMTP), webhook-signature verified |
| `POST /accounts`, `GET /accounts`, `DELETE /accounts/{id}` | Account CRUD |
| `POST /accounts/{id}/reconciliations`, `GET /accounts/{id}/reconciliations` | Balance reconciliation |
| `GET /accounts/{id}/upload-batches`, `DELETE /accounts/{id}/upload-batches/{batch_id}` | Upload history & deletion |
| `POST /upload/preview`, `POST /upload/confirm` | CSV upload preview and confirmed import |
| `GET /transactions` | List transactions — filterable by account, date range, category, anomaly flag, and description search; real server-side pagination via `count="exact"` |
| `GET /forecast?category=` | Prophet forecast for one category, with confidence bounds. `400` for `Health`/`Transfer`/`Education` (permanently unsupported, not "insufficient data") |
| `GET /insights` | Weekly-cached summary — deterministic pacing math plus a Gemini-narrated summary, with anomaly count and per-category forecast-vs-actual pacing |

## Getting Started

> Adjust exact env var names/paths to match your actual `.env` setup — these reflect the integrations in use, not a verified `.env.example`.

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
# set SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY, and Gmail SMTP credentials in .env
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Docker (both services)**
```bash
docker-compose up
```

## Testing

**Backend:** `pytest` — covers health check, CSV parsing, transfer detection, categorization, upload flow, anomaly scoring, transaction filtering/search/pagination, forecast, and insights.

**Frontend:**
```bash
npm run lint     # ESLint
npm run build    # tsc -b, catches type errors dev mode won't
npm test         # Vitest + React Testing Library
```

All frontend page-level features (auth flows, Accounts, AccountDetail, Transactions, Dashboard) have test coverage at the page level rather than isolated unit tests per component — matching the project's established testing convention.

## Known Limitations & Future Work

- **`Select.tsx` UI primitive** — never built. Four raw `<select>` call sites still exist across the app (account type, upload-preview category picker, transaction category filter, transaction account filter).
- **`test_accounts.py` does not exist** — the largest backend test-debt item; `accounts.py`'s balance/reconciliation/upload-batch logic has no dedicated pytest coverage.
- **TD Bank and Scotiabank parsers** — deferred until real CSV exports are available (deliberately not built from web-sourced sample data).
- **WealthSimple** — deferred entirely, incompatible schema.
- **`pg_trgm` GIN index** — transaction description search runs unindexed; not urgent at current data volumes, but flagged for when they grow.
- **`types/models.ts` vs. `Accounts.tsx`'s own `Account` type** — two competing type definitions for the same shape, never reconciled.
- **Cross-user `category_overrides` convergence** — documented as a manual query to run periodically, not automated infrastructure.
