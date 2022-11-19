const withHash = /([^?#]*)[^#]*(#[^?]*|$).*/
const withoutHash = /([^?#]*)().*/

/**
 * Cleans a provided URL of query params leaving only the protocol, hostname,
 * port, and pathname. If the URL contains a hash, it is also removed unless
 * keepHash is true.
 */
export function cleanURL (url?: string | null, keepHash = false): string {
  if (typeof url !== "string" || url.trim().length === 0) {
    return "";
  }

  return url.replace(keepHash ? withHash : withoutHash, '$1$2')
}
