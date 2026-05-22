# Assignment 2 demo checklist

## Tier mapping (client + backend)

| Tier | Requirements |
| --- | --- |
| **Bronze** | Landing, master/detail listings CRUD, validation, unit tests, REST API + benchmark doc |
| **Silver** | Statistics page (charts + rankings), Browse/Statistics tabs, Playwright E2E (≥3 flows), activity cookies, Faker generator (start/stop) |
| **Gold** | Full navigation between pages, **side-by-side category table + charts on `/stats`** that update together on CRUD, responsive layout, animations, Gear DNA (Bazinga), GraphQL + infinite scroll + reviews 1-to-many |

## Before the demo

1. From `client/`: `docker compose up -d`
2. `npm run prisma:migrate` and `npm run prisma:seed`
3. `npm run server:dev` then `npm run dev`

## Bronze

- REST: Postman [`rest-api.postman_collection.json`](rest-api.postman_collection.json) or [`rest-api.http`](rest-api.http)
- `npm run server:test`

## Silver

- `/listings` ↔ `/stats` tabs (spec page 07)
- Cookies: DevTools → `music-core.activity` (category, search, layout, route)
- `/stats` → **Start generator** (live listings via WebSocket)
- E2E: `npm run e2e` (auth, CRUD, cookies, stats sync, generator, offline queue)

## Gold

- `/stats`: **Category Breakdown** table left, **pie + bar** charts right — add a demo listing on the same page; counts and charts update together
- `/listings`: Cards/Table toggle + infinite scroll (cards)
- Listing detail: **Gear DNA** radar for seller inventory
- Navigate: login → listings → detail → stats → messages (transitions on `mc-main`)

## Tests

```bash
npm run test:run
npm run server:test
npm run e2e
```
