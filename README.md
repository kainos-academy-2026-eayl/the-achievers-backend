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

## Local development

Ensure `.env` has a valid `DATABASE_URL`, then start PostgreSQL and the API:

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