
/**
 * A class to defer callback execution until a decision can be reached
 */
export class HandlerCache {
  /** @private @type {boolean | undefined} */
  #decision = undefined
  /** @private @type {Function[]} */
  #cache = []
  /** @private @type {Timeout} */
  #settleTimer = setTimeout(() => this.#close(), 5000)

  /**
     * tell the handlerCache that its ok to immediately execute the callbacks that are triggered by the ee from this moment on
     * and execute all the storage callbacks saved up in the handlerCache
     * @private
     */
  #drain () {
    this.#cache.forEach(h => h())
    this.#cache = []
    clearTimeout(this.#settleTimer)
  }

  /**
     * tell the handlerCache not to execute any of the storage callbacks
     * and wipe out all the storage callbacks saved up in the handlerCache
     * @private
     */
  #close () {
    this.#decision = false // settle() & decide() cannot be used after close
    this.#cache = []
  }

  /**
     * Wrap callback functions with this method to defer their execution until a decision has been reached
     * @param {Function} handler
     * @returns {void}
     */
  settle (handler) {
    if (this.#decision === false) return
    else if (this.#decision === undefined) this.#cache.push(handler)
    else handler()
  }

  /**
     * Make a decision about what to do with the cache of callbacks.
     * --- if true: tell the handlerCache that its ok to immediately execute the callbacks that are triggered by the ee from this moment on
     * and execute all the storage callbacks saved up in the handlerCache ---
     * --- if false: tell the handlerCache not to execute any of the storage callbacks
     * and wipe out all the storage callbacks saved up in the handlerCache
     * @param {boolean} decision
     */
  decide (decision) {
    if (this.#decision !== undefined) return // a decision can only be made once
    this.#decision = decision
    if (decision === false) this.#close()
    if (decision === true) this.#drain()
  }
}
