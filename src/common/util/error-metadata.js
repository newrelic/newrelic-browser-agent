export function setErrorMetadata ({ error, property, value, agentIdentifier }) {
  error.__newrelic ??= { }
  error.__newrelic[agentIdentifier] ??= { }
  error.__newrelic[agentIdentifier][property] = value
}

export function getErrorMetadata ({ error, property, agentIdentifier }) {
  if (!property) return error?.__newrelic?.[agentIdentifier]
  return error?.__newrelic?.[agentIdentifier]?.[property]
}
