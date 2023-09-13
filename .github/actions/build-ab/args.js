import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .choices('environment', ['dev', 'staging', 'prod', 'eu-prod'])
  .describe('environment', 'Which environment are we building the a/b script for?')

  .string('current')
  .describe('current', 'current/stable build (defaults to -current)')
  .default('current', 'https://js-agent.newrelic.com/nr-loader-spa-current.min.js')

  .string('next')
  .describe('next', 'next version to compare to stable version (defaults to /dev)')
  .default('next', 'https://js-agent.newrelic.com/dev/nr-loader-spa.min.js')

  .string('app-id')
  .describe('Application ID to use in the environment NRBA configuration for the next loader.')

  .string('license-key')
  .describe('License key to use in the environment NRBA configuration for the next loader.')

  .string('ab-app-id')
  .describe('Application ID to use in the environment NRBA configuration for non-next loaders.')

  .string('ab-license-key')
  .describe('License key to use in the environment NRBA configuration for non-next loaders.')

  .string('role')
  .describe('role', 'S3 role ARN; used when including experiments in the ab script.')

  .string('bucket')
  .describe('bucket', 'S3 bucket name; used when including experiments in the ab script.')

  .string('region')
  .describe('region', 'AWS region location of S3 bucket. Defaults to us-east-1.Used when including experiments in the ab script.')
  .default('region', 'us-east-1')

  .demandOption(['environment', 'app-id', 'license-key'])
  .argv
