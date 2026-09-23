# Deployment

This project is easiest to deploy as two services:

- **MongoDB Atlas** for the database
- **Render** for the Express backend
- **Vercel** for the Vite frontend

## 1. Prepare MongoDB Atlas

1. Create an Atlas project and a database deployment. Use a deployment that supports replica sets because transfers use MongoDB transactions.
2. Create a database user and copy the connection string.
3. Add the backend hosting provider's outbound access. For a first Render deployment, Atlas Network Access can temporarily allow `0.0.0.0/0`; restrict this later if your hosting setup supports fixed egress IPs.

## 2. Deploy the backend to Render

Create a **Web Service** from this repository with:

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/healthz`

Important: enter only the command text in Render fields. Use `npm ci`, not
`Build Command: npm ci`. Also set the service runtime to **Node**. If Render
shows Python, it is using the repository root instead of `backend`.

The repository includes `render.yaml` with these settings. You can deploy from
that Blueprint, or configure the Web Service manually as shown above.

Set these environment variables in Render. Do not commit their values:

```text
NODE_ENV=production
MONGODB_CONNECTION_STRING=mongodb+srv://...
JWT_SECRET=<long-random-secret>
CORS_ORIGIN=https://<your-frontend>.vercel.app
EMAIL_USER=<optional Gmail sender>
CLIENT_ID=<optional Google OAuth client id>
CLIENT_SECRET=<optional Google OAuth client secret>
REFRESH_TOKEN=<optional Gmail OAuth refresh token>
```

Render supplies `PORT` automatically. The email variables are optional for the ledger, but registration and transaction notification emails will not work without them.

After deployment, verify `https://<your-backend>/healthz` returns HTTP 200 and reports `"database":"connected"`. Copy the backend URL for the frontend step.

## 3. Deploy the frontend to Vercel

Import the same repository as a Vercel project with:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

If Vercel is configured with the repository root (`/`) as its Root Directory,
the root `vercel.json` automatically runs the equivalent commands from the
`frontend` folder. The preferred dashboard setting is still `frontend`.

Set this environment variable before building:

```text
VITE_API_URL=https://<your-backend>/api
```

The included `frontend/vercel.json` keeps React Router routes working when a user refreshes a deep link.

## 4. Finish the cross-origin setup

1. Copy the final Vercel production URL into the backend's `CORS_ORIGIN` value.
2. Redeploy/restart the backend after changing it.
3. Open the Vercel URL and test registration, login, account creation, and a transfer.
4. Confirm browser requests include credentials and that login persists after a refresh. Production auth cookies require HTTPS, `NODE_ENV=production`, and the exact frontend origin.

## Local verification

```bash
cd backend
npm ci
npm start

cd ../frontend
npm ci
npm run build
```

For local development, keep `backend/.env` and `frontend/.env` based on their respective `.env.example` files. Never commit either real `.env` file.