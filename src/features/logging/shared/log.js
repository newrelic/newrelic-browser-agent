import { globalScope } from '../../../common/constants/runtime'
import { cleanURL } from '../../../common/url/clean-url'

export class Log {
  /** @type {long} the unix timestamp of the log event */
  timestamp
  /** @type {string} the log message */
  message
  /** @type {string} the stringified object of attributes (could be args[] from wrapped logger) */
  attributes
  /** @type {'error'|'trace'|'debug'|'info'|'warn'} the log type of the log */
  logType
  /** @type {Object<{url: string}>} The session level attributes of the log event */
  session

  /**
   * @param {number} timestamp - Unix timestamp
   * @param {string} message - message string
   * @param {{[key: string]: *}} attributes - other attributes
   * @param {enum} level - Log level
   */
  constructor (timestamp, message, attributes, level) {
    /** @type {long} */
    this.timestamp = timestamp
    this.message = message
    this.attributes = attributes
    this.logType = level
    this.session = {
      url: cleanURL('' + globalScope.location)
    }
  }
}
