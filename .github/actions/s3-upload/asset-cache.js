export function getAssetCacheHeader (bucketDir, assetName) {
  if (
    // Set cache time for non-released assets to 2 hours
    ((bucketDir && bucketDir !== '/') || !bucketDir) ||
    // Set cache time for wildcard version assets to 2 hours
    (assetName.indexOf('.x') > -1) ||
    // Set cache time for "current" loader to 2 hours
    (assetName.indexOf('-current') > -1)
  ) {
    // Set 'public' to allow intermediaries like CDNs to cache
    // Set 'max-age=7200' to cache for 2 hours
    // Set 'stale-while-revalidate=600' to allow cached responses to be used for 10 additional minutes while revalidating ETag
    // Set 'stale-if-error=600' to allow cached responses to be used for 10 additional minutes when upstream server reports an error
    return 'public, max-age=7200, stale-while-revalidate=600, stale-if-error=600'
  }

  // Set 'public' to allow intermediaries like CDNs to cache
  // Set 'max-age=31536000' to cache for 1 year
  // Set 'stale-while-revalidate=86400' to allow cached responses to be used for 1 additional day while revalidating ETag
  // Set 'stale-if-error=86400' to allow cached responses to be used for 1 additional day when upstream server reports an error
  return 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400'
}
