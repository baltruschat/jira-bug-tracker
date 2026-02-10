/**
 * Generate a random state parameter for CSRF protection in OAuth flows.
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate that the received state matches the stored state.
 */
export function validateState(stored: string, received: string): boolean {
  if (!stored || !received) return false;
  return stored === received;
}

/**
 * Generate a UUID v4 string.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
