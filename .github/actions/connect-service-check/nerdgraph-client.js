import { gql, GraphQLClient } from 'graphql-request'

const ENDPOINTS = {
  staging: 'https://staging-api.newrelic.com/graphql',
  'us-prod': 'https://api.newrelic.com/graphql'
}

export function createClient (environment, apiKey) {
  const endpoint = ENDPOINTS[environment]
  if (!endpoint) throw new Error(`No NerdGraph endpoint configured for environment "${environment}"`)

  return new GraphQLClient(endpoint, { headers: { 'API-Key': apiKey } })
}

/**
 * Marks a value as an enum member so `toGqlLiteral` emits it as a bare
 * identifier (SPA) instead of a quoted string ("SPA").
 */
export class EnumLiteral {
  constructor (name) { this.name = name }
}

/**
 * Serializes a plain JS value into inline GraphQL literal syntax, matching
 * this repo's existing NerdGraph call convention of inlining values into the
 * query string rather than using GraphQL variables
 * (.github/actions/change-tracking/index.js).
 */
export function toGqlLiteral (value) {
  if (value === null || value === undefined) return 'null'
  if (value instanceof EnumLiteral) return value.name
  if (Array.isArray(value)) return `[${value.map(toGqlLiteral).join(', ')}]`
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    const fields = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${toGqlLiteral(v)}`)
    return `{ ${fields.join(', ')} }`
  }
  throw new Error(`Cannot serialize value of type ${typeof value} to a GraphQL literal`)
}

/**
 * Finds the EntityGuid for a just-created (or long-lived) APM application.
 * Returns null rather than throwing when nothing is found yet, so callers
 * can drive this through poll-until's waitFor.
 */
export async function findApmApplicationGuid (client, { name, accountId }) {
  // The entitySearch query argument is itself a double-quoted GraphQL
  // string, so string literals *within* it (name, here) must use single
  // quotes - JSON.stringify's double quotes collide with the outer ones.
  const safeName = name.replace(/'/g, "\\'")
  const query = gql`
    {
      actor {
        entitySearch(query: "name = '${safeName}' AND type = 'APPLICATION' AND domain = 'APM' AND accountId = ${accountId}") {
          results {
            entities {
              guid
            }
          }
        }
      }
    }
  `

  const response = await client.request(query)
  const entities = response?.actor?.entitySearch?.results?.entities || []
  return entities[0]?.guid || null
}

export async function enableApmBrowser (client, { guid, settings }) {
  const mutation = gql`
    mutation {
      agentApplicationEnableApmBrowser(
        guid: ${JSON.stringify(guid)}
        settings: ${toGqlLiteral(settings)}
      ) {
        name
      }
    }
  `
  return client.request(mutation)
}

/**
 * Returns `errors` too (AgentApplicationSettingsUpdateError: field,
 * errorClass, description) - NerdGraph can accept the mutation overall
 * (HTTP 200, no GraphQL-level error) while still rejecting individual
 * fields, so callers must check this rather than assume success.
 */
export async function updateAgentApplicationSettings (client, { guid, settings }) {
  const mutation = gql`
    mutation {
      agentApplicationSettingsUpdate(
        guid: ${JSON.stringify(guid)}
        settings: ${toGqlLiteral(settings)}
      ) {
        guid
        errors {
          field
          errorClass
          description
        }
      }
    }
  `
  return client.request(mutation)
}

export async function deleteApplication (client, { guid }) {
  const mutation = gql`
    mutation {
      agentApplicationDelete(guid: ${JSON.stringify(guid)}, force: true) {
        success
      }
    }
  `
  return client.request(mutation)
}

/**
 * Generic introspection helper: returns the inputFields (name + type
 * descriptor) for a named GraphQL input type, or enumValues for a named
 * enum. Used by settings-generator.js to build the mutation payload from
 * the live schema instead of a hand-maintained field list.
 */
export async function introspectType (client, typeName) {
  const query = gql`
    {
      __type(name: ${JSON.stringify(typeName)}) {
        name
        kind
        inputFields {
          name
          type {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
        enumValues {
          name
        }
      }
    }
  `
  const response = await client.request(query)
  return response.__type
}
