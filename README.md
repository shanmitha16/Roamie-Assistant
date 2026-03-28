# Roamie — AI Travel Companion

> **Hackathon Demo** — Full-stack AI travel companion built from scratch

## Quick Start

### Prerequisites
- **Node.js** 18+
- **Ollama** (optional — app works with curated fallback data)

### 1. Install
```bash
npm install
cd apps/api && npm install
cd ../web && npm install
```

### 2. Database Setup
```bash
cd apps/api
npx prisma migrate dev --name init
npm run seed
```

### 3. Run
```bash
# From root — runs both API and frontend
npm run dev
```

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001

### Demo Login
```
Email: demo@roamie.app
Password: password123
```

---

## Features

### 🗓️ Smart Itinerary Agent
- AI-generated day-by-day itinerary (Ollama or curated fallback)
- Calendar gap detection with activity suggestions
- Breathing room auto-insertion for over-packed days
- 50 curated places across 5 cities: Mumbai, Singapore, London, New York, Tokyo
- Document checklist and cultural nudges per city

### 🛡️ Disruption Shield (Flagship)
- 7-step disruption resolution in under 3 seconds
- 3 scored alternative flights with real-time comparison
- Auto-adjusted hotel check-in and cab booking
- QR boarding pass generation (fully local)
- Supports: cancelled, delayed, missed connection

### 💰 Expense Scanner
- AI-powered receipt categorization (Ollama with regex fallback)
- Supports 5 currencies: USD, EUR, GBP, JPY, INR
- Category breakdown with interactive donut chart
- Full expense history with totals

### 🌐 Multilingual + Local Intelligence
- 5 languages: English, Hindi, Spanish, French, Japanese
- Real-time language switching
- Accept-Language header support
- Cultural nudges per destination

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS v4 |
| State | Zustand |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (Prisma ORM) — swap to Postgres via env |
| AI | Ollama (local LLM) with curated fallbacks |
| Auth | JWT with refresh token rotation |
| Security | Helmet, CORS, rate limiting, Zod validation |
| i18n | i18next, react-i18next |

## Architecture

Clean Architecture (Hexagonal / Ports & Adapters):
```
src/
├── domain/         # Entities + Interfaces (Ports)
├── use-cases/      # Business Logic
├── adapters/       # Controllers + Services (Adapters)
│   ├── controllers/
│   ├── services/
│   └── repositories/
├── infrastructure/  # Express, Config, Middleware
└── data/           # Static datasets (flights, places, itineraries)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh JWT |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/profile` | Update profile |
| GET | `/api/trips` | List trips |
| POST | `/api/trips` | Create trip |
| GET | `/api/trips/:id` | Get trip details |
| POST | `/api/trips/:id/flights` | Add flight |
| POST | `/api/trips/:id/hotels` | Add hotel |
| POST | `/api/itinerary/build` | Build AI itinerary |
| GET | `/api/itinerary/days/:tripId` | Get itinerary days |
| POST | `/api/disruption/trigger` | **Trigger Disruption Shield** |
| POST | `/api/expense/scan` | Scan receipt |
| GET | `/api/expense/list` | List expenses |

---

## 90-Second Demo Script

1. **Login** (5s) — Pre-filled demo credentials → Sign In → Preferences → Start Exploring
2. **Dashboard** (15s) — Show Singapore itinerary, Day 1-3 tabs, breathing room badges, gap suggestions
3. **Disruption Shield** (40s) — Show flight card → Click "Simulate Disruption" → Watch detection banner → 3 alternatives animate in → Auto-selected with amber glow → Confirm → QR slide-up
4. **Expenses** (15s) — Paste receipt text → Watch AI categorize with typing animation → See donut chart update
5. **Language Switch** (10s) — Switch to Hindi → All text re-renders → Switch to Japanese → Everything works
6. **Architecture callout** (5s) — Mention Clean Architecture, 6 DB models, JWT, rate limiting

---

## Environment Variables

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
DATABASE_URL=file:./dev.db
JWT_SECRET=your_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_minimum_32_characters
FRONTEND_URL=http://localhost:5173
PORT=3001
```
