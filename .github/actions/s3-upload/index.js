import fs from 'fs'
import path from 'path'
import * as core from '@actions/core'
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts'
import { S3Client } from '@aws-sdk/client-s3'
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

const filesToUpload = (await fs.promises.readdir(args.input, { withFileTypes: true }))
  .filter(file => file.isFile())
  .map(file => ({
    name: file.name,
    path: path.resolve(args.input, file.name)
  }))

const uploads = await Promise.all(filesToUpload
  .map(file => {
    const params = {
      Bucket: args.bucket,
      Key: file.name,
      Body: fs.createReadStream(file.path, {
        encoding: 'utf-8'
      }),
      ContentType: mime.lookup(file.path) || 'application/javascript',
      CacheControl: getAssetCacheHeader(args.dir, file.name),
    }

    if (typeof args.dir === 'string' && args.dir.trim() !== '') {
      let dirPath = args.dir.trim()

      if (dirPath.endsWith('/')) {
        dirPath = dirPath.slice(0, -1)
      }

      params.Key = `${dirPath}/${params.Key}`
    }

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
console.log(`Successfully uploaded ${filesToUpload.length} files to S3`)
