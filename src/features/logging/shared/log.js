import { globalScope } from '../../../common/constants/runtime'
import { cleanURL } from '../../../common/url/clean-url'

export class Log {
  /** @type {long} the unix timestamp of the log event */
  timestamp
  /** @type {string} the log message */
  message
  /** @type {object} the object of attributes to be parsed by logging ingest into top-level properties */
  attributes
  /** @type {'error'|'trace'|'debug'|'info'|'warn'} the log type of the log */
  logType

  /**
   * @param {number} timestamp - Unix timestamp
   * @param {string} message - message string
   * @param {string} attributes - other attributes, stringified
   * @param {enum} level - Log level
   */
  constructor (timestamp, message, attributes, level) {
    /** @type {long} */
    this.timestamp = timestamp
    this.message = message
    this.attributes = { ...attributes, pageUrl: cleanURL('' + globalScope.location) }
    this.logType = level
  }
}
