// Errors that are safe to show to users. Algorithms and utilities throw
// UserError with a friendly message; anything else is an unexpected bug and
// is replaced by a generic message instead of a raw JavaScript error.

export class UserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserError';
  }
}

export function friendlyError(err, fallback = 'Something went wrong while processing this request. Please check your input and try again.') {
  if (err instanceof UserError) return err.message;
  return fallback;
}
