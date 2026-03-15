import { Response } from 'express';

/**
 * Standardised response envelope for successful operations.
 *
 * All successful API responses share the same top-level shape so clients
 * can handle them uniformly:
 * ```json
 * { "success": true, "message": "...", "data": { ... } }
 * ```
 * `message` and `data` are both optional — some responses (e.g., toggles)
 * only need one of them.
 */
interface SuccessEnvelope<T> {
  success: true;
  message?: string;
  data?: T;
}

/**
 * Standardised response envelope for errors.
 *
 * `details` is only populated in development mode to aid debugging without
 * leaking internal information to production clients.
 */
interface ErrorEnvelope {
  success: false;
  error: string;
  /** Internal error name / extra context — development only */
  details?: unknown;
  /** Full stack trace — development only */
  stack?: string;
}

/**
 * Sends a successful JSON response with a consistent envelope.
 *
 * @param res - Express response object.
 * @param data - The payload to include under the `data` key. Pass `undefined`
 *   when the response has no body (e.g., a toggle that just returns a flag).
 * @param message - Optional human-readable description of what succeeded.
 * @param statusCode - HTTP status code (defaults to 200; use 201 for creation).
 * @returns The Express `Response` (so callers can optionally chain).
 *
 * @example
 * return successResponse(res, { donor }, 'Donor profile created', 201);
 * return successResponse(res, undefined, 'Donation cancelled');
 */
export function successResponse<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200
): Response {
  const body: SuccessEnvelope<T> = { success: true };
  if (message !== undefined) body.message = message;
  if (data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
}

/**
 * Sends an error JSON response with a consistent envelope.
 *
 * Prefer throwing a typed error class (from `utils/errors.ts`) over calling
 * this directly — the global error handler will produce the same envelope
 * automatically. Use this function only when you need to respond with an error
 * outside of a `try/catch` context (e.g., early-return validation guards).
 *
 * @param res - Express response object.
 * @param message - User-facing description of what went wrong. Should be
 *   clear and actionable, without leaking internal details.
 * @param statusCode - HTTP status code (defaults to 500).
 * @param details - Additional debugging context. Only included in the
 *   response body when `NODE_ENV === 'development'`.
 * @returns The Express `Response`.
 *
 * @example
 * return errorResponse(res, 'Blood type is required', 400);
 * return errorResponse(res, 'Internal error', 500, err);
 */
export function errorResponse(
  res: Response,
  message: string,
  statusCode = 500,
  details?: unknown
): Response {
  const body: ErrorEnvelope = { success: false, error: message };

  // Only expose debug details in development to avoid information leakage
  if (process.env.NODE_ENV === 'development' && details !== undefined) {
    body.details = details;
  }

  return res.status(statusCode).json(body);
}
