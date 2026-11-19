import { createHash } from 'node:crypto'

/**
 * Cache-Control marker for files that are published once and cached for a year. These are the files the bucket policy only
 * allows to be created, never overwritten, so they are written with a conditional `If-None-Match: *` request.
 */
const LONG_TERM_CACHE = 'max-age=31536000'

/**
 * Whether a file is written once and must never be replaced (a versioned release file, as opposed to a mutable alias).
 * @param {string} cacheControl The Cache-Control value the file is uploaded with.
 * @returns {boolean}
 */
export function isCreateOnly (cacheControl) {
  return cacheControl.indexOf(LONG_TERM_CACHE) > 0
}

/**
 * The ETag S3 reports for a single-part, non-KMS upload of this content: the hex MD5 of the bytes, in quotes.
 * @param {Buffer|Uint8Array} contents
 * @returns {string}
 */
export function localEtag (contents) {
  return `"${createHash('md5').update(contents).digest('hex')}"`
}

/**
 * Compares the object already in the bucket with the file about to be uploaded. An ETag that is not a plain MD5 (multipart
 * or KMS-encrypted) cannot be compared, so it counts as different and the upload stops rather than assuming it is the same.
 * @param {string|undefined} existingEtag ETag of the object in the bucket.
 * @param {Buffer|Uint8Array} contents The local file.
 * @returns {'identical'|'different'}
 */
export function compareWithExisting (existingEtag, contents) {
  return existingEtag === localEtag(contents) ? 'identical' : 'different'
}

/**
 * Whether an S3 error means the conditional write was refused because the object already exists.
 * @param {{name?: string, $metadata?: {httpStatusCode?: number}}} error
 * @returns {boolean}
 */
export function isPreconditionFailed (error) {
  return error?.name === 'PreconditionFailed' || error?.$metadata?.httpStatusCode === 412
}
