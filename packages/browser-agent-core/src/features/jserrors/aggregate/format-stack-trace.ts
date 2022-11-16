export const MAX_STACK_TRACE_LENGTH = 65530;

/**
 * Formats a stack trace array back into a string. If the stack trace array contains more than 100 entries,
 * the output will contain the first and last 50 entries separated by a truncation message.
 */
export function formatStackTrace(stackLines: string[]): string {
  let filteredStackLines = stackLines.filter(
    (line) => typeof line === "string" && line.trim().length > 0
  );

  if (filteredStackLines.length > 100) {
    return [
      ...stackLines.slice(0, 50),
      "< ...truncated " + (stackLines.length - 100) + " lines... >",
      ...stackLines.slice(-50),
    ].join("\n");
  }

  return filteredStackLines.join("\n");
}

/**
 * Truncates a stack trace string to a max length of 65530 max characters.
 */
export function truncateSize(stackString: string): string {
  if (stackString.length > MAX_STACK_TRACE_LENGTH) {
    return stackString.slice(0, MAX_STACK_TRACE_LENGTH);
  }

  return stackString;
}
