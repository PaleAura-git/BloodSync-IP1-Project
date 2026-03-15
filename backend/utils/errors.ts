/**
 * Application-specific HTTP error classes.
 *
 * Throwing one of these from any controller or middleware causes the global
 * error handler (`middleware/errorHandler.ts`) to respond with the matching
 * HTTP status code and the error message verbatim — no extra wrapping needed.
 *
 * All classes extend `AppError`, which extends the native `Error`, so normal
 * `instanceof` checks and stack traces work correctly.
 *
 * Usage:
 * ```ts
 * throw new NotFoundError('Donor not found');
 * throw new ValidationError('Age must be between 18 and 65');
 * ```
 */

/**
 * Base class for all application-defined HTTP errors.
 * Attaches an HTTP `statusCode` so the global handler can use it directly.
 *
 * Note: `Object.setPrototypeOf` is required to restore the prototype chain
 * when extending built-in classes in TypeScript — without it `instanceof`
 * checks on subclasses would silently return false.
 */
export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    // Restore prototype chain broken by TypeScript's ES5 class transpilation
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 400 Bad Request — request body or params failed validation.
 *
 * Use when the request is structurally correct (parseable JSON, valid route)
 * but the data values are unacceptable (wrong type, out of range, missing
 * required field, etc.).
 *
 * @example
 * if (age < 18) throw new ValidationError('Donor must be at least 18 years old');
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

/**
 * 401 Unauthorized — missing, expired, or invalid credentials.
 *
 * Use when the JWT is absent, tampered with, or past its expiry. Note that
 * HTTP 401 means "unauthenticated" (the standard name is misleading).
 *
 * @example
 * if (!token) throw new AuthenticationError('No token provided');
 */
export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * 403 Forbidden — authenticated but insufficient permissions.
 *
 * Use when the caller is logged in but is trying to access a resource or
 * perform an action reserved for a different user type (e.g., a donor trying
 * to access a hospital-only endpoint).
 *
 * @example
 * if (user.userType !== 'HOSPITAL') throw new AuthorizationError('Hospitals only');
 */
export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * 404 Not Found — requested resource does not exist in the database.
 *
 * @example
 * const donor = await Donor.findById(id);
 * if (!donor) throw new NotFoundError('Donor not found');
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict — request conflicts with existing data.
 *
 * Use when the operation would violate a uniqueness constraint, such as
 * registering with an email address that is already in use, or trying to
 * create a second donor profile for the same user account.
 *
 * @example
 * if (existing) throw new ConflictError('A donor profile already exists for this account');
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}
