module.exports = class TestHandleExpect {
  #promise;
  #resolve;
  #reject;
  #test;

  constructor(testHandle, test, timeout) {
    if (!test) {
      throw new Error('Test handle expect missing test method')
    }

    this.#createDeferred();
    this.#test = test;

    if (timeout !== false && (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        this.#reject(`Expect for resources BAM call timed out for test ${testHandle.testId}`);
      }, timeout);
    }
  }

  get promise() {
    return this.#promise;
  }

  test(request) {
    console.log(this, this.#test, this.#test(request))
    if (typeof this.#test === 'function') {
      return this.#test(request);
    }

    if (typeof this.#test === 'string') {
      return new Function(this.#test).call(null, request);
    }

    throw new Error('Test handle expect missing test method')
  }

  resolve(...args) {
    console.log('resolving', args)
    this.#resolve(args);
  }

  reject(...args) {
    this.#reject(args);
  }

  /**
   * Creates a basic deferred object
   * @returns {Deferred}
   */
  #createDeferred() {
    let resolve;
    let reject;
    let promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.#promise = promise;
    this.#resolve = resolve;
    this.#reject = reject;
  }
}
