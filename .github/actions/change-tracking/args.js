import process from 'process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')

  .string('entity-guid')
  .describe('entity-guid', 'Entity GUID for the application')

  .string('api-key')
  .describe('api-key', 'New Relic User API key for the account')

  .string('application')
  .describe('application', 'New Relic application name')

  .string('version')
  .describe('version', 'Version being deployed (required for Deployment category)')

  .string('category')
  .describe('category', 'Category of event (Deployment or Feature Flag)')
  .default('category', 'Deployment')

  .string('type')
  .describe('type', 'Type of deployment event (Basic, Rollback, Blue Green, Canary, Rolling, Shadow)')
  .default('type', 'Basic')

  .string('feature-flag-id')
  .describe('feature-flag-id', 'ID of the feature flag (required when category is Feature Flag)')

  .string('description')
  .describe('description', 'Description of the event')

  .string('changelog')
  .describe('changelog', 'Changelog for the deployment (URL or text)')

  .string('commit')
  .describe('commit', 'Commit hash for the deployment')

  .string('deep-link')
  .describe('deep-link', 'Deep link URL for the deployment')

  .string('user')
  .describe('user', 'Username of the actor or bot')

  .string('group-id')
  .describe('group-id', 'String to correlate two or more events')

  .string('short-description')
  .describe('short-description', 'Short description for the event')

  .demandOption(['entity-guid', 'api-key', 'application', 'version'])
  .argv
