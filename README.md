# Bank Transaction System — Backend Ledger

A double-entry ledger backend for a simple banking system, built with Express and
MongoDB. Every money movement is recorded as an immutable pair of ledger entries
(`DEBIT` + `CREDIT`) inside an atomic MongoDB transaction, so account balances are
always reconcilable against the ledger.

## Features

- JWT-based auth (register / login / logout) with `httpOnly` cookies
- One account per user, with balance, status and currency
- Money transfers between accounts, idempotent via an `idempotencyKey`
- Atomic transfers using MongoDB multi-document transactions (no partial writes)
- Immutable, append-only ledger (updates and deletes are blocked at the model level)
- System-user endpoint for seeding initial funds
- Email notifications (registration + transactions) via nodemailer + Gmail OAuth2

## Requirements

- **Node.js** 18+ (uses Express 5 and Mongoose 9)
- **MongoDB** as a **replica set** — transactions require it.
  MongoDB Atlas satisfies this by default; a standalone local `mongod` does **not**.
- A **Gmail account with OAuth2 credentials** for email notifications (optional for
  core ledger functionality, but the email service will log errors without it).

## Tech stack

| Concern   | Library |
|-----------|---------|
| Server    | express |
| Database  | mongoose (MongoDB) |
| Auth      | jsonwebtoken, bcryptjs / bcrypt, cookie-parser |
| Email     | nodemailer |
| Config    | dotenv |

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file and fill in the values
cp .env.example .env

# 3. Start the server (listens on port 3000)
node server.js
```

> There is no `start` script defined yet. You can add one to `package.json`:
> `"scripts": { "start": "node server.js" }`

## Environment variables

See [`.env.example`](.env.example) for the full list. Summary:

| Variable                     | Purpose |
|------------------------------|---------|
| `MONGODB_CONNECTION_STRING`  | MongoDB replica-set connection URI |
| `JWT_SECRET`                 | Secret used to sign JWTs |
| `CLIENT_ID` / `CLIENT_SECRET`| Google OAuth2 credentials for email |
| `REFRESH_TOKEN`              | Google OAuth2 refresh token |
| `EMAIL_USER`                 | Gmail sender address |

`.env` is git-ignored — never commit real secrets.

## Project structure

```
server.js                     # entrypoint, starts the HTTP server
src/
  app.js                      # express app, DB connect, route wiring
  config/db.js                # mongoose connection
  models/
    user.model.js             # User (hashed password, email)
    account.model.js          # Account (balance, status, currency)
    transaction.model.js      # Transaction (idempotencyKey, status)
    ledger.model.js           # Immutable ledger entries (DEBIT/CREDIT)
  controller/                 # auth / account / transaction handlers
  middleware/auth.middleware.js  # authenticateToken + SystemUser guards
  routes/                     # /api/auth, /api/accounts, /api/transactions
  services/email.service.js   # nodemailer notifications
```

## API reference

All protected routes accept the JWT either as an `httpOnly` cookie named `token`
or an `Authorization: Bearer <token>` header.

### Auth — `/api/auth`

| Method | Path        | Auth | Body | Description |
|--------|-------------|------|------|-------------|
| POST   | `/register` | –    | `{ name, email, password }` | Create a user, returns a token cookie |
| POST   | `/login`    | –    | `{ email, password }`       | Log in, returns a token cookie |
| POST   | `/logout`   | –    | –                            | Clears the token cookie |

### Accounts — `/api/accounts`

| Method | Path                  | Auth        | Description |
|--------|-----------------------|-------------|-------------|
| POST   | `/`                   | user        | Create the caller's account (one per user) |
| GET    | `/`                   | user        | List all accounts |
| GET    | `/all`                | system user | List all accounts (privileged alias) |
| GET    | `/balance/:accountId` | user        | Get the balance of the caller's account |

### Transactions — `/api/transactions`

| Method | Path                     | Auth        | Body | Description |
|--------|--------------------------|-------------|------|-------------|
| POST   | `/`                      | user        | `{ fromAccountId, toAccountId, amount, idempotencyKey }` | Transfer between accounts |
| POST   | `/system/initial-funds`  | system user | `{ toAccountId, amount, idempotencyKey }` | Seed initial funds into an account |

**Transfer rules**

- `amount` must be a positive number; account IDs must be valid ObjectIds.
- The caller must own the source account.
- Self-transfers are rejected.
- Repeated calls with the same `idempotencyKey` return the original result instead
  of double-spending.

## Notes

- Balances are updated atomically alongside the ledger entries; if any step fails
  the whole transfer rolls back.
- Ledger entries cannot be updated or deleted — the model throws on any such attempt.
- A "system user" is a `User` with `systemUser: true`; only they can seed initial
  funds or hit the privileged account listing.
