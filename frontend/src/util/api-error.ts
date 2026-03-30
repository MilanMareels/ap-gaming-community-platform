/**
 * Extracts a human-readable error message from an API error response.
 * Handles both string and string[] message formats from NestJS.
 */
export function getApiErrorMessage(error: { message?: string | string[] } | undefined, fallback = 'Something went wrong'): string {
  if (!error?.message) return fallback;

  if (Array.isArray(error.message)) {
    return error.message.join(', ');
  }

  return error.message;
}
