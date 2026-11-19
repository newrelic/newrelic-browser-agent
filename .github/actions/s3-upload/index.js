import fs from 'fs'
import path from 'path'
import * as core from '@actions/core'
import { S3Client, HeadObjectCommand, PutObjectCommand, NotFound } from '@aws-sdk/client-s3'
import mime from 'mime-types'
import { getAssetCacheHeader } from '../shared-utils/asset-cache.js'
import { isCreateOnly, compareWithExisting, isPreconditionFailed } from '../shared-utils/s3-create-only.js'
import { args } from './args.js'

/* Credentials come from the default provider chain, populated by the OIDC login step in action.yml */
const s3Client = new S3Client({ region: args.region })

const uploadCommandParams = (await fs.promises.readdir(args.input, { withFileTypes: true }))
  .filter(file => file.isFile())
  .map(file => {
    const params = {
      Bucket: args.bucket,
      Key: file.name,
      localPath: path.resolve(args.input, file.name),
      ContentType: mime.lookup(file.name) || 'application/javascript',
      CacheControl: getAssetCacheHeader(args.dir, file.name)
    }

    if (typeof args.dir === 'string' && args.dir.trim() !== '') {
      let dirPath = args.dir.trim()

      if (dirPath.endsWith('/')) {
        dirPath = dirPath.slice(0, -1)
      }

      params.Key = `${dirPath}/${params.Key}`
    }

    return params
  })

/**
 * Looks at what is already in the bucket for a key.
 * @param {typeof uploadCommandParams[number]} params
 * @param {Buffer} contents The local file.
 * @returns {Promise<'missing'|'identical'|'different'>}
 */
async function checkExisting (params, contents) {
  try {
    const { ETag } = await s3Client.send(new HeadObjectCommand({ Bucket: params.Bucket, Key: params.Key }))
    return compareWithExisting(ETag, contents)
  } catch (error) {
    if (error instanceof NotFound) return 'missing'
    throw error
  }
}

/* Each file is read once: its bytes are uploaded and compared against anything already in the bucket. */
const files = await Promise.all(uploadCommandParams.map(async params => {
  const contents = await fs.promises.readFile(params.localPath)
  const createOnly = isCreateOnly(params.CacheControl)
  return { params, contents, createOnly, state: createOnly ? await checkExisting(params, contents) : 'missing' }
}))

/*
 * A versioned file that exists with different content is never replaced. One that exists with identical content was already
 * published (for example by an earlier run of a release that failed part way), so it is left alone and the run can finish.
 */
const conflicts = files.filter(file => file.state === 'different')
for (const file of conflicts) console.error(`File ${file.params.Key} already exists in the bucket with different content.`)
if (conflicts.length && !args.dry) {
  console.error('Upload failed, long-term cached files already exist with different content.')
  process.exit(1)
} else if (conflicts.length && args.dry) {
  console.warn('Upload will fail, long-term cached files already exist with different content.')
}

const uploads = await Promise.all(files.map(async ({ params, contents, createOnly, state }) => {
  const result = { Bucket: params.Bucket, Key: params.Key }
  if (state === 'identical') {
    console.log(`File ${params.Key} is already in the bucket with identical content, skipping.`)
    return { ...result, skipped: true }
  }
  if (args.dry) {
    console.log('running in dry mode, file not uploaded, params:', JSON.stringify({ ...params, Body: '[file contents]', createOnly }))
    return result
  }

  /*
   * Versioned files are written with If-None-Match: *, which the bucket policy requires and which makes S3 refuse to overwrite.
   * They are uploaded with a single PutObject because the multipart upload helper does not send the condition when it
   * completes the upload. If S3 refuses because the file appeared in the meantime, it is accepted only if identical.
   */
  const { localPath, ...putParams } = params
  try {
    const response = await s3Client.send(new PutObjectCommand({ ...putParams, Body: contents, ...(createOnly ? { IfNoneMatch: '*' } : {}) }))
    return { ...result, ETag: response.ETag }
  } catch (error) {
    if (!createOnly || !isPreconditionFailed(error)) throw error
    if (await checkExisting(params, contents) === 'identical') {
      console.log(`File ${params.Key} was created by another run with identical content, skipping.`)
      return { ...result, skipped: true }
    }
    throw new Error(`File ${params.Key} already exists in the bucket with different content.`, { cause: error })
  }
}))

/*
Output example:

[
  {
    "Bucket": "[string]",
    "Key": "ajax-aggregate-es5.js", <-- This is the bucket path and name of the object
    "ETag": "[string]",
    "skipped": true <-- Only present when the file was already in the bucket with identical content
  }
]
*/

core.setOutput('results', JSON.stringify(uploads))
console.log(`Successfully uploaded ${uploadCommandParams.length} files to S3`)
