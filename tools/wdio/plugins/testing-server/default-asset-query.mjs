/**
 * When using deepmerge-ts, this object acts as the default and schema
 * for what we pass back to the testing server. If a configuration option
 * is not defined in this object, it cannot be overridden in a test.
 */
const query = {
  loader: 'spa'
}

export default query
