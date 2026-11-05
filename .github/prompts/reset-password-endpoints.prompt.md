---
description: Add POST /api/reset-password/verify and POST /api/reset-password so the frontend reset-password page can verify a safe word and change a password
---

# Task: add the safe word verification and password reset endpoints

The frontend ([the-achievers-frontend](../../../the-achievers-frontend)) already calls these endpoints from `src/clients/resetPasswordClient.ts`. Build the backend side so it matches that contract exactly. Do not change the frontend. The contract is also documented in the frontend README under "Password reset".

## Contract (must match)

### `POST /api/reset-password/verify`

Body: `{ "email": "...", "safeWord": "..." }`

| Case | Status | Body |
| --- | --- | --- |
| Email exists and the safe word matches its stored hash | 204 | none |
| Unknown email, user has no safe word hash, or wrong safe word | 401 | `{ "error": "..." }` (identical for all three) |
| Malformed body (missing or non-string field, invalid email, blank safe word, safe word over 128 characters) | 400 | `{ "error": "..." }` |
| Too many attempts | 429 | `{ "error": "..." }` |

### `POST /api/reset-password`

Body: `{ "email": "...", "safeWord": "...", "newPassword": "..." }`

| Case | Status | Body |
| --- | --- | --- |
| Safe word matches and the password is changed | 204 | none |
| Unknown email, no safe word hash, or wrong safe word | 401 | `{ "error": "..." }` (identical for all three) |
| Malformed body or password outside 12 to 128 characters | 400 | `{ "error": "..." }` (shown to the user) |
| Too many attempts | 429 | `{ "error": "..." }` |

Rules for both:

- Check the safe word with `argon2.verify(user.safeWordHash, safeWord)` on **both** endpoints. The frontend sends the safe word twice on purpose, so a skipped verify step can never reset a password.
- Hash the new password exactly as registration does: `argon2.hash(password, { type: argon2.argon2id })`, using the same injectable hasher as `UserService`.
- Never return `passwordHash`, `safeWordHash`, or any other user field.
- Send `Cache-Control: no-store`, as `safeWordHintController.ts` does.
- Both 401 cases must return the same status and body so the response does not reveal whether an email has an account.
- Never log the safe word, the new password, or the email.

## Follow the existing layout

Mirror `src/safeWordHint/` (controller, service, repository) and `src/userLogin/`. Read these first:

- `src/safeWordHint/safeWordHintController.ts`, `safeWordHintService.ts`, `safeWordHintRepository.ts`
- `src/dtos/safeWordHintQueryDto.ts` and `src/dtos/registerUserDto.ts` (input parsing, `MAX_SAFE_WORD_LENGTH`, the email check)
- `src/userRegistration/userService.ts` (argon2 usage and the injectable hasher)
- `src/rateLimit.ts`, `src/app.ts`, `src/index.ts` (wiring)
- `tests/safeWordHint.test.ts` and `tests/helpers.ts` (test style)

## Steps

1. **Replace the stub.** `src/resetPass/` currently holds an unmounted controller whose `resetPassword` import does not exist, plus two empty files, and it never checks the safe word. Delete those three files and use a new `src/resetPassword/` folder (plural folder name matching the other modules) with `resetPasswordController.ts`, `resetPasswordService.ts` and `resetPasswordRepository.ts`. Remove the old `src/resetPass/` folder so nothing is left half-built.
2. **DTOs.** Add `src/dtos/verifySafeWordDto.ts` (email, safeWord) and `src/dtos/resetPasswordDto.ts` (email, safeWord, newPassword), each with a parse function returning `{ success: true, data } | { success: false, message }` like the existing DTOs. Reuse the email check and `MAX_SAFE_WORD_LENGTH`. Add `MIN_PASSWORD_LENGTH = 12` and `MAX_PASSWORD_LENGTH = 128` constants, reusing any the register DTO already defines. Do not trim passwords or the safe word; trim only the email.
3. **Repository.** `findCredentialsByEmail(email)` selecting only `safeWordHash` (and `id`), and `updatePasswordHash(email, passwordHash)` using `prisma.user.update`. Put them in `resetPasswordRepository.ts` behind an interface so tests can mock it.
4. **Service.** `ResetPasswordService` with:
   - `verifySafeWord(email, safeWord): Promise<boolean>`
   - `resetPassword(email, safeWord, newPassword): Promise<boolean>` (false when the safe word does not match; only then call `updatePasswordHash`)
   - Inject the password hasher like `UserService`.
   - When the user or hash is missing, still run one dummy `argon2.verify` against a fixed hash so response time does not reveal whether the email exists.
5. **Controller.** `createResetPasswordRouter(service)` with `router.post("/verify", ...)` and `router.post("/", ...)` following the status tables. Set `no-store` first, parse with the DTO, map `false` to 401, and pass unexpected errors to `next(error)`.
6. **Wiring.**
   - In `src/app.ts`, add an optional trailing parameter to `createApp` (after `safeWordHintService`) so existing tests still pass. Mount at `/api/reset-password`.
   - In `src/index.ts`, build the repository and service and pass them in.
   - The frontend calls server-to-server, so CORS needs no change.
7. **Rate limiting.** The existing limiter keys on `req.ip`, and every request here comes from the frontend server, so a per-IP limit throttles all users together while still letting an attacker guess one account's low-entropy safe word. Extend `createRateLimiter` with an optional `keyBy(req)` function (default stays `req.ip`) and key these routes on the lowercase trimmed `email` from the body, for example 5 attempts per 15 minutes. Keep existing limiter tests passing. Do not add a dependency; if one seems needed, ask first.
8. **Tests.** Add `tests/resetPassword.test.ts` mocking the repository as `safeWordHint.test.ts` does. Cover:
   - verify: 204, 401 wrong safe word, 401 unknown email, 401 user without hash, identical 401 bodies, 400 for each malformed input, `no-store`, 429 after the limit
   - reset: 204 and the stored hash is a new argon2id hash (not the plain password), 401 without calling `updatePasswordHash`, 400 for a short or long password, a second reset with a wrong safe word leaves the hash unchanged
   - no response ever contains `safeWordHash`, `passwordHash` or the plain password
   - the user can log in with the new password through the real `LoginService` (use the existing helpers), and not with the old one
9. **Docs.** Add both endpoints to the backend README next to the safe-word-hint section.

## Verify

Run `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`. Fix failures caused by these changes. Do not touch the generated Prisma client.

Then run an end-to-end check with both servers (backend on 3000, frontend per its README):

1. Register a user with a known safe word.
2. Open `/reset-pass`, enter the email and a wrong safe word, press Submit, and confirm "The email or safe word is incorrect."
3. Enter the right safe word, press Submit, and confirm the New password and Confirm new password fields appear.
4. Submit a new 12+ character password and confirm you land on `/login` with the reset message.
5. Log in with the new password; confirm the old one is rejected.

## Out of scope

- Email-based reset tokens (KAN-15 in the old TICKETS.md describes those; this flow uses the safe word instead).
- Invalidating existing sessions or JWTs after a reset.
- Schema changes. `User.safeWordHash` and `User.passwordHash` already exist.
- Changing the existing `GET /api/safe-word-hint` behaviour.
