# PaceTrack – Developer Task Assignment

A running tracker with live GPS and club leaderboards. Built with React + Express + MongoDB. Two developers, four weeks, one deployable app.

---

## Task ID Convention

- **W1–W4** = Week number · **FE** = Frontend · **BE** = Backend
- **Scope:** S = Small (≈0.5–1 day) · M = Medium (1–2 days) · L = Large (2+ days)
- **Developers:** You = Dev 1 (backend) · Friend = Dev 2 (frontend)

---

## Tech Stack

| Layer        | Tech                                              |
| ------------ | ------------------------------------------------- |
| Frontend     | React + TypeScript + Vite + Tailwind + React Query |
| Backend      | Node.js + Express + TypeScript                    |
| Database     | MongoDB Atlas (free M0 tier)                      |
| Auth         | JWT access token + refresh token (HTTP-only cookie) |
| Maps         | Mapbox GL JS                                      |
| File storage | AWS S3 (GPX uploads, presigned URLs)              |
| Real-time    | Socket.io (club leaderboard)                      |
| Elevation    | Open Elevation API (free, no key needed)          |
| Deploy FE    | Vercel                                            |
| Deploy BE    | Fly.io                                            |

---

## Status Summary

| Week                     | You (Backend)       | Friend (Frontend)   | Status      |
| ------------------------ | ------------------- | ------------------- | ----------- |
| W1 – Foundation          | Not started (0/5)   | Not started (0/5)   | Not started |
| W2 – Live GPS            | Not started (0/4)   | Not started (0/4)   | Not started |
| W3 – Clubs & Leaderboard | Not started (0/4)   | Not started (0/4)   | Not started |
| W4 – Deploy & Polish     | Not started (0/3)   | Not started (0/3)   | Not started |

---

## Week 1 – Foundation: Auth & Run Logging

Get users registered, logged in, and able to log a run manually. By end of week both devs have a working local environment and can hit each other's code.

**Checkpoint:** Thursday — Friend hits real auth endpoints from the frontend form.

### Backend (You)

| ID      | Task | Scope | Deps | Done |
| ------- | ---- | ----- | ---- | ---- |
| W1-BE-1 | **Project scaffold** – Init Express + TypeScript, connect MongoDB Atlas (M0 free), add `dotenv`, health check `GET /health`. Folder: `src/routes/`, `src/models/`, `src/middleware/`. | S | — | - |
| W1-BE-2 | **User model** – Mongoose schema: `id`, `email`, `passwordHash`, `firstName`, `lastName`, `createdAt`. Methods: `create`, `findByEmail`, `findById`. | S | W1-BE-1 | - |
| W1-BE-3 | **Auth API** – Hash passwords with `bcrypt`. Issue `accessToken` (15m, in response body) + `refreshToken` (7d, HTTP-only cookie). `POST /auth/register` (409 if email taken) and `POST /auth/login` (401 if wrong creds). `authMiddleware` for protected routes. | M | W1-BE-2 | - |
| W1-BE-4 | **Run model & CRUD API** – Mongoose schema: `id`, `userId`, `date`, `title`, `notes`, `distanceKm`, `durationSec`, `pace` (auto-computed on save as `durationSec / distanceKm`), `type` (easy / tempo / long / race). Routes: `POST /runs`, `GET /runs` (auth user only, paginated), `GET /runs/:id`, `PUT /runs/:id`, `DELETE /runs/:id`. | M | W1-BE-3 | - |
| W1-BE-5 | **Pace formatter** – Expose `pace` in API response as `mm:ss` string (e.g. `"5:12"`). Compute and store as raw seconds in DB. | S | W1-BE-4 | - |

### Frontend (Friend)

| ID      | Task | Scope | Deps | Done |
| ------- | ---- | ----- | ---- | ---- |
| W1-FE-1 | **Project scaffold** – Vite + React + TypeScript, Tailwind, React Router v6, Axios client with `VITE_API_URL` base URL. Folders: `src/pages/`, `src/components/`, `src/hooks/`. | S | — | - |
| W1-FE-2 | **Auth pages** – Login and Sign-up forms with Zod validation. On success store `accessToken` in memory, redirect to dashboard. Show API errors as inline messages. | M | W1-FE-1 | - |
| W1-FE-3 | **useAuth hook + ProtectedRoute** – Expose `user`, `isAuthenticated`, `login`, `logout`. On app load call `POST /auth/refresh` (cookie auto-sent); redirect to `/login` on 401. Wrap private pages in `ProtectedRoute`. | M | W1-FE-2 | - |
| W1-FE-4 | **Log a run form** – Fields: title, date, distance (km), duration (mm:ss), type (dropdown). Zod validation. `POST /runs` on submit. Show calculated pace in a result card after save. | M | W1-FE-3 | - |
| W1-FE-5 | **Run history list** – Fetch `GET /runs`, show paginated cards: title, date, distance, pace, type badge (color per type). Click card to open run detail page with all fields. | S | W1-FE-4 | - |

**Done when:** User can sign up, log in, manually log a run, and see it in their history list.

---

## Week 2 – Live GPS Tracking

The core differentiator. User opens the app, hits Start, and watches their route traced on a Mapbox map in real time. This is the hardest week — front-load risk.

**Checkpoint:** Wednesday — GPS coordinates saving to DB correctly. Thursday — route shows on map after finishing a run.

### Backend (You)

| ID      | Task | Scope | Deps | Done |
| ------- | ---- | ----- | ---- | ---- |
| W2-BE-1 | **Open Elevation API** – Service that takes `[{lat, lng}]` and returns elevation per point from the Open Elevation API (free, no key). Simple in-memory cache to avoid duplicate calls. Expose `GET /elevation?points=[[lat,lng],...]`. | S | W1-BE-4 | - |
| W2-BE-2 | **Live session endpoint** – `POST /runs/live` accepts `{ coordinates: [{lat, lng, timestamp}], startTime, endTime }`. Compute distance (haversine sum between consecutive points), duration, pace, elevation gain. Save as a new Run. Return full Run object. | M | W2-BE-1 | - |
| W2-BE-3 | **GPX upload** – `POST /upload/gpx` returns an S3 presigned PUT URL (expires 5 min). Frontend uploads directly to S3. Then `PUT /runs/:id` with `{ gpxFileUrl }` to attach file to a run. Add S3 env vars to `.env.example`. | M | W1-BE-4 | - |
| W2-BE-4 | **Run schema — add GPS fields** – Add `gpxFileUrl` (string), `elevationGainM` (number), `coordinatesCount` (number), `routeGeoJSON` (GeoJSON LineString) to Run schema. Populate from live session or GPX upload. | S | W2-BE-2, W2-BE-3 | - |

### Frontend (Friend)

| ID      | Task | Scope | Deps | Done |
| ------- | ---- | ----- | ---- | ---- |
| W2-FE-1 | **Tracking screen layout** – New page `/track`. Full-height Mapbox map with a bottom HUD showing 4 stat cards: Distance, Current Pace, Elapsed Time, Elevation. Start / Pause / Finish buttons. Mobile-first — this screen is used outdoors while running. | M | W1-FE-5 | - |
| W2-FE-2 | **Geolocation + live polyline** – On Start: `navigator.geolocation.watchPosition` every 3 seconds. Append new coordinates to local state. Draw live polyline on Mapbox as points arrive. Animate the current-position dot. Show a clear error if GPS is denied or unavailable. | M | W2-FE-1 | - |
| W2-FE-3 | **Live metric calculations** – In the browser: haversine distance sum, elapsed seconds from start time, rolling pace (average of last 500m). Every 10 new points, call `GET /elevation` to update elevation gain. Update HUD cards in real time. | M | W2-FE-2 | - |
| W2-FE-4 | **Finish run flow** – On Finish: stop watching position, show a summary dialog (distance, time, pace). Confirm → `POST /runs/live` with all coordinates. On success navigate to the saved run detail page. Show route on Mapbox from `routeGeoJSON`. Handle errors with a retry button. | S | W2-FE-3 | - |

**Done when:** User can start a live run, watch their route drawn on the map, finish, and see the saved run with distance, pace, and elevation.

---

## Week 3 – Clubs & Leaderboard

Small groups where members race each other on weekly mileage. Real-time updates with Socket.io so the leaderboard refreshes without page reload.

**Checkpoint:** Wednesday — club creation and join working. Friday — leaderboard updates live when a member saves a run.

### Backend (You)

| ID      | Task | Scope | Deps | Done |
| ------- | ---- | ----- | ---- | ---- |
| W3-BE-1 | **Club model & CRUD** – Mongoose schema: `id`, `name`, `description`, `creatorId`, `memberIds[]`, `createdAt`. Routes: `POST /clubs`, `GET /clubs/:id`, `POST /clubs/:id/join`, `DELETE /clubs/:id/leave`. All protected. | M | W1-BE-3 | - |
| W3-BE-2 | **Club leaderboard endpoint** – `GET /clubs/:id/leaderboard`: query all runs for club members in the current week (Mon–Sun), sum `distanceKm` per user, return sorted by total km descending. Include rank, firstName, weeklyKm, runCount. | M | W3-BE-1, W1-BE-4 | - |
| W3-BE-3 | **Socket.io setup** – Install `socket.io` on Express. When any club member saves a run (`POST /runs` or `POST /runs/live`), emit `leaderboard:update` to that club's Socket.io room with fresh leaderboard data. Members auto-join their club rooms on connect. | M | W3-BE-2 | - |
| W3-BE-4 | **Personal records endpoint** – `GET /stats/prs`: return fastest pace run, longest run (km), and highest weekly mileage for the auth user. Simple — just query their runs and find min/max. | S | W1-BE-4 | - |

### Frontend (Friend)

| ID      | Task | Scope | Deps | Done |
| ------- | ---- | ----- | ---- | ---- |
| W3-FE-1 | **Club pages** – `/clubs`: list user's clubs + a "Create Club" form (name, description). `/clubs/:id`: club detail with member list and a join/leave button. Loading skeletons while data fetches. | M | W3-BE-1 | - |
| W3-FE-2 | **Weekly leaderboard table** – On club detail page: table with rank, name, weekly km, run count. Highlight the current user's row in teal. Show a "👑" icon for rank 1. Fetch from `GET /clubs/:id/leaderboard`. | M | W3-BE-2 | - |
| W3-FE-3 | **Real-time updates with Socket.io** – Connect to Socket.io on club detail page. On `leaderboard:update` event, update the leaderboard table without a page refresh. Show a brief "Updated!" flash. Disconnect on page leave. | M | W3-BE-3, W3-FE-2 | - |
| W3-FE-4 | **Personal records card** – On dashboard: a small "My PRs" card showing fastest pace, longest run, and best weekly mileage. Fetch from `GET /stats/prs`. | S | W3-BE-4 | - |

**Done when:** User can create/join a club, see a weekly leaderboard, and watch it update live when a clubmate finishes a run.

---

## Week 4 – Deploy & Polish

Ship it. Both services deployed, app works end-to-end on production URLs, and the UI is clean enough to demo.

**Checkpoint:** Tuesday — both services deployed. Thursday — full end-to-end test on prod (register → track run → club leaderboard updates).

### Backend (You)

| ID      | Task | Scope | Deps | Done |
| ------- | ---- | ----- | ---- | ---- |
| W4-BE-1 | **Dockerfile + deploy to Fly.io** – Write `Dockerfile` (node:20-alpine, non-root user). `fly launch` + `fly deploy`. Set all secrets via `fly secrets set`. Confirm `GET /health` returns 200 on the Fly.io URL. | M | All BE done | - |
| W4-BE-2 | **Prod environment** – Create a prod MongoDB Atlas cluster (M0 free). Create a separate S3 prod bucket with CORS allowing PUT from the Vercel domain. Update all secrets on Fly.io. Test GPX upload end-to-end on prod. | S | W4-BE-1 | - |
| W4-BE-3 | **Bug fixes + error handling** – Make sure all routes return proper status codes (400 for bad input, 401 for unauth, 404 for not found, 500 for server errors). Add a global error handler middleware. Fix any bugs found during prod testing. | S | W4-BE-1 | - |

### Frontend (Friend)

| ID      | Task | Scope | Deps | Done |
| ------- | ---- | ----- | ---- | ---- |
| W4-FE-1 | **Deploy to Vercel** – `vercel deploy` from `front-end/`. Set `VITE_API_URL` (Fly.io URL) and `VITE_MAPBOX_TOKEN` in Vercel dashboard. Test the full flow on prod from a phone. | S | All FE done | - |
| W4-FE-2 | **UI polish** – Loading skeletons everywhere (no blank flashes). Empty states: no runs yet, no clubs joined. A 404 page. Make the tracking screen and leaderboard look good on a phone screen. | M | All FE done | - |
| W4-FE-3 | **README** – Setup instructions (clone, install, set env vars, run locally). Deploy instructions (Fly.io + Vercel). Screenshots of the tracking screen and leaderboard. Link to live demo. | S | W4-FE-1 | - |

**Done when:** App is live on Vercel + Fly.io, full flow works on prod from a phone, README has setup and demo link.

---

## API Reference

### Auth
- `POST /auth/register` — `{ firstName, lastName, email, password }` → `{ user, accessToken }` + cookie
- `POST /auth/login` — `{ email, password }` → `{ user, accessToken }` + cookie
- `POST /auth/refresh` — (cookie auto-sent) → `{ accessToken }`

### Runs
- `POST /runs` — create run manually
- `GET /runs` — paginated history (auth user only)
- `GET /runs/:id` — run detail
- `PUT /runs/:id` — update fields
- `DELETE /runs/:id` — delete
- `POST /runs/live` — save live GPS session `{ coordinates[], startTime, endTime }`
- `GET /elevation?points=[[lat,lng],...]` — elevation for coordinate array

### Uploads
- `POST /upload/gpx` — returns S3 presigned PUT URL

### Clubs
- `POST /clubs` — create club
- `GET /clubs/:id` — club detail + members
- `POST /clubs/:id/join` — join club
- `DELETE /clubs/:id/leave` — leave club
- `GET /clubs/:id/leaderboard` — weekly km rankings

### Stats
- `GET /stats/prs` — personal records (fastest pace, longest run, best week)

---

## Environment Variables

### Backend `.env`
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=some-long-random-secret
JWT_EXPIRES_IN=15m
REFRESH_SECRET=another-long-secret
REFRESH_EXPIRES_IN=7d
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=pacetrack-gpx-dev
AWS_REGION=us-east-1
PORT=8000
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:8000/api/v1
VITE_MAPBOX_TOKEN=pk.eyJ...
```

---

## Git Workflow

- **Branch from** `develop`. PRs always target `develop`. Never push to `main` directly.
- **Branch names:** `feature/W1-BE-3-auth` · `feature/W2-FE-2-live-gps` · `fix/W3-FE-3-socket-disconnect`
- **Commit format:** `feat(W1-BE-3): add JWT auth` · `fix(W2-FE-2): handle GPS permission denied`
- **PR rules:** at least 1 reviewer (each other), short description of what changed.
- **Deploy from** `main` only — merge `develop → main` when both agree a week is done.

---

## Resume Line

> *"Built a full-stack running tracker with live GPS route mapping, real-time club leaderboards via Socket.io, and GPX file uploads to AWS S3 — deployed on Vercel and Fly.io with React, Express, and MongoDB."*
