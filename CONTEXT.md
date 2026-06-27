# FinSight — Full Project Context

## Overview

FinSight is a web-based personal finance analyzer that lets users upload bank statements (CSV), automatically categorizes transactions using machine learning, detects spending anomalies, forecasts future spending, and delivers natural language insights powered by Gemini AI. The project is built to demonstrate full-stack development, ML integration, DevOps practices, and clean software architecture.

---

## Problem It Solves

Most people have no clear picture of where their money goes. FinSight turns raw bank exports into actionable intelligence — without manual entry, spreadsheets, or expensive subscriptions. It works across multiple accounts and banks, merging everything into one unified dashboard.

---

## Project Name

**FinSight**
- Short, professional, and memorable
- Works well as a GitHub repo name, resume line, and demo URL
- Alternatives considered: ClarityFi, LedgerLens, FlowSense

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | API framework |
| Supabase Auth | Authentication — JWT-based, email/password + Google OAuth |
| scikit-learn | Isolation Forest (anomaly detection) + Text Classifier (categorization) |
| Prophet | Time-series spending forecasting |
| pdfplumber | PDF bank statement parsing (future phase) |
| pandas / numpy | Data processing and normalization |
| Gemini 1.5 Flash | Natural language narration of ML findings (free tier) |
| SQLite (dev) / PostgreSQL (prod) | Transaction storage |
| Pydantic | Request/response schema validation |
| pytest | Automated testing |
| ruff | Linting |

### Frontend
| Technology | Purpose |
|---|---|
| React + Vite | UI framework |
| Recharts | Spending and forecast charts |
| TailwindCSS | Styling |
| Axios | API calls to FastAPI backend |
| React Context API | Global auth session state |

### DevOps
| Technology | Purpose |
|---|---|
| Docker | Containerization of backend and frontend |
| Docker Compose | Local multi-service development |
| GitHub Actions | CI/CD pipeline (test on PR, deploy on merge) |

### Hosting (All Free Tier)
| Service | What It Hosts |
|---|---|
| Render | FastAPI backend (Docker container) |
| Vercel | React frontend |
| Supabase | PostgreSQL database |
| GitHub | Source control + Actions runner |

---

## Build Order

Backend is built completely first (Weeks 1–4), then frontend (Weeks 5–7), then polish in Week 8. This keeps API contracts stable before any UI is written against them.

Pydantic response schemas for all endpoints are defined in Week 1 alongside auth — they act as the contract the frontend will consume later.

CI/CD is set up in Week 1 alongside the project foundation. The pipeline is infrastructure, not an afterthought. Every feature built after Week 1 is automatically tested and deployable from day one.

---

## 8-Week Build Timeline

### Week 1 — Foundation + Auth + CI/CD
- Initialize repo, Docker, Docker Compose, FastAPI skeleton with `/health`
- Supabase connection (db.py)
- Supabase Auth: signup, login, logout endpoints
- `get_current_user` dependency protecting all routes from day one
- All Pydantic request/response schemas defined (transaction.py) — these are the frontend contract
- GitHub Actions CI pipeline: `ruff` lint + `pytest` on every PR
- GitHub Actions deploy pipeline: backend to Render + frontend to Vercel on merge to main
- All secrets configured in GitHub Actions (GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY, RENDER_DEPLOY_HOOK)
- **Milestone:** Hit a protected endpoint with a JWT. `docker-compose up` runs cleanly. CI passes on PR. Deploy pipeline runs on merge.

### Week 2 — Accounts + CSV Parser
- POST /accounts — create a named account (e.g. "TD Chequing", "RBC Visa Infinite")
- GET /accounts — list user's accounts
- detector.py + base_parser.py
- TD and RBC parsers
- POST /upload endpoint (CSV file + account_id)
- Parser unit tests
- **Milestone:** User creates an account, uploads a real TD CSV against it, sees normalized transactions in DB tagged to that account

### Week 3 — ML Models
- Train text classifier on Kaggle dataset, save category_model.pkl
- Isolation Forest pipeline — model saved per user as `anomaly_model_{user_id}.pkl`
- Wire both into the upload pipeline
- Unit tests for both models
- **Milestone:** Upload CSV → transactions stored with categories + anomaly flags + anomaly scores

### Week 4 — Forecasting + Gemini + Remaining Endpoints
- Prophet integration in forecaster.py
- GET /forecast endpoint (returns `insufficient_data` flag if < 3 months of history)
- gemini.py service + prompt engineering (feeds ML output, not raw transactions)
- GET /insights endpoint
- GET /transactions endpoint (filters: account_id, date range, category)
- **Milestone:** Full backend working end-to-end via API calls only. Call /insights, get natural language analysis back.

### Week 5 — Frontend Foundation + Auth
- React + Vite + Tailwind setup
- AuthContext, Axios client with Bearer token
- Login and Signup pages
- ProtectedRoute wrapper, App.jsx routing
- **Milestone:** User can sign up, log in, and reach a protected page

### Week 6 — Frontend Features
- Accounts page — create and manage named accounts
- Upload page (UploadCard — account selector dropdown populated from GET /accounts)
- Dashboard: SpendingChart, AnomalyTable, ForecastChart, InsightCard
- Account filter on dashboard — drill down by account or view all
- Wire all components to the backend API
- **Milestone:** Full flow working end-to-end in browser locally

### Week 7 — Polish + Edge Cases
- Handle bad CSVs, unknown banks, insufficient history for Prophet
- Loading states and error messages on frontend
- Improve Gemini prompts for better narration quality
- Add Scotiabank parser
- **Milestone:** App handles messy real-world data gracefully

### Week 8 — Finishing Touches
- Write README with architecture diagram
- Record short demo video (2–3 min)
- Clean up code, add docstrings to ML modules
- Final pass on UI polish
- **Milestone:** Portfolio-ready, interview-ready

---

## Database Design

### Tables and Relationships

```
USERS ||--o{ ACCOUNTS        : "owns"
USERS ||--o{ UPLOAD_BATCHES  : "creates"
ACCOUNTS ||--o{ UPLOAD_BATCHES : "tagged to"
UPLOAD_BATCHES ||--|{ TRANSACTIONS : "contains"
USERS ||--o{ TRANSACTIONS    : "owns"
```

**Relationship types:**
- `USERS` → `ACCOUNTS`: one-to-many. A user can have unlimited named accounts (e.g. TD Chequing, RBC Visa 1, RBC Visa 2, Scotiabank Savings).
- `USERS` → `UPLOAD_BATCHES`: one-to-many. A user uploads many CSVs over time.
- `ACCOUNTS` → `UPLOAD_BATCHES`: one-to-many. Each upload is tagged to exactly one named account. Multiple uploads can target the same account (e.g. monthly statements for the same card).
- `UPLOAD_BATCHES` → `TRANSACTIONS`: one-to-many, mandatory. A batch always has at least one transaction. Every transaction belongs to exactly one batch.
- `USERS` → `TRANSACTIONS`: one-to-many, direct. `user_id` sits on the transaction row itself — every DB query filters by `user_id` directly without relying on joins.

### Schema

**USERS**
> Managed by Supabase Auth. Referenced by other tables but not created manually.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, set by Supabase Auth |
| email | string | |
| created_at | timestamp | |

**ACCOUNTS**
> Named accounts belonging to a user. Solves the problem of users having multiple credit cards or accounts at the same bank.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → USERS.id |
| name | string | User-defined, e.g. "RBC Visa Infinite" |
| account_type | enum | chequing, savings, credit_card, other |
| created_at | timestamp | |

**UPLOAD_BATCHES**
> One row per CSV upload. Tracks the upload event — filename, which account it belongs to, which bank was detected, how many transactions were parsed.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → USERS.id |
| account_id | uuid | FK → ACCOUNTS.id |
| filename | string | Original filename for display |
| bank_detected | string | td, rbc, scotiabank, unknown |
| transaction_count | int | Set after parsing |
| uploaded_at | timestamp | |

**TRANSACTIONS**
> One row per transaction. Core data of the system.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → USERS.id — direct scope for security |
| batch_id | uuid | FK → UPLOAD_BATCHES.id |
| date | date | Transaction date from CSV |
| description | string | Raw description from CSV |
| amount | float | Negative = debit, positive = credit |
| category | enum | Food, Transport, Utilities, Entertainment, Health, Shopping, Income, Other |
| account_type | string | Denormalized from account for fast filtering |
| is_anomaly | boolean | Set by Isolation Forest |
| anomaly_score | float | Raw IF score — useful for ranking severity |
| created_at | timestamp | |

### Design Decisions

**Why `user_id` is on TRANSACTIONS directly:** Every query filters by `user_id` as the first condition. No join is required to enforce data isolation — a missing or broken join can never accidentally expose another user's data.

**Why `account_type` is denormalized onto TRANSACTIONS:** Fast filtering without a join. `WHERE user_id = ? AND account_type = 'credit_card'` is a single-table scan.

**Why `anomaly_score` is stored alongside `is_anomaly`:** The boolean is for display. The raw score enables ranking by severity and builds richer Gemini prompts.

**Why no categories table:** Categories are a fixed enum (8 values). A lookup table would be over-engineering. Defined as a Python `Enum` in Pydantic schemas and validated there.

**Why named ACCOUNTS instead of just an account_type enum on uploads:** Users realistically have multiple credit cards. An enum can't distinguish "RBC Visa 1" from "RBC Visa 2." Named accounts solve this and make per-account insights meaningful.

**Anomaly model storage:** Per-user Isolation Forest models are saved to disk as `anomaly_model_{user_id}.pkl`, not tracked in the DB. Prophet has no persistence — fits on request.

---

## CSV Upload Flow

### How It Works

1. User creates a named account (e.g. "TD Chequing") via POST /accounts
2. User goes to the Upload page, selects their account from a dropdown
3. They select a CSV file exported from their bank
4. They click Upload
5. The backend detects the bank from the CSV structure, parses it, runs the ML categorizer on each transaction, runs anomaly detection, and stores everything tagged to the selected account

### What Gets Stored Per Transaction

```
id  | user_id | batch_id | date       | description     | amount  | category  | account_type | is_anomaly | anomaly_score
001 | usr_abc | bat_001  | 2024-03-01 | TIM HORTONS     | -4.50   | Food      | chequing     | false      | -0.12
002 | usr_abc | bat_002  | 2024-03-02 | AMAZON.CA       | -89.00  | Shopping  | credit_card  | true       | 0.43
003 | usr_abc | bat_001  | 2024-03-03 | PAYROLL DEPOSIT | +2800   | Income    | chequing     | false      | -0.31
```

### Multi-Account Support

Users create named accounts before uploading. Two RBC credit cards are tracked as separate accounts ("RBC Visa Infinite", "RBC Cashback Mastercard") even though they're the same bank. The dashboard merges all accounts into one view; filters let users drill down by account.

Cross-account insights this enables:
- Net position across all accounts
- Detecting automatic transfers between accounts
- Separating day-to-day spending from credit card debt
- Per-card spending breakdowns for users with multiple cards

---

## Bank Parser Architecture

```
Upload CSV
    ↓
detector.py — reads headers, identifies bank
    ↓
Routes to correct parser (td_parser, rbc_parser, etc.)
    ↓
Each parser implements base_parser.py interface:
  - parse(file) → List[Transaction]
    ↓
Normalized Transaction objects passed to ML pipeline
```

### Supported Banks (Phase 1)
- TD Bank
- RBC
- Scotiabank

### Extensibility
The base_parser interface means adding a new bank is just adding one new file. Open/closed principle — open for extension, closed for modification.

---

## Machine Learning Models

### 1. Text Classifier — Transaction Categorization
- **Algorithm:** TF-IDF Vectorizer + Logistic Regression pipeline
- **Purpose:** Predicts the spending category of each transaction based on its description
- **Categories:** Food, Transport, Utilities, Entertainment, Health, Shopping, Income, Other
- **Training data:** Public labeled personal finance dataset (Kaggle)
- **How it's used:** Run once per transaction on upload, result stored in DB
- **Saved as:** `backend/app/ml/models/category_model.pkl`
- **Trained via:** `backend/train/train_categorizer.py` (one-time script)

### 2. Isolation Forest — Anomaly Detection
- **Algorithm:** Isolation Forest (unsupervised)
- **Purpose:** Detects transactions that are statistically unusual in amount, frequency, or timing
- **Training data:** The user's own transaction history (no labels needed)
- **How it's used:** Re-trains per user on first upload, flags outliers
- **Saved as:** `backend/app/ml/models/anomaly_model_{user_id}.pkl`
- **Key insight:** Unsupervised — works for any user without pre-labeled data. Learns what's normal for that specific user.

### 3. Prophet — Spending Forecast
- **Algorithm:** Facebook Prophet (time-series forecasting)
- **Purpose:** Forecasts next 30/60/90 days of spending per category
- **Training data:** User's transaction history (minimum 3 months recommended)
- **How it's used:** Fits on the fly per forecast request, no pre-saved model needed
- **Cold start handling:** If < 3 months of data exists, returns an `insufficient_data` flag. Frontend shows a "need more history" message instead of a broken chart.
- **Output:** Projected spending with confidence intervals, displayed as a chart

### How ML + LLM Work Together
The ML models do the analytical heavy lifting. Gemini narrates the findings in plain English. The LLM does not do analysis — it only communicates results.

> "Your food spending jumped 43% this month compared to your 3-month average. Three transactions at DoorDash on weekends are flagged as anomalies — they're 2.8x your usual delivery order size."

---

## File Structure

```
finsight/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── auth/
│   │   │   ├── auth.py                    # Supabase auth client, JWT verification
│   │   │   └── dependencies.py            # get_current_user FastAPI dependency
│   │   ├── routers/
│   │   │   ├── auth.py                    # POST /auth/signup, login, logout
│   │   │   ├── accounts.py                # POST /accounts, GET /accounts
│   │   │   ├── upload.py                  # POST /upload (CSV + account_id)
│   │   │   ├── transactions.py            # GET /transactions (filters: account_id, date, category)
│   │   │   ├── insights.py                # GET /insights — ML results + Gemini narration
│   │   │   └── forecast.py                # GET /forecast — Prophet forecast
│   │   ├── ml/
│   │   │   ├── anomaly.py
│   │   │   ├── categorizer.py
│   │   │   ├── forecaster.py
│   │   │   └── models/
│   │   │       ├── anomaly_model_{user_id}.pkl
│   │   │       └── category_model.pkl
│   │   ├── services/
│   │   │   ├── parser.py
│   │   │   ├── parsers/
│   │   │   │   ├── base_parser.py
│   │   │   │   ├── td_parser.py
│   │   │   │   ├── rbc_parser.py
│   │   │   │   ├── scotiabank_parser.py
│   │   │   │   └── detector.py
│   │   │   ├── gemini.py
│   │   │   └── db.py
│   │   └── schemas/
│   │       └── transaction.py             # All Pydantic models — defined Week 1
│   ├── tests/
│   │   ├── test_parser.py
│   │   ├── test_anomaly.py
│   │   ├── test_categorizer.py
│   │   └── test_forecast.py
│   ├── train/
│   │   └── train_categorizer.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadCard.jsx             # file upload + account selector dropdown
│   │   │   ├── SpendingChart.jsx
│   │   │   ├── AnomalyTable.jsx
│   │   │   ├── ForecastChart.jsx
│   │   │   └── InsightCard.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Accounts.jsx               # create and manage named accounts
│   │   │   ├── Dashboard.jsx              # account filter + all charts + insights
│   │   │   └── Upload.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── api/
│   │   │   └── client.js
│   │   └── App.jsx
│   └── Dockerfile
│
├── .github/
│   └── workflows/
│       ├── ci.yml                         # ruff + pytest on every PR
│       └── deploy.yml                     # backend to Render + frontend to Vercel on merge to main
│
├── docker-compose.yml
└── README.md
```

---

## Authentication

### Why Auth Is In From Day One
- **Data isolation** — every transaction is scoped to a user. Without auth, all users see all data.
- **Per-user ML models** — the Isolation Forest trains on a specific user's spending history. Auth is what defines "a user."
- **Harder to add later** — retrofitting auth means touching every endpoint, every DB query, and the entire frontend.

### How It Works

```
User signs up / logs in
        ↓
Supabase returns JWT token
        ↓
Frontend stores token in memory (AuthContext)
        ↓
Every Axios request attaches: Authorization: Bearer <token>
        ↓
FastAPI verifies token on every protected endpoint via get_current_user dependency
        ↓
user_id extracted from token → used to scope all DB queries
```

**Backend — protecting every endpoint:**
```python
# auth/dependencies.py
async def get_current_user(token: str = Depends(oauth2_scheme)):
    user = supabase.auth.get_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

@router.get("/transactions")
async def get_transactions(user=Depends(get_current_user)):
    # only queries transactions where user_id = user.id
```

**Frontend — attaching token to every request:**
```javascript
// api/client.js
const client = axios.create({ baseURL: import.meta.env.VITE_API_URL });

client.interceptors.request.use((config) => {
  const token = getTokenFromContext();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Auth Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/signup | Create account with email + password |
| POST | /auth/login | Login, returns JWT |
| POST | /auth/logout | Invalidate session |

### Token Storage
JWT is stored in memory via React Context — not in localStorage or sessionStorage. Protects against XSS attacks. On page refresh the user is prompted to log in again (acceptable trade-off; can be improved with httpOnly cookies later).

---

## CI/CD Pipeline

Configured in Week 1 and active from the first commit.

### On Every Pull Request (`ci.yml`)
```
Push to branch → open PR
      ↓
GitHub Actions triggers:
  1. pip install -r requirements.txt
  2. ruff check (linting)
  3. pytest tests/
      ↓
All pass → PR is mergeable
```

### On Merge to Main (`deploy.yml`)
```
Merge to main
      ↓
GitHub Actions triggers:
  1. Build Docker image (backend)
  2. Push to Render via deploy hook
  3. Trigger Vercel deploy (frontend)
      ↓
Live within ~2 minutes
```

### Secrets
Stored in GitHub Actions Secrets: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `RENDER_DEPLOY_HOOK`. Never hardcoded, never committed.

---

## Interview Talking Points

- **Why CI/CD from day one?** The pipeline is infrastructure. Setting it up after the fact means weeks of untested code accumulating. Every PR should be green before it merges; every merge should be deployable.
- **Why auth from day one?** Data isolation and per-user ML models require it from the first line of code. Retrofitting auth is one of the most painful things you can do to an existing codebase.
- **Why named accounts instead of just an account_type enum?** Users realistically have multiple credit cards. An enum can't distinguish "RBC Visa 1" from "RBC Visa 2." Named accounts solve this cleanly and make per-account insights meaningful.
- **Why `user_id` directly on transactions?** Security through direct scoping — no join can accidentally expose another user's data. Every query starts with `WHERE user_id = ?`.
- **Why store `anomaly_score` alongside `is_anomaly`?** The boolean is for display. The raw score enables ranking by severity and builds richer Gemini prompts.
- **Why Supabase Auth over rolling your own?** JWT handling, password hashing, and session management are security-critical. Using a proven service is the professional choice.
- **Why store JWT in memory not localStorage?** localStorage is vulnerable to XSS attacks.
- **Why Isolation Forest?** Unsupervised — works for any user without labeled data. Learns what's normal for that specific user.
- **Why separate ML from LLM?** The LLM narrates, the models analyze. More mature and defensible than prompt-engineering everything.
- **Why FastAPI over Flask?** Built-in async, automatic OpenAPI docs, Pydantic validation out of the box.
- **Why the parser abstraction?** Open/closed principle — open for extension (new banks), closed for modification (existing parsers don't change).

---

## Future Phase Ideas (Not in Scope)

- PDF statement support (pdfplumber)
- Google OAuth login
- Mobile app (React Native, same FastAPI backend)
- Budget setting and alerts
- ChromaDB for natural language transaction search
- Fine-tuned categorizer on user-corrected labels
- httpOnly cookie auth (better UX on refresh)
- Account balance tracking over time
