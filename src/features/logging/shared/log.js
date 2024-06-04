import { globalScope } from '../../../common/constants/runtime'
import { cleanURL } from '../../../common/url/clean-url'

export class Log {
  constructor (timestamp, message, attributes, level) {
    this.timestamp = timestamp
    this.message = message
    this.attributes = attributes
    this.logType = level
    this.session = {
      url: cleanURL('' + globalScope.location)
    }
  }
}
