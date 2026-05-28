# 🎵 Wrapd

> Tu Spotify Wrapped, **365 días al año**. Análisis honesto de lo que escuchas, con insights reales y un share card que vas a querer publicar.

[![Next.js 15](https://img.shields.io/badge/next.js-15-black)](https://nextjs.org)
[![Python](https://img.shields.io/badge/worker-python-3776ab)](https://python.org)
[![Postgres](https://img.shields.io/badge/db-postgres-336791)](https://postgresql.org)
[![Spotify](https://img.shields.io/badge/api-spotify-1ed760)](https://developer.spotify.com)

---

## ✨ Qué es

Wrapd es una **PWA mobile-first** que se conecta a tu cuenta de Spotify y construye **tu historial musical real**: top tracks/artistas por período, heatmap de cuándo escuchas, evolución de géneros, insights mensuales y un **share card** exportable.

## 🏗️ Arquitectura

```mermaid
flowchart LR
    A[Spotify Web API] -->|OAuth + recently played| W[Python Worker<br/>Prefect · cada 10min]
    W --> DB[(PostgreSQL<br/>Supabase)]
    DB --> N[Next.js 15 PWA<br/>Server Components]
    N --> U[Usuario]
    N -->|@vercel/og| S[Share Card<br/>PNG 1080x1920]
```

**Decisión:** monorepo con **frontend Next.js** y **worker Python separado**. La ingesta vive aislada del UI → si el worker se cae, la web sigue mostrando datos cacheados; si la web se cae, la ingesta sigue acumulando.

## 📁 Estructura

```
wrapd/
├── apps/
│   ├── web/                # Next.js 15 · App Router · Tailwind v4
│   └── worker/             # Python · Prefect · Spotipy
├── packages/
│   └── db/                 # Schemas SQL compartidos (raw + marts)
└── docs/                   # Diagramas, decisiones, etc.
```

## 🚀 Quick start

```bash
# 1. Web
cd apps/web
npm install
cp .env.example .env.local  # rellena con tus credenciales
npm run dev                 # → http://localhost:3000

# 2. DB schema (sobre Supabase)
psql $POSTGRES_URL -f packages/db/schemas/01_raw.sql
psql $POSTGRES_URL -f packages/db/schemas/02_marts.sql

# 3. Worker
cd apps/worker
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python -m wrapd_worker.flows  # ingesta manual de tu cuenta
```

## 🧰 Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Web | Next.js 15 (App Router) + TypeScript | Server Components → fetch directo a Postgres, sin API REST innecesaria |
| Estilos | Tailwind v4 + Framer Motion | DX óptima, animaciones declarativas |
| DB | PostgreSQL (Supabase free tier) | Hosted, dashboard SQL incluido, auth built-in si la queremos |
| Worker | Python 3.11 + Prefect 2 + Spotipy + SQLAlchemy | Retries declarativos, scheduling, observabilidad |
| Share card | @vercel/og | Edge-rendered PNG, 0 dependencias en cliente |
| Hosting | Vercel (web) + Render/Railway (worker) | Free tier para arrancar |

## 🗺️ Roadmap

- [x] **Phase 1 — Foundation** · Scaffold, OAuth, schema, login flow
- [ ] **Phase 2 — Ingesta v0** · Worker manual + dedupe
- [ ] **Phase 3 — Ingesta v1** · Prefect schedule + multi-usuario + refresh tokens
- [ ] **Phase 4 — Analytics + UI** · Vistas SQL + Home + Top
- [ ] **Phase 5 — Insights** · Heatmap + genre evolution + cards algorítmicas
- [ ] **Phase 6 — Share + Deploy** · @vercel/og + landing + post LinkedIn

## 📐 Modelo de datos

**Capa RAW** (ingesta cruda):
- `raw.plays` — un row por play (track + artist + timestamp), evento idempotente

**Capa MARTS** (analítica):
- `marts.top_tracks_by_period` — top tracks 1d/7d/30d/1y por usuario
- `marts.top_artists_by_period` — idem para artistas
- `marts.hourly_heatmap` — counts por (hour_of_day, day_of_week)
- `marts.genre_monthly` — % de tiempo por género por mes

## 📝 Licencia

MIT
