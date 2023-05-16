const specSyntax = '{browserVersion}{operator:@|<|>|<=|>=}[/platformName]'
export const SPEC_OPERATOR = {
  AT: '@',
  LT: '<',
  GT: '>',
  LTE: '<=',
  GTE: '>='
}

/**
 * Parses a browser spec string into it's constituent parts.
 * @example
 * // return { browserName: 'ie', operator: '@', browserVersion: 11', platformName: 'windows' }
 * parseSpecString('ie@11/windows')
 * @example
 * // throws an error because `#` is not a valid operator
 * parseSpecString('ie#11/windows')
 * @param {string} spec A string representing a browser spec
 * @returns {object} The parsed spec
 */
export function parseSpecString (spec) {
  // Drop the platformName if it exists
  const [browserInfo, platform] = spec.split('/')
  const [specOperator] = browserInfo.match(/(@|<=|>=|<|>)/) || []
  const [browserName, browserVersion] = browserInfo.split(specOperator)

  return {
    browserName,
    specOperator,
    browserVersion,
    platform
  }
}
