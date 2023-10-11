/**
 * @typedef {object} GQLMetadata
 * @property {string} operationName Name of the operation
 * @property {string} operationType Type of the operation
 * @property {string} operationFramework Framework responsible for the operation
 */

/**
 * @param {string|Object} gql The GraphQL object body sent to a GQL server
 * @returns {GQLMetadata}
 */
export function parseGQL (gql) {
  if (!gql) return
  const contents = gql
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

export function parseBatchGQL (arrayOfGql) {
  if (!arrayOfGql) return
  let contents = arrayOfGql
  if (!Array.isArray(contents)) contents = [contents]

  const opNames = []
  const opTypes = []
  for (let content of contents) {
    const operation = parseGQL(content)
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

export function parseGQLContents (gqlContents) {
  let contents
  if (!gqlContents || (typeof gqlContents !== 'string' && typeof gqlContents !== 'object')) return
  else if (typeof gqlContents === 'string') {
    try {
      contents = JSON.parse(gqlContents)
    } catch {
      // must be a JSON object
      return
    }
  } else contents = gqlContents

  let isValid = false
  if (Array.isArray(contents)) isValid = contents.every(x => validateGQLObject(x))
  else isValid = validateGQLObject(contents)
  if (!isValid) return

  return contents
}

export function parseGQLQueryString (gqlQueryString) {
  try {
    if (!gqlQueryString || typeof gqlQueryString !== 'string') return
    const params = new URLSearchParams(gqlQueryString)
    return parseGQLContents(Object.fromEntries(params))
  } catch (err) {
    // do nothing for now?
  }
}

function validateGQLObject (obj) {
  return !(typeof obj !== 'object' || !obj.query || typeof obj.query !== 'string')
}
