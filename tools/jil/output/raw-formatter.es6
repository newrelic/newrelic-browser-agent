import BaseFormatter from './base-formatter'

export default class RawFormatter extends BaseFormatter {
  addOutputParser (parser) {
    parser.on('out', (out) => this.log(out))
  }
}
