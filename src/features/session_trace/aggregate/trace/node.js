/**
 * All nodes reported to the consumer must take this shape
 */
export class TraceNode {
  constructor (name, start, end, origin, type) {
    this.n = name
    this.s = start
    this.e = end
    this.o = origin
    this.t = type
  }
}
