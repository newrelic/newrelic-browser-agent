const SPEC_OPERATOR = {
  AT: '@',
  LT: '<',
  GT: '>',
  LTE: '<=',
  GTE: '>='
}

/**
 * Parses a browser spec string into it's constituent parts.
 * @param {string} spec A string representing a browser spec
 * @returns {object} The parsed spec
 */
export function parseSpecString (spec) {
  // Drop the platformName if it exists
  const [browserInfo, platform] = spec.split('/')
  const specOperator = browserInfo.match(/(@|<=|>=|<|>)/)?.[0]
  let [browserName, browserVersion] = browserInfo.split(specOperator)
  // Ex of allowed version str: '*', '123', '16.5', '127.0.5183.123', 'latest', 'latest-1', 'latest-23'
  // Ex of disallowed version str: 'gibberishtext', 'latest-0' --> cast to undefined
  if (!(/^(\*|[\d.]+|latest(-[1-9]\d*)?)$/.test(browserVersion))) browserVersion = undefined

  return {
    browserName,
    specOperator,
    browserVersion,
    platform
  }
}

export function equationIsTrue (lhs, operator, rhs) {
  switch (operator) {
    case SPEC_OPERATOR.AT:
      return lhs === rhs
    case SPEC_OPERATOR.GT:
      return lhs > rhs
    case SPEC_OPERATOR.LT:
      return lhs < rhs
    case SPEC_OPERATOR.GTE:
      return lhs >= rhs
    case SPEC_OPERATOR.LTE:
      return lhs <= rhs
    default:
      return false
  }
}
