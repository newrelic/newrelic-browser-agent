import SpecMatcher from './spec-matcher.mjs'

export const COMPOSITE_OPERATOR = {
  '&&': '&&',
  '||': '||',
  AND: '&&',
  OR: '||'
}

/**
 * Composes two or more spec matchers together
 * with an AND or OR operation.
 */
export default class CompositeSpecMatcher {
  #operation
  #specs

  constructor (operation, ...specs) {
    if (!COMPOSITE_OPERATOR[operation]) {
      throw new Error(`The composite operator ${operation} is invalid. The valid values are: && or ||`)
    }
    if (!Array.isArray(specs) || specs.length < 2) {
      throw new Error('Two or more specs must be provided when creating a composite spec matcher.')
    }

    this.#operation = operation
    this.#specs = specs.map(spec => {
      if (!(spec instanceof SpecMatcher)) {
        throw new Error('A composite matcher must be constructed from two or more instances of a spec matcher.')
      }

      return spec
    })
  }

  test (spec) {
    if (this.#operation === COMPOSITE_OPERATOR.AND) {
      return this.#specs.reduce((aggregate, specMatcher) => aggregate && specMatcher.test(spec), true)
    }

    return this.#specs.reduce((aggregate, specMatcher) => aggregate || specMatcher.test(spec), false)
  }
}
