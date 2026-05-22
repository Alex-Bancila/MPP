# Backend Explanation (Lab Talking Points)

## TL;DR
- Fastify + TypeScript + Zod + Prisma provides a lightweight, type-safe GraphQL API.
- Zod enforces predictable validation for params, query, and body.
- Prisma keeps the PostgreSQL layer typed and testable.

## Assignment requirement mapping (Backend)

### Technology choice and benchmarking
- Researched multiple frameworks and compared them on TypeScript fit, validation support, testability, RAM-only friendliness, and boilerplate cost.
- The benchmark table and justification are included below.

### Bronze mandatory (backend)
- Server-side validation for params, queries, and bodies.
- Routes separated from business logic.
- Tests for CRUD operations and validations.
- PostgreSQL persistence through Prisma.
- Server-side pagination on listing endpoints.
- Best practices of the chosen stack (Fastify + Zod + TS).

### Silver (backend)
- Fake data generator endpoints to create batches of valid entities.
- Websocket broadcast when new entities are generated.

### Gold (backend)
- GraphQL is the only exposed API (REST removed).
- 1-to-many domain relationship with CRUD and basic statistics.

## Assignment constraints addressed
- PostgreSQL persistence through Prisma.
- Strong validation for all inputs.
- Clear separation between HTTP layer and business logic.
- Seeded dev/test databases for reliable testing.

## Why Fastify
- Lightweight and fast with minimal overhead.
- Simple routing and plugin model for CORS/websocket.
- Great testability using `app.inject()` without starting a server.

## Why TypeScript
- Same language as frontend for consistent types and fewer mistakes.
- Compile-time safety for request payloads and service logic.
- Cleaner interfaces between routes, services, and the in-memory store.

## Why Zod
- Clear, centralized validation with readable error messages.
- Independent of any database layer, so it fits RAM-only constraints.
- Aligns with frontend validation patterns for consistency.

## Why PostgreSQL + Prisma
- Matches the relational domain and stats requirements.
- Keeps database access typed and explicit.
- Makes seeding and reset flows predictable for tests.

## Separation of concerns
- Routes validate and map HTTP requests.
- Services own the domain logic.
- In-memory store mirrors the database for sync and websocket state.

## Comparisons

### Express + TypeScript
- Requires more manual wiring for validation and typing.
- More boilerplate to reach the same structure.
- Fastify is faster to implement and test for this scope.

### NestJS
- Powerful but heavyweight for a small assignment.
- More setup and boilerplate than needed.
- Not ideal for a RAM-only, short-scope project.

### Django / Spring
- Robust but off-stack and heavier to run.
- Higher setup cost than a small TS backend.
- Not aligned with the frontend TypeScript stack.

## Benchmark table (summary)

| Stack | TypeScript fit | Validation | Testability | RAM-only fit | Boilerplate | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Fastify + TypeScript + Zod | 5/5 | 5/5 | 5/5 | 5/5 | 4/5 | Best balance of speed, validation, and testing |
| Express + TypeScript + Zod | 5/5 | 4/5 | 4/5 | 5/5 | 3/5 | More manual wiring for validation/testing |
| NestJS + TypeScript | 5/5 | 5/5 | 5/5 | 4/5 | 2/5 | Too much boilerplate for assignment scope |
| Django REST Framework | 2/5 | 5/5 | 5/5 | 3/5 | 3/5 | Off-stack and heavier setup |
| Spring Boot | 2/5 | 5/5 | 5/5 | 3/5 | 2/5 | Heavy and not aligned with frontend |

## Tradeoffs / limitations
- Requires a running PostgreSQL instance.
- Fastify is less common than Express, but a better fit here.
- Writing Zod schemas adds work upfront but reduces runtime bugs.

## Assignment compliance notes
- REST endpoints removed; GraphQL is the only API surface.
- Dev/test databases are reset and seeded from `initialAppState`.

## GraphQL schema summary

### Queries
- health: Boolean
- listings(category, search, status, page, pageSize): ListingConnection
- listingById(listingId): Listing
- reviewsForListing(listingId): ReviewConnection
- favouritesForUser(userId): FavouriteList
- stats: Stats
- categoriesStats: [CategoryStats]
- sellersStats(limit): [TopSeller]
- favouriteStats: FavouriteStats
- reviewStats: ReviewStats
- syncState: SyncStateResponse

### Mutations
- createListing, updateListing, deleteListing
- toggleFavourite, removeFavourite
- createReview, updateReview, deleteReview
- startGenerator, stopGenerator

## Summary line for the lab
- "Fastify + TypeScript + Zod + Prisma is the smallest, safest stack for a typed GraphQL API, and it keeps validation and data access consistent across the app."

## Implementation plan (from audit, no GitHub workflow)

### Confirm rubric
- Confirm the exact Bronze/Silver/Gold rubric so required items are explicit.

### Gap audit vs current code + UI specs
- Listings spec shows pagination, but current UI is infinite scroll in `src/pages/ListingsPage.tsx`.
- Listing detail spec includes a Gear DNA section, but it is not rendered.
- Listing/post spec includes a Condition field and photo upload area, but the model only has status and photos are URLs in a textarea.
- GraphQL coverage is minimal; expand if full CRUD or filters are required.
- Websocket sync broadcasts listing/review deltas, but favourites only update sync state.
- Review update/delete UI is not implemented even though backend supports it.

### Implementation steps if required
- Add Condition field across domain, seed data, validation, form, detail, server routes/services, and tests.
- Render Gear DNA section in listing detail using `computeGearDna` and `GearDnaCard`.
- Add stats table view and toggle if required.
- Expand GraphQL with filters and CRUD if required by rubric.
- Broadcast favourites deltas and merge them in the client store if required.
- Update docs and tests to clearly map Bronze/Silver/Gold coverage.

### Final verification
- Run `npm run typecheck`, `npm run test:run`, and `npm run server:test`.
