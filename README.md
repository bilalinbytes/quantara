# Quantara (StockPilotAI)

AI-powered financial intelligence platform — live market data, news, SEC filings, and Groq-driven investment analysis.

![Stack](https://img.shields.io/badge/Next.js-16-black) ![FastAPI](https://img.shields.io/badge/FastAPI-Python-green) ![Groq](https://img.shields.io/badge/LLM-Groq-orange) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Docker (Full Stack)](#docker-full-stack)
- [Deploy to Production](#deploy-to-production)
  - [Step 1 — Push to GitHub](#step-1--push-to-github)
  - [Step 2 — Deploy Backend (Render)](#step-2--deploy-backend-render)
  - [Step 3 — Deploy Frontend (Vercel)](#step-3--deploy-frontend-vercel)
  - [Step 4 — Verify Production](#step-4--verify-production)
- [API Reference](#api-reference)
- [Frontend Routes](#frontend-routes)
- [Troubleshooting](#troubleshooting)

---

## Overview

Quantara is a full-stack financial copilot that:

- Fetches **17 data sources in parallel** (FMP, NewsAPI, Yahoo Finance, SEC EDGAR)
- Caches context in **Redis (10 min)** — shared across chat, news, research
- Generates analysis via **Groq** (`llama-3.3-70b-versatile`)
- Gracefully degrades when APIs fail — never stops on a single missing source
- Shows **Evidence Used** (✅/❌) per data source with dynamic confidence scoring

---

## Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│  Vercel         │ ──────────────▶│  Render / Railway │
│  Next.js 16     │   REST API     │  FastAPI Backend  │
│  (Frontend)     │                │  + PostgreSQL     │
└─────────────────┘                │  + Redis          │
                                   └────────┬─────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
              Financial            NewsAPI.org                  Groq API
              Modeling Prep        (News)                   (LLM Analysis)
              (Market Data)                              SEC EDGAR (Filings)
```

> **Important:** Vercel hosts the **frontend only**. The Python FastAPI backend must be deployed separately (Render, Railway, Fly.io, or Docker VPS).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, TanStack Query |
| Backend | FastAPI, Python 3.11, SQLAlchemy 2, Alembic |
| Database | PostgreSQL |
| Cache / Queue | Redis, Celery |
| LLM | Groq (`llama-3.3-70b-versatile`) |
| Market Data | Financial Modeling Prep (stable API) |
| News | NewsAPI.org |
| SEC | SEC EDGAR (public) |
| Infra | Docker Compose, Vercel (frontend), Render (backend) |

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Frontend |
| Python | 3.11+ | Backend |
| Docker Desktop | Latest | Full-stack local / optional prod |
| Git | Latest | Version control |
| GitHub account | — | Repository hosting |
| Vercel account | — | Frontend deployment |
| Render account | — | Backend + DB (free tier works) |

### API Keys Required

| Key | Where to get it | Required? |
|-----|-----------------|-----------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | **Yes** (all AI features) |
| `NEWS_API_KEY` | [newsapi.org](https://newsapi.org) | **Yes** (news intelligence) |
| `FMP_API_KEY` | [financialmodelingprep.com](https://financialmodelingprep.com) | Recommended (financials, ratings) |

---

## Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379/0

# Financial Modeling Prep
FMP_BASE_URL=https://financialmodelingprep.com/stable
FMP_API_KEY=your_fmp_key

# News (NewsAPI.org)
NEWS_API_KEY=your_newsapi_key

# LLM — Groq
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile

# SEC EDGAR (no key — set a real contact email)
SEC_USER_AGENT=Quantara/1.0 contact@yourdomain.com

# Auth
SECRET_KEY=generate-a-random-64-char-string

# Frontend only (Vercel)
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
```

> Never commit `.env` to GitHub. It is listed in `.gitignore`.

---

## Local Development

### 1. Clone & configure

```bash
git clone https://github.com/YOUR_USERNAME/StockPilotAI.git
cd StockPilotAI
cp .env.example .env
# Edit .env with your API keys
```

### 2. Option A — Docker (easiest)

```bash
cd infra
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |

### 3. Option B — Manual

**Backend:**

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

**Frontend (new terminal):**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

---

## Docker (Full Stack)

```bash
cd infra

# Start everything
docker compose up -d

# Rebuild after code changes
docker compose up -d --build backend

# View logs
docker compose logs -f backend

# Stop
docker compose down
```

Services: `postgres`, `redis`, `backend`, `frontend`, `celery_worker`, `celery_beat`, `qdrant`, `prometheus`, `grafana`

---

## Deploy to Production

### Step 1 — Push to GitHub

```bash
cd StockPilotAI

git init
git add .
git commit -m "Initial commit: Quantara AI financial platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/StockPilotAI.git
git push -u origin main
```

---

### Step 2 — Deploy Backend (Render)

Vercel cannot run Python/FastAPI. Use **Render** (free tier) for the backend.

#### 2a. Create PostgreSQL on Render

1. Go to [render.com](https://render.com) → **New** → **PostgreSQL**
2. Name: `quantara-db`
3. Copy the **Internal Database URL**

#### 2b. Create Redis (Upstash — free)

1. Go to [upstash.com](https://upstash.com) → Create Redis database
2. Copy the **Redis URL** (`rediss://...`)

#### 2c. Create Web Service for Backend

1. Render → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `quantara-api` |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free |

4. Add **Environment Variables**:

```
DATABASE_URL        = (from Render PostgreSQL)
REDIS_URL           = (from Upstash)
GROQ_API_KEY        = gsk_...
GROQ_MODEL          = llama-3.3-70b-versatile
LLM_PROVIDER        = groq
NEWS_API_KEY        = ...
FMP_API_KEY         = ...
FMP_BASE_URL        = https://financialmodelingprep.com/stable
SEC_USER_AGENT      = Quantara/1.0 contact@yourdomain.com
SECRET_KEY          = (random 64-char string)
```

5. Click **Create Web Service**
6. Copy your backend URL: `https://quantara-api.onrender.com`

#### Alternative: Railway / Fly.io / VPS + Docker

```bash
# VPS with Docker
cd infra
docker compose up -d backend postgres redis
# Point domain to server IP:8000
```

---

### Step 3 — Deploy Frontend (Vercel)

#### 3a. Import project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` (default) |
| **Install Command** | `npm install` |

#### 3b. Environment variables (Vercel)

In **Project Settings → Environment Variables**, add:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_API_URL` | `https://quantara-api.onrender.com/api/v1` | Production, Preview, Development |

> `NEXT_PUBLIC_*` vars are baked in at build time. Redeploy after changing them.

#### 3c. Deploy

Click **Deploy**. Vercel builds and hosts at:

```
https://your-project.vercel.app
```

#### 3d. CLI deploy (optional)

```bash
npm i -g vercel
cd frontend
vercel login
vercel --prod
# Set NEXT_PUBLIC_API_URL when prompted
```

---

### Step 4 — Verify Production

```bash
# Backend health
curl https://quantara-api.onrender.com/health

# Context (should show sources_used)
curl https://quantara-api.onrender.com/api/v1/companies/MSFT/context

# AI chat
curl -X POST https://quantara-api.onrender.com/api/v1/companies/MSFT/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Should I buy this stock?"}'
```

Open your Vercel URL → search **MSFT** → open **Assistant** → ask a question.

---

## API Reference

**Base URL:** `https://your-backend.onrender.com/api/v1`  
**Swagger:** `https://your-backend.onrender.com/docs`

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?q={query}` | Search companies |
| GET | `/companies/{ticker}` | Company profile |
| GET | `/companies/{ticker}/price` | Live price |
| GET | `/companies/{ticker}/metrics` | Key metrics |
| GET | `/companies/{ticker}/financials` | Financial statements |
| GET | `/companies/{ticker}/context` | Shared cached context + evidence |
| POST | `/companies/{ticker}/chat` | AI assistant (Groq) |
| POST | `/companies/{ticker}/news/analyze` | News intelligence |
| POST | `/companies/{ticker}/financial-analysis` | Financial AI analysis |
| POST | `/companies/{ticker}/research/generate` | Investment report (SSE) |
| POST | `/chat/filings` | SEC Q&A (SSE stream) |
| GET | `/companies/{ticker}/news` | Latest news |
| GET | `/companies/{ticker}/sentiment` | Sentiment breakdown |

### Chat Request

```json
POST /api/v1/companies/MSFT/chat
{
  "question": "Is it overvalued?",
  "session_id": null
}
```

### Chat Response

```json
{
  "summary": "...",
  "recommendation": "Hold",
  "confidence": 82,
  "investment_score": 74,
  "bullish_points": ["..."],
  "bearish_points": ["..."],
  "sources_used": ["Company Profile", "Live Price", "Latest News"],
  "missing_sources": ["Analyst Ratings"],
  "evidence": [{"label": "Live Price", "available": true}],
  "follow_up_questions": ["..."]
}
```

---

## Frontend Routes

| Route | Feature |
|-------|---------|
| `/` | Company search |
| `/company/{ticker}` | Dashboard |
| `/company/{ticker}/assistant` | AI chat |
| `/company/{ticker}/news` | Market intelligence |
| `/company/{ticker}/financials` | Financials + AI analyst |
| `/company/{ticker}/filings` | SEC filings + chat |
| `/company/{ticker}/research` | Research report |
| `/watchlists` | Watchlists |
| `/admin` | Admin console |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Frontend can't reach API | Set `NEXT_PUBLIC_API_URL` on Vercel, redeploy |
| CORS errors | Backend allows `*` origins — check API URL has no trailing slash issues |
| `GROQ_API_KEY required` | Add key to Render env vars, restart service |
| Render cold start (30s delay) | Free tier sleeps — upgrade or use a cron ping |
| "Insufficient data" | Rebuild backend — pipeline now degrades gracefully |
| News empty | Check `NEWS_API_KEY`; NewsAPI free tier is dev-only (localhost) — use paid plan for production |
| FMP financials missing | Add real `FMP_API_KEY` |
| Vercel build fails | Ensure **Root Directory** = `frontend` |
| Database errors on Render | Run migrations: `alembic upgrade head` in Render shell |

---

## Project Structure

```
StockPilotAI/
├── .env.example          # Environment template
├── README.md
├── backend/
│   ├── main.py           # FastAPI entry
│   └── app/
│       ├── api/          # REST routes
│       ├── ai/pipelines/ # Intelligence, SEC, Research
│       ├── services/     # Context, Groq, FMP, NewsAPI, cache
│       └── config/       # Settings
├── frontend/
│   ├── app/              # Next.js pages
│   ├── features/         # UI modules
│   ├── hooks/            # React Query hooks
│   └── vercel.json       # Vercel config
└── infra/
    └── docker-compose.yml
```

---

## License

MIT — use freely for learning and portfolio projects.

---

## Author

Built with FastAPI + Next.js + Groq.  
For issues, open a GitHub issue or PR.
"# quantara" 
