# the-achievers-backend

The Achievers Backend API, built with Express, TypeScript, and Prisma.

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