# Electro Mart - E-commerce Platform

## Overview

Electro Mart is a full-stack e-commerce website for selling electronics in Algeria. It features a public-facing storefront with product browsing, a shopping cart, and a checkout flow using Cash on Delivery (COD) as the only payment method. There is also a protected admin panel for managing products and orders. Prices are displayed in Algerian Dinar (DZD) and the checkout form includes all 58 Algerian wilayas.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter (lightweight client-side router, not React Router)
- **State Management**: 
  - Server state: TanStack React Query for all API data fetching, caching, and mutations
  - Cart state: Zustand with localStorage persistence (`use-cart.ts`)
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Animations**: Framer Motion for page transitions and hero animations
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`
- **Styling**: Tailwind CSS with CSS variables for theming. Dark theme with orange primary color (`hsl(28, 100%, 50%)`). Custom fonts: Outfit (body) and Space Grotesk (headings)

### Backend
- **Framework**: Express 5 on Node.js, running on a standard HTTP server
- **Language**: TypeScript, executed with `tsx` in development
- **API Pattern**: RESTful JSON API under `/api/*` prefix. Routes are defined in `shared/routes.ts` as a typed API contract object used by both client and server
- **Authentication**: Passport.js with Local Strategy, using express-session backed by PostgreSQL (`connect-pg-simple`). Passwords hashed with scrypt. Session-based auth (not JWT despite the initial spec mentioning it)
- **Authorization**: Role-based — users have a `role` field (`admin` or `user`). Admin routes check `req.user?.role === "admin"`
- **Build**: Custom build script using Vite for client and esbuild for server, outputting to `dist/`

### Database
- **Database**: PostgreSQL (required, accessed via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for automatic Zod schema generation from table definitions
- **Schema** (in `shared/schema.ts`):
  - `users` — id, username, password (hashed), role, createdAt
  - `products` — id, name, description, category, price (decimal), oldPrice, stock, images (jsonb array of URLs), specifications (jsonb key-value), isFeatured, createdAt
  - `orders` — id, customerName, phone, wilaya, address, totalPrice, items (jsonb array of {productId, quantity, price}), status (Pending/Confirmed/Shipped/Delivered), createdAt
- **Migrations**: Use `drizzle-kit push` (`npm run db:push`) to sync schema to database

### Shared Code (`shared/` directory)
- `schema.ts` — Drizzle table definitions, Zod insert schemas, and TypeScript types. Shared between client and server
- `routes.ts` — Typed API route definitions with paths, methods, input schemas, and response schemas. Acts as a contract between frontend and backend. Includes a `buildUrl` helper for parameterized routes

### Key Pages
- `/` — Home page with hero section, featured products, category browsing
- `/product/:id` — Product detail page with image gallery, specs table, add to cart
- `/checkout` — Checkout form (name, phone, wilaya selector, address) creating orders via COD
- `/login` — Admin login page
- `/admin` — Protected admin dashboard with tabs for managing orders and products

### Development vs Production
- **Development**: Vite dev server with HMR proxied through Express (`server/vite.ts`)
- **Production**: Static files served from `dist/public` with SPA fallback (`server/static.ts`)

## External Dependencies

- **PostgreSQL** — Primary database. Must be provisioned and `DATABASE_URL` environment variable set
- **connect-pg-simple** — Session storage in PostgreSQL
- **Google Fonts** — Outfit and Space Grotesk fonts loaded via CDN
- **Replit Plugins** — `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` (dev only, conditional on `REPL_ID`)
- **No external payment gateway** — Cash on Delivery only
- **No external image hosting** — Product images stored as URL arrays in the database (demo images from Unsplash or similar)
- **Environment Variables Required**:
  - `DATABASE_URL` — PostgreSQL connection string (required)
  - `SESSION_SECRET` — Session encryption secret (falls back to hardcoded default)