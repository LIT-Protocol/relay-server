import { logger } from "./logger";

export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (err) {
      // Ensure we have an Error instance with preserved details
      const error = err instanceof Error ? err : new Error(String(err), { cause: err });
      // Log the error object directly so that the stack is preserved
      logger.error(
        error,
        `Error in asyncHandler for function: ${fn.name || "anonymous"}`
      );
      throw error;
    }
  }) as T;
}
