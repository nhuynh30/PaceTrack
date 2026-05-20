import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
    res.json({
        name: 'PaceTrack API',
        version: '1.0.0',
        status: 'running',
        routes: {
            health: 'GET /api/v1/health',
            auth: {
                register: 'POST /api/v1/auth/register',
                login: 'POST /api/v1/auth/login',
                refresh: 'POST /api/v1/auth/refresh',
            },
            runs: {
                create: 'POST /api/v1/runs',
                list: 'GET /api/v1/runs',
                get: 'GET /api/v1/runs/:id',
                update: 'PUT /api/v1/runs/:id',
                delete: 'DELETE /api/v1/runs/:id',
                saveLive: 'POST /api/v1/runs/live',
            },
            elevation: 'GET /api/v1/elevation',
            uploads: {
                gpx: 'POST /api/v1/upload/gpx',
            },
            clubs: {
                create: 'POST /api/v1/clubs',
                get: 'GET /api/v1/clubs/:id',
                join: 'POST /api/v1/clubs/:id/join',
                leave: 'DELETE /api/v1/clubs/:id/leave',
                leaderboard: 'GET /api/v1/clubs/:id/leaderboard',
            },
            stats: {
                personalRecords: 'GET /api/v1/stats/prs',
            },
        },
    });
});

export default router;
