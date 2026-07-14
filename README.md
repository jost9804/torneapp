# TorneApp

Cross-platform app for organizing amateur sports tournaments. First supported sport: 11-a-side football.

Runs on **Android**, **iOS** and **web** from a single codebase.

## Features (demo)

- Create tournaments and register teams
- Upload tournament rules as PDF
- Automatic fixture generation (round-robin)
- Match results with per-player goals
- Standings table and top scorers, computed automatically

## Stack

| Layer | Tech |
|-------|------|
| Mobile & web | Expo (React Native) + TypeScript + Expo Router + TanStack Query |
| API | NestJS (modular monolith) + Prisma |
| Database | PostgreSQL 16 |
| Infra | Docker Compose |

## Project structure

```
apps/
├── mobile/   # Expo app (Android, iOS, web)
└── api/      # NestJS REST API
docker-compose.yml
docs/
```

## Getting started

### API + database

```bash
docker compose up -d --build
```

The API is served at `http://localhost:3000`. Health check: `GET /health`.

For local API development without Docker:

```bash
cd apps/api
cp .env.example .env   # point DATABASE_URL at your postgres
npm install
npx prisma migrate dev
npm run start:dev
```

### Mobile / web app

```bash
cd apps/mobile
npm install
npm run web       # web browser
npm run android   # Android (Expo Go or dev build)
npm run ios       # iOS (Expo Go or dev build)
```

Set the API base URL in `apps/mobile/.env` (see `.env.example`).

## License

MIT
