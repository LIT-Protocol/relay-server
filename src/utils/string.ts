/**
 * String utility functions
 */

/**
 * Extracts the domain from a URL string
 * @param url URL string to parse
 * @returns The hostname from the URL
 */
export function getDomainFromUrl(url: string): string {
  const parsedUrl = new URL(url);
  return parsedUrl.hostname;
} 