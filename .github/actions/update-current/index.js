import * as core from '@actions/core'
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts'
import { S3Client, CopyObjectCommand } from '@aws-sdk/client-s3'
import mime from 'mime-types'
import { constructLoaderFileNames } from '../shared-utils/loaders.js'
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

const results = await Promise.all(
  constructLoaderFileNames(args.loaderVersion)
    .map(async loader => {
      const currentLoaderName = loader.replace(args.loaderVersion, 'current')
      const commandOpts = {
        Bucket: args.bucket,
        CopySource: `${args.bucket}/${loader}`,
        Key: currentLoaderName,
        ContentType: mime.lookup(currentLoaderName) || 'application/javascript',
        CacheControl: getAssetCacheHeader('/', currentLoaderName),
        MetadataDirective: 'REPLACE',
        TaggingDirective: 'COPY'
      }

      if (args.dry) {
        console.log('running in dry mode, file not uploaded, params:', JSON.stringify({
            ...commandOpts,
            Body: '[file stream]'
        }))
        return Promise.resolve()
      }

      const result = await s3Client.send(new CopyObjectCommand(commandOpts))
      return ({
        ...result,
        ...commandOpts
      })
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
    "CopySourceVersionId": "[string]",
    "VersionId": "[string]",
    "ServerSideEncryption": "AES256",
    "CopyObjectResult": {
      "ETag": "\"[string]\"",
      "LastModified": "2023-08-18T13:41:35.000Z"
    },
    "Bucket": "[string]",
    "CopySource": "[string]",
    "Key": "nr-loader-rum-current.min.js", <-- This is the bucket path and name of the object
    "ContentType": "application/javascript",
    "CacheControl": "public, max-age=3600"
  }
]
*/

core.setOutput('results', JSON.stringify(results))
console.log(`Successfully ${args.dry ? 'simulated' : ''} copy of ${results.length} files in S3`)
