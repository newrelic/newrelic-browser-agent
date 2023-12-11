import fs from 'fs'
import path from 'path'
import * as core from '@actions/core'
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts'
import { S3Client, HeadObjectCommand, NotFound } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import mime from 'mime-types'
import { getAssetCacheHeader } from '../shared-utils/asset-cache.js'
import { args } from './args.js'

const stsClient = new STSClient({ region: args.region })
const s3Credentials = await stsClient.send(new AssumeRoleCommand({
  RoleArn: args.role,
  RoleSessionName: 'uploadToS3Session',
  DurationSeconds: 900
}))

const s3Client = new S3Client({
  region: args.region,
  credentials: {
    accessKeyId: s3Credentials.Credentials.AccessKeyId,
    secretAccessKey: s3Credentials.Credentials.SecretAccessKey,
    sessionToken: s3Credentials.Credentials.SessionToken
  }
})

const uploadCommandParams = (await fs.promises.readdir(args.input, { withFileTypes: true }))
  .filter(file => file.isFile())
  .map(file => {
    const params = {
      Bucket: args.bucket,
      Key: file.name,
      Body: fs.createReadStream(path.resolve(args.input, file.name), {
        encoding: 'utf-8'
      }),
      ContentType: mime.lookup(file.path) || 'application/javascript',
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

const existingFiles = await Promise.all(uploadCommandParams
  .filter(params => params.CacheControl.indexOf('max-age=31536000') > 0)
  .map(async params => {
    const command = new HeadObjectCommand({
      Bucket: params.Bucket,
      Key: params.Key
    })

    try {
      await s3Client.send(command)

      console.error(`File ${params.Key} already exists in the bucket.`)
      return true
    } catch (error) {
      if (error instanceof NotFound) {
        return false
      }

      console.error(error)
      return true
    }
  })
)

if (existingFiles.includes(true) && !args.dry) {
  console.error('Upload failed, long-term cached files already exist.')
  process.exit(1)
} else if (existingFiles.includes(true) && args.dry) {
  console.warn('Upload will fail, long-term cached files already exist.')
}

const uploads = await Promise.all(uploadCommandParams
  .map(params => {
    if (args.dry) {
      console.log('running in dry mode, file not uploaded, params:', JSON.stringify({
        ...params,
        Body: '[file stream]'
      }))
      return Promise.resolve()
    }

    const upload = new Upload({
      client: s3Client,
      params
    })

    upload.on("httpUploadProgress", (progress) => {
      console.log(progress);
    });

    return upload.done();
  })
)

/*
Output example:

[
  {
    "$metadata": {
      "httpStatusCode": 200,
      "requestId": "[string]",
      "extendedRequestId": "[string]",
      "attempts": 1,
      "totalRetryDelay": 0
    },
    "ETag": "[string]",
    "ServerSideEncryption": "[string]",
    "Bucket": "[string]",
    "Key": "ajax-aggregate-es5.js", <-- This is the bucket path and name of the object
    "Location": "[string]"
  }
]
*/

core.setOutput('results', JSON.stringify(uploads))
console.log(`Successfully uploaded ${uploadCommandParams.length} files to S3`)
