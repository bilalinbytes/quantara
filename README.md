# Quantara

> **AI-powered financial intelligence platform for investment research, market analysis, SEC filing intelligence, and conversational AI insights.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](#)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.138-green?logo=fastapi)](#)
[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](#)
[![Groq](https://img.shields.io/badge/LLM-Groq-orange)](#)
[![Qdrant](https://img.shields.io/badge/RAG-Qdrant-purple)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](#)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-blue?logo=githubactions)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-lightgrey)](#)

Quantara is a production-grade AI financial intelligence platform that combines live market data, company fundamentals, financial statements, market news, SEC filings, and large language models to deliver conversational investment research and actionable financial insights.

**Repository:** [github.com/bilalinbytes/quantara](https://github.com/bilalinbytes/quantara) &nbsp;·&nbsp; **Demo:** [Watch on Google Drive](https://drive.google.com/file/d/1lpx3ViCeQ7w0_v1oteKPrzjUci1-gib8/view?usp=sharing)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Multi-Agent Research Pipeline](#multi-agent-research-pipeline)
- [Tech Stack](#tech-stack)
- [Prerequisites & API Keys](#prerequisites--api-keys)
- [Quickstart](#quickstart)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Frontend Routes](#frontend-routes)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)

---

## Overview

Quantara is a full-stack financial copilot built for investors, analysts, and builders who want a production-style research workflow backed by real data — no mocks.

**Core capabilities:**

- **17 parallel data sources** — FMP, NewsAPI.org, Yahoo Finance (fallback), SEC EDGAR
- **Shared context service** — Redis-cached (10 min TTL), reused across chat, news, research, and exports
- **Groq LLM** — `llama-3.3-70b-versatile` with `llama-3.1-8b-instant` fallback on rate limits
- **Graceful degradation** — analysis continues when individual APIs fail; UI shows per-source evidence status (✅/❌)
- **Multi-agent research** — 8 independent Groq agents + Lead Synthesizer producing institutional-grade reports
- **SEC filing RAG** — Qdrant vector store + fastembed embeddings with semantic search and citations
- **Autonomous monitoring** — Celery workers scan watchlists for live news and SEC events, generating briefings
- **SSE streaming** — token-level streaming for chat and research endpoints
- **Security** — prompt injection guardrails, JWT + OAuth auth, Prometheus observability

### Feature Status

| Feature | Status | Notes |
|---|---|---|
| Live company data (FMP + Yahoo fallback) | ✅ | Works without an FMP key via Yahoo |
| News intelligence (NewsAPI.org) | ✅ | Requires `NEWS_API_KEY` |
| Shared context + Redis cache | ✅ | 10-min TTL, dynamic confidence |
| AI chat (Groq structured JSON) | ✅ | Investment cards, intent routing |
| Chat SSE streaming | ✅ | `POST .../chat/stream` |
| Multi-agent research orchestrator | ✅ | 8 agents + synthesizer via SSE |
| SEC EDGAR filings + parsing | ✅ | Real filings, no placeholders |
| SEC RAG (Qdrant + fastembed) | ✅ | Auto-index on chat; manual index endpoint |
| Prompt injection guardrails | ✅ | Chat, intelligence, and SEC pipelines |
| OAuth (Google + GitHub) | ✅ | Backend token exchange + callback pages |
| JWT auth (register / login / refresh) | ✅ | Email/password + OAuth |
| Portfolio analytics API | ✅ | `/portfolio/analytics`, `/portfolio/compare` |
| Celery news/SEC monitoring | ✅ | Live, context-based alerts |
| Groq daily briefing | ✅ | Scheduled Celery task |
| Prometheus metrics | ✅ | Live counters at `/metrics` |
| GitHub Actions CI | ✅ | Lint, test, Docker build |
| PDF / Markdown / CSV exports | ✅ | Research + financials |
| Context-only fallback on Groq 429 | ✅ | Live data analysis when rate-limited |
| Admin dashboard | ✅ | Monitoring UI |
| Grafana / Prometheus stack | ⚠️ Partial | Docker Compose included; dashboards need customization |
| Alembic migrations | ⚠️ Partial | Auto schema patches on startup; full Alembic optional |
| Production OAuth UI | ⚠️ Partial | Callback routes exist; login page not wired into nav |

---

## Architecture

```
┌─────────────────────┐        HTTPS / REST / SSE         ┌──────────────────────────┐
│  Next.js 16          │ ─────────────────────────────▶   │  FastAPI Backend          │
│  (Vercel / Docker)   │ ◀─────────────────────────────   │  PostgreSQL + Redis       │
└─────────────────────┘                                    │  Celery Workers           │
                                                            └────────────┬──────────────┘
                                                                         │
         ┌──────────────────────────────┬──────────────────────────────┼──────────────┐
         ▼                              ▼                              ▼               ▼
   FMP / Yahoo                    NewsAPI.org                      Groq API        SEC EDGAR
   (Market Data)                   (News)                     (llama-3.3-70b)      (Filings)
                                                                                        │
                                                                                        ▼
                                                                               Qdrant (RAG)
                                                                               fastembed
```

**Request flow:**

1. User submits a question on the Assistant page
2. Backend fetches and caches company context from 17 sources via Redis
3. Groq generates structured JSON (falls back to live-data-only analysis if rate-limited)
4. Response streams via SSE with an investment card, evidence checklist, and citations
5. Celery workers independently monitor watchlists and index new SEC filings into Qdrant

---

## Multi-Agent Research Pipeline

The research endpoint runs **8 independent Groq agents** in parallel, each covering one domain of live data, followed by a synthesis pass:

| Agent | Focus |
|---|---|
| Financial Agent | Revenue, margins, cash flow, balance sheet |
| News Agent | Headlines, sentiment, catalysts |
| SEC Agent | Risk factors, MD&A, disclosures |
| Valuation Agent | P/E, price targets, fair value |
| Technical Agent | Trend, SMA, momentum |
| Macro Agent | Sector context, market conditions |
| Risk Agent | Downside scenarios, bear case |
| Portfolio Agent | Diversification, position sizing |

A **Lead Synthesizer** merges all 8 outputs into a single institutional report, streamed to the client over SSE.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, TanStack Query |
| Backend | FastAPI, Python 3.11, SQLAlchemy 2, Pydantic Settings |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7, Celery + Beat |
| Vector DB | Qdrant, fastembed (`BAAI/bge-small-en-v1.5`) |
| LLM | Groq — `llama-3.3-70b-versatile` (+ `llama-3.1-8b-instant` fallback) |
| Market Data | Financial Modeling Prep, Yahoo Finance (fallback) |
| News | NewsAPI.org |
| SEC Filings | SEC EDGAR (public API) |
| Observability | Prometheus, Grafana, Loki, cAdvisor, node-exporter |
| CI/CD | GitHub Actions |
| Deployment | Vercel (frontend), Render / Railway / Docker (backend) |

---

## Prerequisites & API Keys

**Required tools:**

| Tool | Version |
|---|---|
| Node.js | 20+ |
| Python | 3.11+ |
| Docker Desktop | Latest (recommended for full stack) |
| Git | Latest |

**API keys:**

| Key | Source | Required? |
|---|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | **Yes** — all AI features |
| `NEWS_API_KEY` | [newsapi.org](https://newsapi.org) | **Yes** — news intelligence |
| `FMP_API_KEY` | [financialmodelingprep.com](https://financialmodelingprep.com) | Recommended (Yahoo fallback covers basics) |
| `GOOGLE_CLIENT_ID` / `SECRET` | Google Cloud Console | Optional — OAuth |
| `GITHUB_CLIENT_ID` / `SECRET` | GitHub Developer Settings | Optional — OAuth |

---

## Quickstart

### Option A — Docker (recommended)

```bash
git clone https://github.com/bilalinbytes/quantara.git
cd quantara
cp .env.example .env
# Fill in your API keys in .env

cd infra
docker compose up -d --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| Qdrant | http://localhost:6333 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:30000 (admin / admin) |

**Rebuild after backend changes:**
```bash
docker compose up -d --build backend
```

**Index SEC filings for RAG:**
```bash
curl -X POST http://localhost:8000/api/v1/companies/NVDA/filings/index
```

### Option B — Manual

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Optional — Celery workers (monitoring & alerts):**
```bash
cd backend
celery -A app.worker.celery_app worker --loglevel=info
celery -A app.worker.celery_app beat --loglevel=info
```

---

## Environment Variables

```bash
cp .env.example .env
```

```env
# Database
DATABASE_URL=postgresql://quantara:password@localhost:5432/quantara_dev
REDIS_URL=redis://localhost:6379/0

# Market Data
FMP_BASE_URL=https://financialmodelingprep.com/stable
FMP_API_KEY=your_fmp_key

# News
NEWS_API_KEY=your_newsapi_key

# LLM — Groq
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_FALLBACK_MODEL=llama-3.1-8b-instant

# Vector DB
QDRANT_URL=http://localhost:6333

# SEC EDGAR
SEC_USER_AGENT=Quantara/1.0 contact@yourdomain.com

# Auth
SECRET_KEY=generate-a-random-64-char-string

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback/google
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3000/auth/callback/github

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Frontend (Vercel)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

> **Never commit `.env`** — it is already in `.gitignore`.

---

## Deployment

### 1. Push to GitHub

```bash
git remote add origin https://github.com/bilalinbytes/quantara.git
git push -u origin main
```

### 2. Backend — Render / Railway / VPS

The Python backend must be deployed separately from the frontend.

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Required environment variables: `DATABASE_URL`, `REDIS_URL`, `GROQ_API_KEY`, `NEWS_API_KEY`, `FMP_API_KEY`, `SECRET_KEY`, `QDRANT_URL`, `SEC_USER_AGENT`, `CORS_ORIGINS`

Also provision: PostgreSQL, Redis (e.g. Upstash), and Qdrant Cloud (or self-hosted).

### 3. Frontend — Vercel

| Setting | Value |
|---|---|
| Framework | Next.js |
| Root Directory | `frontend` |
| Env var | `NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api/v1` |

> `NEXT_PUBLIC_*` variables are baked in at build time — redeploy after any changes.

### 4. Verify

```bash
curl https://your-api.onrender.com/health
curl https://your-api.onrender.com/api/v1/companies/MSFT/context
curl -X POST https://your-api.onrender.com/api/v1/companies/MSFT/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"What are the main risks?"}'
```

---

## API Reference

**Base URL:** `http://localhost:8000/api/v1` (local) or your deployed backend  
**Swagger UI:** `/docs` · **Prometheus metrics:** `/metrics`

### Market Data

| Method | Endpoint | Description |
|---|---|---|
| GET | `/search?q={query}` | Company search |
| GET | `/companies/{ticker}` | Company profile |
| GET | `/companies/{ticker}/price` | Live price |
| GET | `/companies/{ticker}/metrics` | Key metrics |
| GET | `/companies/{ticker}/history` | Price history |
| GET | `/companies/{ticker}/financials` | Financial statements |
| GET | `/companies/{ticker}/context` | Shared cached context + evidence |

### AI & Analysis

| Method | Endpoint | Description |
|---|---|---|
| POST | `/companies/{ticker}/chat` | AI chat (JSON response) |
| POST | `/companies/{ticker}/chat/stream` | AI chat (SSE token stream) |
| POST | `/companies/{ticker}/news/analyze` | News intelligence |
| POST | `/companies/{ticker}/financial-analysis` | Financial AI analysis |
| POST | `/companies/{ticker}/research/generate` | Multi-agent report (SSE) |
| GET | `/companies/{ticker}/ai-summary` | Daily AI summary |

### SEC Filings & RAG

| Method | Endpoint | Description |
|---|---|---|
| GET | `/companies/{ticker}/filings` | Filing list |
| GET | `/companies/{ticker}/filings/{id}` | Parsed filing sections |
| POST | `/companies/{ticker}/filings/index` | Index filing into Qdrant |
| GET | `/companies/{ticker}/filings/search?q=...` | Semantic RAG search |
| POST | `/chat/filings` | SEC Q&A (SSE stream) |

### Chat Sessions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/companies/{ticker}/chat/sessions` | List sessions |
| GET | `/chat/sessions/{id}/messages` | Session history |
| PATCH | `/chat/sessions/{id}` | Rename session |
| DELETE | `/chat/sessions/{id}` | Delete session |

### Portfolio

| Method | Endpoint | Description |
|---|---|---|
| GET | `/portfolio/analytics?tickers=MSFT,AAPL,NVDA` | Multi-ticker analytics |
| GET | `/portfolio/compare?a=MSFT&b=AAPL` | Side-by-side comparison |

### Watchlists & Monitoring

| Method | Endpoint | Description |
|---|---|---|
| GET / POST / DELETE | `/watchlists` | Watchlist CRUD |
| GET / PATCH | `/alerts` | Proactive alerts |
| GET | `/briefing` | Daily AI market briefing |
| POST | `/monitor/trigger` | Manually trigger monitoring |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Email registration |
| POST | `/auth/login` | Email login |
| POST | `/auth/refresh` | Refresh JWT |
| POST | `/auth/oauth/callback` | Google / GitHub OAuth |
| GET | `/auth/oauth/google/config` | OAuth client config |
| GET | `/auth/oauth/github/config` | OAuth client config |

### Exports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/research/{ticker}/pdf` | PDF research report |
| GET | `/research/{ticker}/markdown` | Markdown export |
| GET | `/financials/{ticker}/csv` | Financials CSV |

### Example Chat Response

```json
{
  "summary": "Based on 8 live sources, NVDA shows...",
  "recommendation": "Hold",
  "confidence": 82,
  "investment_score": 7,
  "bullish_points": ["Strong revenue growth", "AI demand tailwind"],
  "bearish_points": ["Valuation premium", "Export restrictions"],
  "sources_used": ["Live Price", "Latest News", "Income Statement"],
  "missing_sources": ["Analyst Ratings"],
  "evidence": [{ "label": "Live Price", "available": true }],
  "follow_up_questions": ["What are the SEC risk factors?"]
}
```

---

## Frontend Routes

| Route | Description |
|---|---|
| `/` | Company search |
| `/company/{ticker}` | Company dashboard |
| `/company/{ticker}/assistant` | AI chat (SSE streaming) |
| `/company/{ticker}/news` | Market intelligence + sentiment |
| `/company/{ticker}/financials` | Financials + AI analyst |
| `/company/{ticker}/filings` | SEC filings + RAG chat |
| `/company/{ticker}/research` | Multi-agent research report |
| `/watchlists` | Watchlists, alerts, and briefing |
| `/admin` | Admin monitoring console |
| `/auth/callback/google` | Google OAuth callback |
| `/auth/callback/github` | GitHub OAuth callback |

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on push and PR to `main` and `develop`:

- **Backend** — `ruff` lint + `pytest`
- **Frontend** — `npm run lint` + `npm run build`
- **Docker** — builds backend and frontend images

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `Failed to fetch` in chat | Backend crashed or unreachable | Check `docker compose logs backend`; confirm backend is on port 8000 |
| `Groq API error: 429` | Free-tier token limit (~100k/day) | Wait ~30 min for reset, or upgrade at [console.groq.com](https://console.groq.com) — app falls back to live-data-only analysis |
| `column users.oauth_provider does not exist` | DB schema out of date | Run `ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR;` and `ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_subject VARCHAR;` — or restart backend (auto-patches on startup) |
| `GROQ_API_KEY required` | Missing or placeholder key | Set a real key in `.env` and rebuild the Docker backend |
| Frontend can't reach API | Wrong `NEXT_PUBLIC_API_URL` | Set to `http://localhost:8000/api/v1` locally; redeploy Vercel for production |
| CORS errors | Origin not in allow list | Add your frontend URL to `CORS_ORIGINS` in `.env` |
| News empty in production | NewsAPI free tier is localhost-only | Use a paid NewsAPI plan or a proxy |
| SEC RAG returns no results | Filings not indexed | `POST /companies/{ticker}/filings/index` |
| Render cold start (~30s) | Free tier sleeps between requests | Upgrade plan or set up an uptime ping |
| Stale Docker backend | Old container image | `docker compose up -d --build backend` |

---

## Project Structure

```
quantara/
├── .env.example                  # Environment variable template
├── .github/workflows/ci.yml      # GitHub Actions CI
├── README.md
├── backend/
│   ├── main.py                   # FastAPI entry point — metrics, CORS
│   ├── requirements.txt
│   ├── tests/                    # pytest (guardrails, metrics)
│   └── app/
│       ├── api/                  # REST routes — chat, news, filings, auth, portfolio
│       ├── ai/
│       │   ├── guardrails.py     # Prompt injection protection
│       │   └── pipelines/        # intelligence, SEC, research, agent_orchestrator
│       ├── services/             # context, LLM, FMP, news, RAG, cache, metrics
│       ├── middleware/           # Prometheus request middleware
│       ├── worker/               # Celery tasks — monitoring, briefings
│       ├── db/                   # Models, migrations (schema patches)
│       └── config/               # Pydantic settings
├── frontend/
│   ├── app/                      # Next.js 16 App Router pages
│   ├── hooks/                    # React Query data hooks
│   ├── components/               # UI components
│   └── lib/apiConfig.ts          # API base URL config
└── infra/
    ├── docker-compose.yml        # Full stack — 14 services
    └── prometheus.yml            # Prometheus scrape config
```

---

## License

MIT — free for personal, portfolio, and commercial use with attribution.

## Author

Built with FastAPI, Next.js, Groq, and Qdrant.  
Issues and PRs welcome at [github.com/bilalinbytes/quantara](https://github.com/bilalinbytes/quantara).
