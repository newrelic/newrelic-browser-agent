import * as core from '@actions/core'
import { S3Client, S3ServiceException, paginateListObjectsV2, DeleteObjectsCommand, waitUntilObjectNotExists } from '@aws-sdk/client-s3'
import { args } from './args.js'

/* Credentials come from the default provider chain, populated by the OIDC login step in action.yml */
const s3Client = new S3Client({ region: args.region })

async function collectKeysToDelete(bucketName, bucketDir) {
  const keys = []
  core.info("Bucket name: " + bucketName)
  core.info(`Looking up files with prefix '${bucketDir}'`)

  try {
    const params = {
      Bucket: bucketName,
      Prefix:bucketDir
    }
    const paginator = paginateListObjectsV2({ client: s3Client }, params)
    for await (const page of paginator) {
      page.Contents?.forEach(obj => {
        keys.push(obj.Key)
      })
    }
    core.info(`Found ${keys.length} matching files`)
    core.info(keys.map(k => ` • ${k}`).join('\n'))
    return keys
  } catch (err) {
    if (err instanceof S3ServiceException) {
      core.setFailed(
        `Error from S3 while listing objects for "${bucketName}".  ${err.name}: ${err.message}`,
      )
    } else {
      core.setFailed(`Error while listing objects for "${bucketName}". ${err.name}: ${err.message}`)
    }
    process.exit(1)
  }
}

async function deleteFiles(bucketName, keys) {
  try {
    core.info('Deleting...')

    const { Deleted } = await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: keys.map((k) => ({ Key: k })),
        },
     }),
    )

    for (const key in keys) {
      await waitUntilObjectNotExists(
        { client: s3Client },
        { Bucket: bucketName, Key: key },
      )
    }
    core.info(
      `Successfully deleted ${Deleted?.length || 0} objects.`,
    )
    core.info(Deleted?.map((d) => ` • ${d.Key}`).join("\n"))
  } catch (err) {
    if (err instanceof S3ServiceException) {
      core.setFailed(
        `Error from S3 while deleting objects for "${bucketName}".  ${err.name}: ${err.message}`,
      )
    } else {
      core.setFailed(`Error while deleting objects for "${bucketName}". ${err.name}: ${err.message}`)
    }
    process.exit(1)
  }
}

if (args.dry) {
  core.info('This is a dry run.')
}
const keysToBeDeleted = await collectKeysToDelete(args.bucket, args.dir)
if (!args.dry) {
  if (keysToBeDeleted.length > 0) {
    await deleteFiles(args.bucket, keysToBeDeleted)
  } else {
    core.info('No files found to delete')
  }
}
core.info('Completed successfully')
