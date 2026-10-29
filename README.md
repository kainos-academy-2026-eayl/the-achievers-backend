# the-achievers-backend

The Achievers Backend API, built with Express, TypeScript, and Prisma.

## Jira ticket to pull request

The portable [`ticket` skill](./.github/skills/ticket/SKILL.md) drafts a branch
name, commit message, and copy-ready PR description with these sections:
Requirement, Why, Changes, Testing, and Risks / reviewer focus.

In VS Code Copilot Chat, type `/ticket` and select the skill, then paste the
Jira URL, title, acceptance criteria, and any implementation or test results:

```text
/ticket <Jira ticket URL>
ACAD-142: Validate task titles before saving
Titles must be 1-100 characters after trimming.
Invalid input returns 400 and saves nothing; valid input returns 201.
Implementation: <what actually changed, or "not implemented yet">
Testing: <actual commands and results, or "not run">
```

For this example, the suggested names would be:

```text
Branch: feature/ACAD-142-task-title-validation
Commit: ACAD-142 Validate task titles before saving
```

Jira access is not required: paste the ticket details if no Jira integration
is available. The skill does not implement changes, run tests, create branches,
or open PRs. It labels planned work and unverified tests honestly.

### Use in the frontend repository

Copy the entire [ticket skill folder](./.github/skills/ticket/) into
`.github/skills/ticket/` at the frontend repository root. From this backend
repository, replace `/path/to/frontend` with the actual frontend path:

```sh
mkdir -p /path/to/frontend/.github/skills/ticket
cp .github/skills/ticket/SKILL.md /path/to/frontend/.github/skills/ticket/SKILL.md
```

Open the frontend repository in VS Code and invoke `/ticket` there. The skill
uses that repository's context and test scripts, with no backend-specific
dependencies. If it does not appear immediately, run **Developer: Reload
Window** from the Command Palette, then type `/ticket` again.

## User registration

`POST /api/register` accepts a JSON body containing `name`, `email`, and
`password`:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "a-long-example-password"
}
```

Passwords must be 12 to 128 characters. Email addresses are normalized to
lowercase, and passwords are stored as Argon2id hashes. A successful request
returns `201` with the user's email, name, and creation time; the password hash
is never returned. Invalid input returns `400`; an email already in use returns
`409`.

The endpoint is organized into controller, service, repository, DTO, and mapper
layers under `src/`.

## User login

`POST /API/login` accepts a JSON body containing `email` and `password`:

```json
{
  "email": "ada@example.com",
  "password": "a-long-example-password"
}
```

Emails are trimmed and lowercased; passwords are verified against the stored
Argon2id hash without trimming. Success returns `200` with:

```json
{
  "accessToken": "<signed JWT>",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "email": "ada@example.com",
    "name": "Ada Lovelace",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Invalid input returns `400`. Unknown emails and incorrect passwords both return
`401` with `{"error":"Invalid email or password"}`. Passwords and hashes are never
returned or included in the JWT.

Set `JWT_SECRET` in your local environment before starting the API. Generate a
random secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
Use the generated value for `JWT_SECRET`; never commit it. The API requires at
least 32 bytes and fails at startup if the secret is missing or too short.

Tokens use HS256, expire after one hour, and identify the user by their internal
ID in `sub`. The issuer is `the-achievers-backend` and audience is
`the-achievers-api`. Keep the secret stable across restarts and private to trusted
servers. This endpoint issues tokens only: existing routes remain public. Future
protected routes must verify signature, algorithm, issuer, audience, and expiry
before trusting a token. Use HTTPS and login rate limiting before public deployment.
For an Express/Nunjucks frontend, keep the token in its server-side session rather
than exposing it to browser scripts.

## Local development

Ensure `.env` has a valid `DATABASE_URL`, `PORT`, and `JWT_SECRET`, then start
PostgreSQL and the API:

```sh
docker compose up -d
npm run dev
```

Database schema changes are managed with Prisma migrations in `prisma/migrations/`.
Users have an auto-incrementing integer `id` primary key, and email addresses
remain unique. The ID is internal and is not included in registration responses.
The ID migration preserves existing users and assigns each one an ID.

Apply pending migrations and regenerate the Prisma client before starting the API:

```sh
npx prisma migrate deploy
npx prisma generate
```

### Seeding products and the admin account

Run the Prisma seed with `ADMIN_PASSWORD` set to create or update the shared
admin account in [prisma/admin.seed.json](./prisma/admin.seed.json). The committed
seed file contains only the admin email and name; provide the password through
the environment and never commit it:

```sh
ADMIN_PASSWORD='a-strong-password' npx prisma db seed
```

Without `ADMIN_PASSWORD`, admin seeding is skipped while product seeding still
runs.

## Shopping cart

The API defaults to **http://localhost:3000** (`PORT` can override this).
The frontend can stay on **http://localhost:8000**. Browser requests from that
origin are allowed, including preflight requests with `X-Cart-Id`. Set
`FRONTEND_ORIGIN` if the frontend uses a different origin.

Every cart request must include `X-Cart-Id` containing the browser's cart UUID.
Generate it once in the frontend (for example, with `crypto.randomUUID()`) and
reuse it for that browser's cart. This is an anonymous cart identifier, not
user authentication; keep it private and use HTTPS outside local development.

| Method | Endpoint | JSON body | Behaviour |
| --- | --- | --- | --- |
| GET | `/api/cart` | None | Retrieve the cart |
| POST | `/api/cart/items` | `{"productId":"cue-1","quantity":1}` | Add units, incrementing an existing item |
| PATCH | `/api/cart/items/:productId` | `{"quantity":3}` | Set an existing item's quantity |
| DELETE | `/api/cart/items/:productId` | None | Remove an item (safe to repeat) |

All four endpoints return HTTP `200` with the current cart. No `country` or
`postcode` query parameters are required or validated:

```json
{
  "items": [
    {
      "product": {
        "id": "cue-1",
        "name": "Pro Series Maple Cue",
        "price": 89.99
      },
      "quantity": 2
    }
  ],
  "estimatedShippingCost": 0
}
```

Product IDs must match products in the database; `cue-1` above is illustrative.
Names and current prices always come from the backend product database, never
the browser. Prices are stored as integer pence and returned as numeric GBP
pounds with at most two decimal places. `estimatedShippingCost` is also returned
as numeric GBP pounds with at most two decimal places. The backend calculates
shipping from the cart's item prices and quantities.

Standard shipping is £4.99 (499 pence), free only when the subtotal is strictly
greater than £50.00 (5000 pence). Exactly £50.00 still pays £4.99; an empty cart
has no shipping cost. Calculate totals in integer pence, converting each unit
price to pence before multiplying by quantity.
The shared backend rule is
[`calculateShippingCostPence`](./src/shipping.ts), which takes a `bigint` subtotal
in pence and an `isEmpty` flag (a non-empty cart with only zero-priced items
still pays shipping). There are currently no checkout or order-total paths;
future backend order totals must use this function to match the cart page.
No shipping zones, rates tables, or destination fields exist in the database,
so this shipping change requires no migration.

A new or empty cart returns HTTP `200` with
`{"items":[],"estimatedShippingCost":0}`; the frontend uses this to display
its empty-cart message.

Quantities must be integers from `1` to `2147483647`, including the resulting
quantity after adding units. Use DELETE, not quantity zero, to remove a product.
Missing/invalid cart UUIDs, invalid quantities and malformed bodies return `400`.
Unknown products and PATCH requests for items not in that cart return `404`.
Products without a valid price cannot be added or updated (`409`); GET also
returns `409` if an existing item no longer has a valid price, but it can still
be removed. Errors use `{"error":"message"}`.

Carts with items persist in PostgreSQL as `Cart` records. Each cart's products
are represented by `CartItem` join records, which keep the per-product
quantity; they use a composite key of cart UUID and product ID. Adds use an
atomic increment to avoid lost updates from concurrent requests. Deleting a
cart or product also removes its cart items.

The schema is in [prisma/schema.prisma](./prisma/schema.prisma), and the cart
migrations are
[20261022110000_add_cart_items/migration.sql](./prisma/migrations/20261022110000_add_cart_items/migration.sql)
and
[20261022130000_add_carts/migration.sql](./prisma/migrations/20261022130000_add_carts/migration.sql).
The latter backfills cart records from existing cart items before adding the
cart-item relation. Apply pending migrations using the commands above before
starting the updated API. No seed changes are required.

Example request:

```sh
curl 'http://localhost:3000/api/cart' \
  -H 'X-Cart-Id: 8d0822af-42b7-4358-8dcd-88eabb610a30'
```

### Cart tests

`npm test` runs the cart HTTP contract and validation tests alongside the
existing tests.
