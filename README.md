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

Quantara is a full-stack AI financial intelligence platform that combines live market data, company fundamentals, financial statements, market news, and SEC filings with large language models to deliver conversational investment research and actionable insights — no mocked data.

**Repository:** [github.com/bilalinbytes/quantara](https://github.com/bilalinbytes/quantara) · **Demo:** [Watch on Google Drive](https://drive.google.com/file/d/1lpx3ViCeQ7w0_v1oteKPrzjUci1-gib8/view?usp=sharing)

---

## ✨ Key Features

- **17 parallel data sources** — FMP, NewsAPI.org, Yahoo Finance (fallback), SEC EDGAR
- **Multi-agent research pipeline** — 8 specialized Groq agents (Financial, News, SEC, Valuation, Technical, Macro, Risk, Portfolio) + a Lead Synthesizer producing institutional-grade reports
- **SEC filing RAG** — Qdrant vector store with fastembed embeddings for semantic search and cited answers
- **Real-time chat** — SSE token streaming with structured investment cards, evidence checklists, and citations
- **Autonomous monitoring** — Celery workers track watchlists for news/SEC events and generate daily AI briefings
- **Graceful degradation** — analysis continues even if individual data sources fail, with per-source evidence indicators
- **Production-ready security** — prompt injection guardrails, JWT + OAuth (Google/GitHub), Prometheus observability

---

## 🏗️ Architecture

```
Next.js 16 (Frontend)  ──HTTPS / REST / SSE──▶  FastAPI Backend
                                                  PostgreSQL + Redis + Celery
                                                       │
                ┌───────────────┬──────────────────────┼──────────────┐
                ▼               ▼                      ▼              ▼
          FMP / Yahoo      NewsAPI.org             Groq API        SEC EDGAR
         (Market Data)        (News)            (llama-3.3-70b)    (Filings)
                                                                       │
                                                                       ▼
                                                              Qdrant RAG (fastembed)
```

**Flow:** user asks a question → backend assembles cached company context from 17 sources → Groq generates a structured response (with rate-limit fallback) → result streams via SSE with citations and evidence → Celery workers independently monitor watchlists and index new filings.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, TanStack Query |
| **Backend** | FastAPI, Python 3.11, SQLAlchemy 2, Pydantic Settings |
| **Database** | PostgreSQL 15 |
| **Cache / Queue** | Redis 7, Celery + Beat |
| **Vector DB** | Qdrant, fastembed (`BAAI/bge-small-en-v1.5`) |
| **LLM** | Groq — `llama-3.3-70b-versatile` (+ `llama-3.1-8b-instant` fallback) |
| **Market Data** | Financial Modeling Prep, Yahoo Finance (fallback) |
| **News** | NewsAPI.org |
| **SEC Filings** | SEC EDGAR (public API) |
| **Observability** | Prometheus, Grafana, Loki, cAdvisor, node-exporter |
| **CI/CD** | GitHub Actions |
| **Deployment** | Vercel (frontend), Render / Railway / Docker (backend) |

---

## 🚀 Quickstart

### Docker (recommended)

```bash
git clone https://github.com/bilalinbytes/quantara.git
cd quantara
cp .env.example .env   # add your API keys

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
| Grafana | http://localhost:30000 |

### Manual setup

```bash
# Backend
cd backend && pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

**Required API keys:** `GROQ_API_KEY`, `NEWS_API_KEY` — see `.env.example` for the full list (FMP, OAuth, etc. are optional/recommended).

---

## 📡 API Highlights

| Endpoint | Description |
|---|---|
| `GET /companies/{ticker}/context` | Cached, multi-source company context |
| `POST /companies/{ticker}/chat/stream` | AI chat — SSE token stream |
| `POST /companies/{ticker}/research/generate` | Multi-agent research report (SSE) |
| `GET /companies/{ticker}/filings/search` | Semantic RAG search over SEC filings |
| `GET /portfolio/analytics` | Multi-ticker portfolio analytics |
| `GET /briefing` | Daily AI market briefing |

Full API reference available at `/docs` (Swagger UI) once the backend is running.

---

## 📁 Project Structure

```
quantara/
├── backend/
│   ├── main.py              # FastAPI entry point
│   └── app/
│       ├── api/              # REST routes
│       ├── ai/                # guardrails + research/SEC/agent pipelines
│       ├── services/         # context, LLM, FMP, news, RAG, cache
│       ├── worker/            # Celery monitoring & briefings
│       └── db/                # models & schema patches
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   ├── hooks/ & components/  # data hooks & UI
│   └── lib/apiConfig.ts
└── infra/
    ├── docker-compose.yml    # full 14-service stack
    └── prometheus.yml
```

---

## License

MIT — free for personal, portfolio, and commercial use with attribution.

## Author

Built with FastAPI, Next.js, Groq, and Qdrant.
Issues and PRs welcome at [github.com/bilalinbytes/quantara](https://github.com/bilalinbytes/quantara).
