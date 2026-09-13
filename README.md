# MAH Candle Co. - E-commerce Platform

A bilingual (English/Farsi) Next.js e-commerce platform for MAH Candle Co. (مه کندل).

## Prerequisites

- **Node.js 20+** - Download from [nodejs.org](https://nodejs.org/)
- **Docker** - Download from [docker.com](https://www.docker.com/)

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the database:**

   ```bash
   docker compose up -d
   ```

3. **Run database migrations:**

   ```bash
   npm run db:migrate
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

5. **Run tests:**
   ```bash
   npm test
   ```

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

- **Framework:** Next.js 16
- **Language:** TypeScript
- **Database:** PostgreSQL (via Prisma)
- **Validation:** Zod
- **Testing:** Vitest
- **Linting:** ESLint
- **Formatting:** Prettier
