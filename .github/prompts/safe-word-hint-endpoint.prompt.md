---
description: Add GET /api/safe-word-hint so the frontend reset-password page can show a user's security question
---

# Task: add the safe word hint lookup endpoint

The frontend ([the-achievers-frontend](../../../the-achievers-frontend)) already calls this endpoint from `GET /reset-pass/hint` in `src/app.ts`. Build the backend side so it matches that contract exactly. Do not change the frontend.

## Contract (must match)

`GET /api/safe-word-hint?email=<email>`

| Case | Status | Body |
| --- | --- | --- |
| User exists and has a hint | 200 | `{ "safeWordHint": "first-pet" }` |
| Unknown email, or user has no hint (`safeWordHint` is `null`) | 404 | `{ "error": "..." }` |
| Missing or invalid `email` query | 400 | `{ "error": "..." }` |

- `safeWordHint` is the stored identifier (`mothers-maiden-name`, `favourite-movie`, `first-pet`, `childhood-friend`, `holiday`), not the question text. The frontend maps it to the question.
- Never return `safeWordHash`, `passwordHash`, or any other user field.
- Send `Cache-Control: no-store`, as `loginController.ts` does.
- Both 404 cases must return the same body, so the response does not reveal which case it was.

## Follow the existing layout

Mirror `src/userLogin/` (controller, service, repository). Read these first:

- `src/userLogin/loginController.ts`, `loginService.ts`, `loginRepository.ts`
- `src/dtos/loginUserDto.ts` (how request input is parsed and validated)
- `src/app.ts` and `src/index.ts` (how routers and services are wired)
- `tests/userLogin.test.ts` and `tests/helpers.ts` (test style)

## Steps

1. **Repository**: add `findSafeWordHintByEmail(email: string): Promise<string | null>` using `prisma.user.findUnique({ where, select: { safeWordHint: true } })`. Select only that column. Put it in a new `src/safeWordHint/` folder rather than extending the login repository.
2. **Service**: `getHint(email)` returns the hint or `null`.
3. **DTO**: parse the `email` query. It must be a string, trimmed, and match the same email check the login/register DTOs use. Reuse their helper if one exists.
4. **Controller**: `createSafeWordHintRouter(service)` with `router.get("/", ...)` following the status table above. Pass unexpected errors to `next(error)`.
5. **Wiring**:
   - In `src/app.ts`, add an optional trailing parameter to `createApp` (like `profile` and `orders`) so existing tests that call `createApp` do not break. Mount it at `/api/safe-word-hint`.
   - In `src/index.ts`, construct the repository and service and pass them in.
   - Check the CORS block in `app.ts` still allows a GET from the frontend origin. The frontend calls this server-to-server, so it likely needs no change.
6. **Rate limiting**: this endpoint can reveal whether an email has an account, so it needs a limit (for example 5 requests per minute per IP). Check `package.json` for an existing limiter. If none exists, ask the user before adding a dependency.
7. **Tests**: add `tests/safeWordHint.test.ts` covering 200, 404 for an unknown email, 404 for a user with a `null` hint, 400 for a missing or invalid email, that the response never contains `safeWordHash` or `passwordHash`, and the `no-store` header. Mock the repository as `userLogin.test.ts` does.

## Verify

Run `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`. Fix failures caused by these changes. Do not touch the generated Prisma client.

Then start both services (backend on port 3000, frontend per its README), register a user, open `/reset-pass` on the frontend, enter that email, press "Show hint", and confirm the question chosen at registration appears.

## Out of scope

- Verifying the safe word and changing the password. That is a separate ticket and needs its own endpoint.
- Schema changes. `User.safeWordHint` and `User.safeWordHash` already exist.
