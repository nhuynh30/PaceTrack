import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
    statusCode?: number;
}

// Not-found handler — mount after all routes
export function notFound(req: Request, res: Response, _next: NextFunction): void {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

// Global error handler — mount last
export function errorHandler(
    err: AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    const status = err.statusCode ?? 500;
    const message = status === 500 ? 'Internal server error' : err.message;

    if (status === 500) {
        console.error('Unhandled error:', err);
    }

    res.status(status).json({ error: message });
}