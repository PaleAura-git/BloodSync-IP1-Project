import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

/**
 * Shape of errors this handler understands. All properties beyond the
 * standard `Error` interface are optional because not all error types
 * carry them — the handler checks for each before using it.
 */
interface AppError extends Error {
  /** HTTP status code set by custom error classes (ValidationError, etc.) */
  statusCode?: number;
  /** MongoDB error code — 11000 signals a unique-index violation */
  code?: number;
  /** Duplicate-key field/value map populated by Mongoose on code 11000 */
  keyValue?: Record<string, unknown>;
  /** Field-level validation messages from Mongoose schema validators */
  errors?: Record<string, { message: string }>;
  /** The invalid value that triggered a CastError */
  value?: unknown;
}

/**
 * Response body shape for all error responses.
 * `details` and `stack` are only populated in development mode.
 */
interface ErrorResponse {
  success: false;
  error: string;
  /** Internal error name / context — development only */
  details?: unknown;
  /** Full stack trace — development only */
  stack?: string;
}

/**
 * Global Express error-handling middleware.
 *
 * Must be registered as the **last** middleware in `server.ts` so that errors
 * forwarded via `next(err)` from any route or middleware end up here.
 *
 * ## Error classification (in priority order)
 *
 * | Source                     | Condition                        | Status | Response message            |
 * |----------------------------|----------------------------------|--------|-----------------------------|
 * | Custom `AppError` subclass | `err.statusCode` is set          | varies | `err.message` verbatim      |
 * | Mongoose `CastError`       | `err.name === 'CastError'`       | 400    | "Invalid ID format: …"      |
 * | Mongoose duplicate key     | `err.code === 11000`             | 409    | "{field} already registered"|
 * | Mongoose `ValidationError` | `err.name === 'ValidationError'` | 400    | All field messages joined   |
 * | JWT `TokenExpiredError`    | `instanceof TokenExpiredError`   | 401    | "Token expired" message     |
 * | JWT `JsonWebTokenError`    | `instanceof JsonWebTokenError`   | 401    | "Invalid token" message     |
 * | Everything else            | fallthrough                      | 500    | "Internal Server Error"     |
 *
 * In `NODE_ENV === 'development'` the response also includes `details`
 * (the error name) and `stack` to speed up debugging without leaking them
 * to production clients.
 */
const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log every error with enough context for monitoring/debugging
  const timestamp = new Date().toISOString();
  console.error(
    `[ERROR] ${timestamp} ${req.method} ${req.path} — ${err.name}: ${err.message}`
  );

  // Initialise with the error's own status code, falling back to 500
  let statusCode = err.statusCode ?? 500;
  let message = err.message || 'Internal Server Error';

  // ── Mongoose: invalid ObjectId string (e.g. "abc" passed where an ID is expected) ──
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format: '${String(err.value)}'`;
  }

  // ── Mongoose: unique-index violation (e.g. duplicate email on registration) ──
  if (err.code === 11000 && err.keyValue) {
    statusCode = 409; // 409 Conflict is semantically correct for uniqueness violations
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    message = `${field} '${String(value)}' is already registered`;
  }

  // ── Mongoose: schema validation failure (required field missing, enum mismatch, etc.) ──
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    // Join all field-level messages into one readable string
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join('. ');
  }

  // ── JWT: token has passed its `exp` claim ──
  // Separate from generic JsonWebTokenError so the client can distinguish
  // "token expired — please refresh" from "token tampered — please log in again"
  if (err instanceof TokenExpiredError) {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again';
  }

  // ── JWT: token signature invalid, payload malformed, or wrong algorithm ──
  if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  const response: ErrorResponse = {
    success: false,
    error: message,
  };

  // Expose internal details only in development — never leak stack traces to production
  if (process.env.NODE_ENV === 'development') {
    response.details = err.name;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
