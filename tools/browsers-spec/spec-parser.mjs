const specSyntax = '{browserVersion}{operator:@|<|>|<=|>=}[/platformName]'
export const SPEC_OPERATOR = {
  AT: '@',
  LT: '<',
  GT: '>',
  LTE: '<=',
  GTE: '>='
}

/**
 * Parses a browser spec string into it's constituent parts. An optional
 * second argument can be used to provide validation parameters for the
 * spec string. If the spec string doesn't meet the validation requirements,
 * an error will be thrown.
 * @example
 * // return { browserName: 'ie', operator: '@', browserVersion: 11', platformName: 'windows' }
 * parseSpecString('ie@11/windows')
 * @example
 * // throws an error because `#` is not a valid operator
 * parseSpecString('ie#11/windows')
 * @param {string} spec A string representing a browser spec
 * @param {object} options Validation options
 * @param {boolean} options.browserNameRequired Indicates if the browserName is required. Default: true
 * @param {boolean} options.operatorRequired Indicates if the browserName is required. Default: true
 * @param {boolean} options.browserVersionRequired Indicates if the browserName is required. Default: true
 * @returns {object} The parsed spec
 */
export function parseSpecString (spec, options = { browserNameRequired: true, operatorRequired: true, browserVersionRequired: true }) {
  // Drop the platformName if it exists
  const [browserInfo, platform] = spec.split('/')
  const [specOperator] = browserInfo.match(/(@|<=|>=|<|>)/) || []
  const [browserName, browserVersion] = browserInfo.split(specOperator)

  if (options?.browserNameRequired && (!browserName || browserName.length === 0)) {
    throw new Error(`The spec ${spec} is missing the browserName. The correct syntax is: ${specSyntax}`)
  }
  if (options?.operatorRequired && (!specOperator || specOperator.length === 0)) {
    throw new Error(`The spec ${spec} is missing the operator or is using an invalid operator. The correct syntax is: ${specSyntax}`)
  }
  if (options?.browserVersionRequired && (!browserVersion || browserVersion.length === 0)) {
    throw new Error(`The spec ${spec} is missing the browserVersion. The correct syntax is: ${specSyntax}`)
  }

  return {
    browserName,
    specOperator,
    browserVersion,
    platform
  }
}
