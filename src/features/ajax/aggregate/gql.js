/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { isPureObject } from '../../../common/util/type-check'

/**
 * @typedef {object} GQLMetadata
 * @property {string} operationName Name of the operation
 * @property {string} operationType Type of the operation
 * @property {string} operationFramework Framework responsible for the operation
 */

/**
 * Parses and returns the graphql metadata from a network request. If the network
 * request is not a graphql call, undefined will be returned.
 * @param {object|string} body Ajax request body
 * @param {string} query Ajax request query param string
 * @returns {GQLMetadata | undefined}
 */
export function parseGQL ({ body, query } = {}) {
  if (!body && !query) return
  try {
    const gqlBody = parseBatchGQL(parseGQLContents(body))
    if (gqlBody) return gqlBody
    const gqlQuery = parseSingleGQL(parseGQLQueryString(query))
    if (gqlQuery) return gqlQuery
  } catch (err) {
    // parsing failed, return undefined
  }
}

/**
 * @param {string|Object} gql The GraphQL object body sent to a GQL server
 * @returns {GQLMetadata}
 */
function parseSingleGQL (contents) {
  if (typeof contents !== 'object' || !contents.query || typeof contents.query !== 'string') return

  /** parses gql query string and returns [fullmatch, type match, name match] */
  const matches = contents.query.trim().match(/^(query|mutation|subscription)\s?(\w*)/)
  const operationType = matches?.[1]
  if (!operationType) return
  const operationName = contents.operationName || matches?.[2] || 'Anonymous'
  return {
    operationName, // the operation name of the indiv query
    operationType, // query, mutation, or subscription,
    operationFramework: 'GraphQL'
  }
}

function parseBatchGQL (contents) {
  if (!contents) return
  if (!Array.isArray(contents)) contents = [contents]

  const opNames = []
  const opTypes = []
  for (let content of contents) {
    const operation = parseSingleGQL(content)
    if (!operation) continue

    opNames.push(operation.operationName)
    opTypes.push(operation.operationType)
  }

  if (!opTypes.length) return
  return {
    operationName: opNames.join(','), // the operation name of the indiv query -- joined by ',' for batched results
    operationType: opTypes.join(','), // query, mutation, or subscription -- joined by ',' for batched results
    operationFramework: 'GraphQL'
  }
}

function parseGQLContents (gqlContents) {
  let contents

  if (!gqlContents || (typeof gqlContents !== 'string' && typeof gqlContents !== 'object')) return
  else if (typeof gqlContents === 'string') contents = JSON.parse(gqlContents)
  else contents = gqlContents

  if (!isPureObject(contents) && !Array.isArray(contents)) return

  let isValid = false
  if (Array.isArray(contents)) isValid = contents.some(x => validateGQLObject(x))
  else isValid = validateGQLObject(contents)

  if (!isValid) return
  return contents
}

function parseGQLQueryString (gqlQueryString) {
  if (!gqlQueryString || typeof gqlQueryString !== 'string') return
  const params = new URLSearchParams(gqlQueryString)
  return parseGQLContents(Object.fromEntries(params))
}

function validateGQLObject (obj) {
  return !(typeof obj !== 'object' || !obj.query || typeof obj.query !== 'string')
}

/**
 * Checks if a response body contains GraphQL errors according to the GraphQL spec.
 * A valid GraphQL error response contains an "errors" array with at least one error object.
 * @param {string|object} [responseBody] The response body to check
 * @returns {boolean} True if the response contains GraphQL errors
 */
export function hasGQLErrors (responseBody) {
  if (!responseBody) return false
  try {
    let parsed = responseBody

    // Parse string to object if needed
    if (typeof responseBody === 'string') {
      parsed = JSON.parse(responseBody)
    }

    // Check if it's a valid GraphQL error response
    // Per spec: { "errors": [...], "data": null/partial }
    if (parsed && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      // Verify at least one error has the standard GraphQL error structure
      return parsed.errors.some(err =>
        err && typeof err === 'object' && typeof err.message === 'string'
      )
    }

    return false
  } catch (err) {
    return false
  }
}
