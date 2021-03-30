import DefaultFormatter from './default-formatter'
import MergedFormatter from './merged-tap-formatter'
import CIFormatter from './ci-formatter.es6'
import RawFormatter from './raw-formatter.es6'

export default {
  pretty: DefaultFormatter,
  merged: MergedFormatter,
  ci: CIFormatter,
  raw: RawFormatter
}
