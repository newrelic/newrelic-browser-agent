import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .choices('environment', ['dev', 'staging', 'prod', 'eu-prod', 'jp-prod'])
  .describe('environment', 'Which NR1 environment are we updating the released asset for?')

  .string('released')
  .describe('released', 'URL of the Browser Agent version to deploy as "released"')

  .string('app-id')
  .describe('app-id', 'Application ID to use in the NRBA configuration.')

  .string('license-key')
  .describe('license-key', 'License key to use in the NRBA configuration.')

  .string('role')
  .describe('role', 'S3 role ARN for AWS authentication.')

  .string('bucket')
  .describe('bucket', 'S3 bucket name for asset upload.')

  .string('region')
  .describe('region', 'AWS region location of S3 bucket.')
  .default('region', 'us-east-1')

  .demandOption(['environment', 'released', 'app-id', 'license-key', 'role', 'bucket'])
  .argv
