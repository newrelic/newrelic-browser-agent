import { isCreateOnly, localEtag, compareWithExisting, isPreconditionFailed } from '../../../.github/actions/shared-utils/s3-create-only'
import { getAssetCacheHeader } from '../../../.github/actions/shared-utils/asset-cache'

describe('isCreateOnly', () => {
  test.each([
    ['nr-loader-spa-1.324.1.min.js'],
    ['nr-full-standard-1.324.1.stats.json']
  ])('is true for the versioned file %s', name => {
    expect(isCreateOnly(getAssetCacheHeader('', name))).toBe(true)
  })

  test.each([
    ['nr-loader-spa-current.min.js', ''],
    ['nr-loader-spa-1.x.x.min.js', ''],
    ['nr-loader-spa-1.324.x.min.js', ''],
    ['nr-loader-spa-1.324.1.min.js', 'experiments/abc']
  ])('is false for the mutable or experiment file %s in %s', (name, dir) => {
    expect(isCreateOnly(getAssetCacheHeader(dir, name))).toBe(false)
  })
})

describe('compareWithExisting', () => {
  const contents = Buffer.from('console.log("agent")')

  test('is identical when the ETag is the quoted MD5 of the contents', () => {
    expect(compareWithExisting(localEtag(contents), contents)).toBe('identical')
  })

  test('is different when the content differs', () => {
    expect(compareWithExisting(localEtag(Buffer.from('other')), contents)).toBe('different')
  })

  test('is different for an ETag that is not a plain MD5, such as a multipart upload', () => {
    expect(compareWithExisting('"0123456789abcdef0123456789abcdef-3"', contents)).toBe('different')
  })

  test('is different when there is no ETag', () => {
    expect(compareWithExisting(undefined, contents)).toBe('different')
  })
})

describe('isPreconditionFailed', () => {
  test('recognises the error by name', () => {
    expect(isPreconditionFailed({ name: 'PreconditionFailed' })).toBe(true)
  })

  test('recognises the error by HTTP status', () => {
    expect(isPreconditionFailed({ name: 'Other', $metadata: { httpStatusCode: 412 } })).toBe(true)
  })

  test('does not treat other errors as a refused conditional write', () => {
    expect(isPreconditionFailed({ name: 'AccessDenied', $metadata: { httpStatusCode: 403 } })).toBe(false)
    expect(isPreconditionFailed(undefined)).toBe(false)
  })
})
