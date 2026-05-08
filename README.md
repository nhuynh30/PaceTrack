# 🏃 PaceTrack

A personal running tracker with live GPS route mapping and real-time club leaderboards. Log your runs, race your friends, and watch the leaderboard update the moment someone finishes a run.

Built as a full-stack project by two CS students in one month.

---

## Features

- **Live GPS Tracking** — Start a run and watch your route traced on a Mapbox map in real time. Pace, distance, and elevation update as you move.
- **Run History** — Log runs manually or save live sessions. Browse your history with pace, distance, and run type at a glance.
- **Club Leaderboards** — Create or join a club with friends. Compete on weekly mileage with a leaderboard that updates live via Socket.io the moment a clubmate finishes a run.
- **GPX Upload** — Upload `.gpx` files from a GPS watch (Garmin, Apple Watch) and attach them to any run.
- **Personal Records** — Track your fastest pace, longest run, and best weekly mileage automatically.

---

## Tech Stack

| Layer      | Tech                              |
| ---------- | --------------------------------- |
| Frontend   | React, TypeScript, Vite, Tailwind |
| Backend    | Node.js, Express, TypeScript      |
| Database   | MongoDB Atlas                     |
| Maps       | Mapbox GL JS                      |
| Real-time  | Socket.io                         |
| Storage    | AWS S3                            |
| Deploy     | Vercel (frontend) · Fly.io (backend) |

---

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (free M0 tier)
- Mapbox account (free tier)
- AWS account (S3 bucket)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/pacetrack.git
cd pacetrack
```

### 2. Set up the backend

```bash
cd back-end
npm install
cp .env.example .env   # fill in your values
npm run dev            # runs on http://localhost:8000
```

### 3. Set up the frontend

```bash
cd front-end
npm install
cp .env.example .env   # fill in your values
npm run dev            # runs on http://localhost:5173
```

### Environment Variables

**`back-end/.env`**
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret
JWT_EXPIRES_IN=15m
REFRESH_SECRET=your-refresh-secret
REFRESH_EXPIRES_IN=7d
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=pacetrack-gpx
AWS_REGION=us-east-1
PORT=8000
```

**`front-end/.env`**
```
VITE_API_URL=http://localhost:8000/api/v1
VITE_MAPBOX_TOKEN=pk.eyJ...
```

---

## Deployment

| Service | Platform | Command |
| ------- | -------- | ------- |
| Frontend | Vercel | `vercel deploy` from `front-end/` |
| Backend | Fly.io | `fly deploy` from `back-end/` |

Set the same environment variables in each platform's dashboard before deploying.

---

## Project Structure

```
pacetrack/
├── back-end/
│   ├── src/
│   │   ├── routes/       # Express route handlers
│   │   ├── models/       # Mongoose schemas
│   │   └── middleware/   # Auth, error handling
│   └── .env.example
└── front-end/
    ├── src/
    │   ├── pages/        # Route-level components
    │   ├── components/   # Reusable UI components
    │   └── hooks/        # Custom React hooks
    └── .env.example
```

---

## Authors

- **Dev 1 (You)** — Backend, API, database
- **Dev 2 (Friend)** — Frontend, UI, maps

---

## License

MIT
