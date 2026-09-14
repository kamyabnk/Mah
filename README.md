# MAH Candle Co. - E-commerce Platform

A bilingual (English/Farsi) Next.js e-commerce platform for MAH Candle Co. (مه کندل).

## Prerequisites

- **Node.js 20+** - Download from [nodejs.org](https://nodejs.org/)
- **Docker** - Download from [docker.com](https://www.docker.com/)

## Quick Start

1. **Start the database:**

   ```bash
   docker compose up -d
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `ADMIN_AUTH_SECRET`, and `CUSTOMER_AUTH_SECRET` (see [Environment Variables](#environment-variables) below).

4. **Run database migrations:**

   ```bash
   npm run db:migrate
   ```

   This also generates the Prisma client. The application will not build or run correctly against a fresh `npm install` until this has run at least once (see `npm run db:generate` if you only need to regenerate the client).

5. **Start the development server:**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`, which redirects to the default locale at `/en`. The Persian locale is available at `/fa`.

6. **Run tests:**
   ```bash
   npm test
   ```

## Production Docker Image

```bash
docker build -t mah-candle .
```

produces a production-ready standalone image (multi-stage build: install → `prisma generate` + `next build` → minimal Alpine runtime). Run it with the same environment variables as above, published on port 3000:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://mah:mah_dev_password@host.docker.internal:5432/mah_candle?schema=public" \
  -e ADMIN_AUTH_SECRET="..." \
  -e CUSTOMER_AUTH_SECRET="..." \
  mah-candle
```

Use `host.docker.internal` (or a container network) to reach the `docker compose`-managed Postgres instance from inside the app container.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio

## Environment Variables

Create a `.env` file in the root directory. See `.env.example` for required variables:

- `DATABASE_URL` - PostgreSQL connection string
- `ADMIN_AUTH_SECRET` - Secret for admin authentication (minimum 32 characters)
- `CUSTOMER_AUTH_SECRET` - Secret for customer authentication (minimum 32 characters)

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (via Prisma)
- **Auth:** NextAuth (separate admin and customer realms)
- **i18n:** next-intl (English `/en` and Persian `/fa`, locale-aware routing via middleware)
- **Styling:** Tailwind CSS v4 design tokens + custom UI primitives
- **Validation:** Zod
- **Testing:** Vitest
- **Linting:** ESLint
- **Formatting:** Prettier
- **Deployment:** Docker (standalone Next.js output)
