# Bank Ledger — Frontend

Animated React dashboard for the Bank Transaction System backend.

## Stack

| Layer      | Tech |
|------------|------|
| Base       | React 19 + Vite |
| Styling    | Tailwind CSS v4 |
| Components | shadcn/ui (+ 21st.dev registry) |
| Animation  | Motion (Framer Motion) |
| Icons      | lucide-react |
| Toasts     | sonner |
| Routing    | react-router-dom |

## Run it

The backend must be running first (on `http://localhost:3000`) and its CORS
`origin` must match this app's dev URL (`http://localhost:5173`).

```bash
# terminal 1 — backend (from the project root)
node server.js

# terminal 2 — frontend (from ./frontend)
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Environment

`.env` sets the API base URL:

```
VITE_API_URL=http://localhost:3000/api
```

## How auth works here

The backend sets an **httpOnly cookie** on login. Every request in
[`src/lib/api.js`](src/lib/api.js) sends `credentials: "include"` so that cookie
flows automatically — that's why the backend needs `cors({ credentials: true })`.
The logged-in user object is cached in `localStorage` only to survive page
refreshes; the cookie is the real source of truth.

## Project structure

```
src/
  lib/api.js              # all backend calls in one place
  context/AuthContext.jsx # login / register / logout + user state
  components/
    AuthLayout.jsx        # shared shell for auth screens
    ProtectedRoute.jsx    # redirects to /login when signed out
    CountUp.jsx           # animated balance counter
    ui/                   # shadcn components (button, card, input, …)
  pages/
    Login.jsx
    Register.jsx
    Dashboard.jsx         # balance card + transfer form + create-account
```

## Screens vs backend endpoints

| Screen | Endpoint |
|--------|----------|
| Register | `POST /api/auth/register` |
| Login | `POST /api/auth/login` |
| Create account | `POST /api/accounts/` |
| Dashboard balance | `GET /api/accounts/balance/:accountId` |
| Transfer money | `POST /api/transactions/` |

Still to build (system-user only): initial funds
(`POST /api/transactions/system/initial-funds`) and all-accounts list
(`GET /api/accounts/all`).

## Adding components

### shadcn/ui

```bash
npx shadcn@latest add dialog table avatar dropdown-menu
```

### 21st.dev

21st.dev is a registry of **shadcn-compatible** components (many with built-in
animations). Because shadcn is already configured here (`components.json`), you
install a 21st.dev component with the same CLI — just pass its registry URL:

```bash
npx shadcn@latest add "https://21st.dev/r/<author>/<component-name>"
```

On [21st.dev](https://21st.dev): find a component you like → click **Code** →
copy the `npx shadcn add "..."` command it gives you → run it here. The files
land in `src/components/` and use the same Tailwind tokens as the rest of the app.

> The 21st.dev "Magic" MCP (AI component generation) needs a separate API key
> and MCP setup — the CLI-URL method above needs nothing extra.
