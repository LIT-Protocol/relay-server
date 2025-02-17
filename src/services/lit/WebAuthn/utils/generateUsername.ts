/**
 * Generates a default username for users without a specified username.
 * Format: "Usernameless user (YYYY-MM-DD HH:mm:ss)"
 *
 * @returns A formatted string containing timestamp-based username
 * @example "Usernameless user (2025-02-17 21:47:37)"
 */
export function generateTimestampBasedUsername(): string {
  const date = new Date();
  return `Usernameless user (${date
    .toISOString()
    .slice(0, 19)
    .replace("T", " ")})`;
}
