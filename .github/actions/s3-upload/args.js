import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('role')
  .describe('role', 'S3 role ARN')

  .string('bucket')
  .describe('bucket', 'S3 bucket name')

  .string('input')
  .describe('input', 'The local directory containing the files to be uploaded.')

  .string('region')
  .describe('region', 'AWS region location of S3 bucket. Defaults to us-east-1.')
  .default('region', 'us-east-1')

  .boolean('dry')
  .default('dry', false)
  .describe('dry', 'Runs the action script without actually uploading files.')

  .string('dir')
  .describe('dir', 'Bucket sub-directory name. Leave empty to upload to the root of the bucket.')

  .number('asset-cache-duration')
  .describe('asset-cache-duration', 'Set the amount of time used for the cache control header of each asset. Defaults to 2 hours.')
  .default('asset-cache-duration', 3600)

  .demandOption(['bucket', 'role', 'input'])
  .argv
