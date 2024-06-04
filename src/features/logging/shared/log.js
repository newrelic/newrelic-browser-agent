import { globalScope } from '../../../common/constants/runtime'
import { cleanURL } from '../../../common/url/clean-url'

export class Log {
  /**
   *
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
