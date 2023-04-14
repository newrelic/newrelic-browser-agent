/**
 * An object containing properties that represent an error and can be reconstructed into an {@link object}.
 * @typedef {object} MockErrorData
 * @property {() => string} toString - returns a string representation of the error
 * @property {string} name - name of the error class being thrown
 * @property {string} constructor - string representation of the error class constructor
 * @property {string} message - the message from the error
 * @property {string} stack - complete stack trace from the error
 * @property [string} fileName - name of the source file that generated the error
 * @property [number] code - browser error code
 * @property [number] lineNumber - number of line of code that generated the error
 * @property [number] line - number of line of code that generated the error
 * @property [number] columnNumber - number of column of code that generated the error
 * @property [number] column - number of column of code that generated the error
 */

/**
 * Reconstructs an {@link Error} object from a given mock error data object. The mock
 * data object is a capture of an error in a specific browser.
 * @param {MockErrorData} errorData
 * @returns {Error}
 */
export function constructError (errorData) {
  const error = Object.create(new Error(errorData.message))

  return new Proxy(error, {
    get (target, prop) {
      if (prop === 'toString') {
        return () => errorData[prop]
      }

      return errorData[prop]
    },
    has (target, key) {
      return key in target || key in errorData
    }
  })
}
