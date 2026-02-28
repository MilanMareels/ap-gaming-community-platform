# AP Gaming Hub — Development Setup

## Prerequisites

- **Node.js** (v20+)
- **Docker** (for PostgreSQL)
- **Google OAuth credentials** (from [Google Cloud Console](https://console.cloud.google.com/apis/credentials))

## 1. Database

Start PostgreSQL via Docker Compose:

```bash
docker-compose up -d
```

This starts a PostgreSQL 17 instance on port **5432** (user: `apgaming`, password: `supersecretpassword`, db: `apgaming`).

## 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
DATABASE_URL="postgresql://apgaming:supersecretpassword@localhost:5432/apgaming"
JWT_SECRET_KEY=<random-string>
SESSION_SECRET_KEY=<random-string>
SWAGGER_ENABLED=true

GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

Run database migrations:

```bash
npx prisma migrate dev
```

Start the dev server (port **3001**):

```bash
npm run start:dev
```

## 3. Frontend

```bash
cd frontend
npm install
```

Generate API types from the running backend's Swagger spec:

```bash
npm run struct
```

> This requires the backend to be running — it fetches `http://localhost:3001/swagger-json`.

Start the dev server (port **3000**):

```bash
npm run dev
```

The Next.js config proxies `/api/*` requests to the backend at `localhost:3001`.

## Quick Reference

| What                | Command                  | Port |
| ------------------- | ------------------------ | ---- |
| Database            | `docker-compose up -d`   | 5432 |
| Backend             | `npm run start:dev`      | 3001 |
| Frontend            | `npm run dev`            | 3000 |
| API type generation | `npm run struct`         | —    |
| Prisma migrations   | `npx prisma migrate dev` | —    |
| Swagger UI          | Browse `/swagger`        | 3001 |
