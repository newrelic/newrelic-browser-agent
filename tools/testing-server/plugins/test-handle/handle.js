/**
 * Scheduled reply options
 * @typedef {object} ScheduledReply
 * @property {number} statusCode response code
 * @property {string} body response body
 * @property {number} delay delay the response by a number of milliseconds
 */

/**
 * Deferred object
 * @typedef {object} Deferred
 * @property {Promise<any>} promise the underlying promise of the deferred object
 * @property {Function} resolve the resolve function of the deferred object
 * @property {Function} reject the reject function of the deferred object
 * @property {Function} [test] option test function that takes the request and
 * returns a boolean indicating if the request matches. This is useful for the
 * jserrors BAM endpoint where multiple types of data are reported.
 */

const path = require("path");
const { urlFor } = require("../../utils/url");
const { paths, beaconRequests } = require("../../constants");
const { deepmerge } = require("deepmerge-ts");
const querypack = require("@newrelic/nr-querypack");

module.exports = class TestHandle {
  /**
   * @type TestServer
   */
  #testServer;

  /**
   * @type string
   */
  #testId;

  /**
   * List of scheduled responses keyed to a beacon request
   * @type {Map<string, ScheduledResponse[]>}
   */
  #scheduledResponses = new Map();

  /**
   * List of pending expects keyed to a beacon request
   * @type {Map<string, Set<TestHandleExpect>>}
   */
  #expects = new Map();
  #deferredExpects = new Map();

  /**
   * List of pending expects keyed to a specific test server (assetServer, corsServer, bamServer)
   * @type {Map<string, Set<Deferred>>}
   */
  #deferredCustomAjaxExpects = new Map();

  /**
   * List of seen requests keyed to a beacon request
   * @type {Map<string, number>}
   */
  #seenRequests = new Map();

  constructor(testServer, testId) {
    this.#testServer = testServer;
    this.#testId = testId;
  }

  get seenRequests() {
    return new Proxy(Object.fromEntries(this.#seenRequests), {
      get(target, p, receiver) {
        if (target.hasOwnProperty(p)) {
          return target[p];
        }

        return 0;
      }
    })
  }

  get testId() {
    return this.#testId;
  }

  get testServer() {
    return this.#testServer;
  }

  /**
   * Checks for any pending expects for the given beacon call. When a beacon has pending expects, we will resolve the
   * expects in a FIFO manor, one per request.
   * @param {string} beacon
   * @param {module:fastify.FastifyRequest} request
   */
  resolveBeaconExpects(beacon, request) {
    if (!this.#seenRequests.has(beacon)) {
      this.#seenRequests.set(beacon, 1);
    } else {
      this.#seenRequests.set(beacon, this.#seenRequests.get(beacon) + 1);
    }

    if (this.#deferredExpects.has(beacon)) {
      const beaconSet = this.#deferredExpects.get(beacon);
      const nextDeferred = beaconSet.values().next()?.value;

      if (nextDeferred && ((typeof nextDeferred.test === "function" && nextDeferred.test(request)) || !nextDeferred.test)) {
        request.resolvingTestHandles.add(nextDeferred);
        beaconSet.delete(nextDeferred);
      }
    }
  }

  getNextCustomAjaxExpects(serverId, request) {
    if (this.#deferredCustomAjaxExpects.has(serverId)) {
      const customAjaxSet = this.#deferredCustomAjaxExpects.get(serverId);
      const nextDeferred = customAjaxSet.values().next()?.value;

      if (nextDeferred && ((typeof nextDeferred.test === "function" && nextDeferred.test(request)) || !nextDeferred.test)) {
        customAjaxSet.delete(nextDeferred)
        return nextDeferred;
      }
    }
  }

  /**
   * Returns the next available scheduled response for the given beacon
   * request or null if one is not found.
   * @param {string} beacon
   * @return {ScheduledReply | null}
   */
  getNextScheduledReply(beacon) {
    if (this.#scheduledResponses.has(beacon)) {
      return this.#scheduledResponses.get(beacon).shift() || null;
    }

    return null;
  }

  /**
   * Schedules a response for a specific beacon request.
   * @param {string} beacon
   * @return {ScheduledReply | null}
   */
  scheduleReply(beacon, scheduledResponse) {
    if (!this.#scheduledResponses.has(beacon)) {
      this.#scheduledResponses.set(beacon, []);
    }

    this.#scheduledResponses.get(beacon).push(scheduledResponse);
  }

  /**
   * Constructs an url for a browser test relative to the current testId.
   * @param {string} testFile
   * @returns {string}
   */
  urlForBrowserTest(testFile) {
    return urlFor(
      "/tests/assets/browser.html",
      {
        config: Buffer.from(
          JSON.stringify({
            licenseKey: this.#testId,
            assetServerPort: this.#testServer.assetServer.port,
            corsServerPort: this.#testServer.corsServer.port,
          })
        ).toString("base64"),
        script:
          "/" + path.relative(paths.rootDir, testFile) + "?browserify=true",
      },
      this.#testServer
    );
  }

  /**
   * Constructs an url for a test asset relative to the current testId
   * @param {string} assetFile
   * @param {object} query
   * @returns {string}
   */
  assetURL(assetFile, query = {}) {
    return urlFor(
      path.relative(
        paths.rootDir,
        path.resolve(paths.testsAssetsDir, assetFile)
      ),
      deepmerge(
        {
          loader: "full",
          config: {
            licenseKey: this.#testId,
          },
        },
        query
      ),
      this.#testServer
    );
  }

  expectRum(timeout) {
    if (!this.#deferredExpects.has(beaconRequests.rum)) {
      this.#deferredExpects.set(beaconRequests.rum, new Set());
    }

    const deferred = this.#createDeferred();

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for events BAM call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredExpects.get(beaconRequests.rum).add(deferred);
    return deferred.promise;
  }

  expectEvents(timeout) {
    if (!this.#deferredExpects.has(beaconRequests.events)) {
      this.#deferredExpects.set(beaconRequests.events, new Set());
    }

    const deferred = this.#createDeferred();

    deferred.test = (request) => {
      if (Array.isArray(request.body) &&
      request.body.findIndex(qpData => qpData.type === 'interaction') > -1) {
        return true;
      }

      if (request?.query?.e) {
        try {
          const events = querypack.decode(request.query.e);
          return Array.isArray(events) && events.findIndex(qpData => qpData.type === 'interaction') > -1
        } catch(error) {
          this.#testServer.config.logger.error(error);
          return false;
        }
      }
    }

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for events BAM call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredExpects.get(beaconRequests.events).add(deferred);
    return deferred.promise;
  }

  expectTimings(timeout) {
    if (!this.#deferredExpects.has(beaconRequests.events)) {
      this.#deferredExpects.set(beaconRequests.events, new Set());
    }

    const deferred = this.#createDeferred();

    deferred.test = (request) => {
      if (Array.isArray(request.body) &&
        request.body.findIndex(qpData => qpData.type === 'timing') > -1) {
        return true;
      }

      if (request?.query?.e) {
        try {
          const events = querypack.decode(request.query.e);
          return Array.isArray(events) && events.findIndex(qpData => qpData.type === 'timing') > -1
        } catch(error) {
          this.#testServer.config.logger.error(error);
          return false;
        }
      }
    }

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for timings BAM call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredExpects.get(beaconRequests.events).add(deferred);
    return deferred.promise;
  }

  expectAjaxEvents(timeout) {
    if (!this.#deferredExpects.has(beaconRequests.events)) {
      this.#deferredExpects.set(beaconRequests.events, new Set());
    }

    const deferred = this.#createDeferred();

    deferred.test = (request) => {
      if (Array.isArray(request.body) &&
        request.body.findIndex(qpData => qpData.type === 'ajax') > -1) {
        return true;
      }

      if (request?.query?.e) {
        try {
          const events = querypack.decode(request.query.e);
          return Array.isArray(events) && events.findIndex(qpData => qpData.type === 'ajax') > -1
        } catch(error) {
          this.#testServer.config.logger.error(error);
          return false;
        }
      }
    }

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for ajax events BAM call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredExpects.get(beaconRequests.events).add(deferred);
    return deferred.promise;
  }

  expectErrors(timeout) {
    if (!this.#deferredExpects.has(beaconRequests.jserrors)) {
      this.#deferredExpects.set(beaconRequests.jserrors, new Set());
    }

    const deferred = this.#createDeferred();

    deferred.test = (request) => {
      if (Array.isArray(request?.body?.err) && request.body.err.length > 0) {
        return true;
      }

      if (request?.query?.err) {
        try {
          const jserrors = JSON.parse(request.query.err);
          return Array.isArray(jserrors) && jserrors.length > 0
        } catch(error) {
          this.#testServer.config.logger.error(error);
          return false;
        }
      }

      return false;
    };

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for errors BAM call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredExpects.get(beaconRequests.jserrors).add(deferred);
    return deferred.promise;
  }

  expectAjaxTimeSlices(timeout) {
    if (!this.#deferredExpects.has(beaconRequests.jserrors)) {
      this.#deferredExpects.set(beaconRequests.jserrors, new Set());
    }

    const deferred = this.#createDeferred();

    deferred.test = (request) => {
      if (Array.isArray(request?.body?.xhr) && request.body.xhr.length > 0) {
        return true;
      }

      if (request?.query?.xhr) {
        try {
          const ajaxRequests = JSON.parse(request.query.xhr);
          return Array.isArray(ajaxRequests) && ajaxRequests.length > 0
        } catch(error) {
          this.#testServer.config.logger.error(error);
          return false;
        }
      }

      return false;
    };

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for errors BAM call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredExpects.get(beaconRequests.jserrors).add(deferred);
    return deferred.promise;
  }

  expectSupportMetrics(timeout) {
    if (!this.#deferredExpects.has(beaconRequests.jserrors)) {
      this.#deferredExpects.set(beaconRequests.jserrors, new Set());
    }

    const deferred = this.#createDeferred();

    deferred.test = (request) => {
      if (Array.isArray(request?.body?.sm) && request.body.sm.length > 0) {
        return true;
      }

      if (request?.query?.sm) {
        try {
          const supportMetrics = JSON.parse(request.query.sm);
          return Array.isArray(supportMetrics) && supportMetrics.length > 0
        } catch(error) {
          this.#testServer.config.logger.error(error);
          return false;
        }
      }

      return false;
    };

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for support metrics BAM call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredExpects.get(beaconRequests.jserrors).add(deferred);
    return deferred.promise;
  }

  expectCustomMetrics(timeout) {
    if (!this.#deferredExpects.has(beaconRequests.jserrors)) {
      this.#deferredExpects.set(beaconRequests.jserrors, new Set());
    }

    const deferred = this.#createDeferred();

    deferred.test = (request) => {
      if (Array.isArray(request?.body?.cm) && request.body.cm.length > 0) {
        return true;
      }

      if (request?.query?.cm) {
        try {
          const customMetrics = JSON.parse(request.query.cm);
          return Array.isArray(customMetrics) && customMetrics.length > 0
        } catch(error) {
          this.#testServer.config.logger.error(error);
          return false;
        }
      }

      return false;
    };

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for custom metrics BAM call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredExpects.get(beaconRequests.jserrors).add(deferred);
    return deferred.promise;
  }

  expectMetrics(timeout) {
    if (!this.#deferredExpects.has(beaconRequests.jserrors)) {
      this.#deferredExpects.set(beaconRequests.jserrors, new Set());
    }

    const deferred = this.#createDeferred();

    deferred.test = (request) => (Array.isArray(request?.body?.cm) && request.body.cm.length > 0) ||
      (Array.isArray(request?.body?.sm) && request.body.sm.length > 0);
    deferred.test = (request) => {
      if (Array.isArray(request?.body?.sm) && request.body.sm.length > 0) {
        return true;
      }
      if (Array.isArray(request?.body?.cm) && request.body.cm.length > 0) {
        return true;
      }

      if (request?.query?.sm) {
        try {
          const supportMetrics = JSON.parse(request.query.sm);
          return Array.isArray(supportMetrics) && supportMetrics.length > 0
        } catch(error) {
          this.#testServer.config.logger.error(error);
          return false;
        }
      }
      if (request?.query?.cm) {
        try {
          const customMetrics = JSON.parse(request.query.cm);
          return Array.isArray(customMetrics) && customMetrics.length > 0
        } catch(error) {
          this.#testServer.config.logger.error(error);
          return false;
        }
      }

      return false;
    };

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for custom metrics BAM call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredExpects.get(beaconRequests.jserrors).add(deferred);
    return deferred.promise;
  }

  expectIns(timeout) {
    if (!this.#deferredExpects.has(beaconRequests.ins)) {
      this.#deferredExpects.set(beaconRequests.ins, new Set());
    }

    const deferred = this.#createDeferred();

    deferred.test = (request) => {
      if (Array.isArray(request?.body?.ins) && request.body.ins.length > 0) {
        return true;
      }

      if (request?.query?.ins) {
        try {
          const ins = JSON.parse(request.query.ins);
          return Array.isArray(ins) && ins.length > 0
        } catch(error) {
          this.#testServer.config.logger.error(error);
          return false;
        }
      }

      return false;
    };

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for ins BAM call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredExpects.get(beaconRequests.ins).add(deferred);
    return deferred.promise;
  }

  expectResources(timeout) {
    if (!this.#deferredExpects.has(beaconRequests.resources)) {
      this.#deferredExpects.set(beaconRequests.resources, new Set());
    }

    const deferred = this.#createDeferred();

    deferred.test = (request) => {
      if (Array.isArray(request?.body?.res) && request.body.res.length > 0) {
        return true;
      }

      if (request?.query?.res) {
        try {
          const res = JSON.parse(request.query.res);
          return Array.isArray(res) && res.length > 0
        } catch(error) {
          this.#testServer.config.logger.error(error);
          return false;
        }
      }

      return false;
    };

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for resources BAM call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredExpects.get(beaconRequests.resources).add(deferred);
    return deferred.promise;
  }

  expectRumAndErrors(timeout) {
    return Promise.all([this.expectRum(timeout), this.expectErrors(timeout)])
      .then(([_, errors]) => errors);
  }

  // expectCorsAjax(timeout) {
  //   if (!this.#deferredExpects.has('cors')) {
  //     this.#deferredExpects.set('cors', new Set());
  //   }
  //
  //   const deferred = this.#createDeferred();
  //
  //   if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
  //     setTimeout(() => {
  //       deferred.reject(`Expect for cors ajax BAM call timed out for test ${this.#testId}`);
  //     }, timeout || this.#testServer.config.timeout);
  //   }
  //
  //   this.#deferredExpects.get('cors').add(deferred);
  //   return deferred.promise;
  // }

  expectCustomAssetServerAjax(path, timeout) {
    if (!this.#deferredCustomAjaxExpects.has('assetServer')) {
      this.#deferredCustomAjaxExpects.set('assetServer', new Set());
    }

    const deferred = this.#createDeferred();

    deferred.test = (request) => request.url === path;

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for custom assetServer ajax call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredCustomAjaxExpects.get('assetServer').add(deferred);
    return deferred.promise;
  }

  expectCustomBamServerAjax(path, timeout) {
    if (!this.#deferredCustomAjaxExpects.has('bamServer')) {
      this.#deferredCustomAjaxExpects.set('bamServer', new Set());
    }

    const deferred = this.#createDeferred();

    deferred.test = (request) => request.url === path;

    if (timeout === undefined || timeout === null || (typeof timeout === 'number' && timeout > 0)) {
      setTimeout(() => {
        deferred.reject(`Expect for custom bamServer ajax call timed out for test ${this.#testId}`);
      }, timeout || this.#testServer.config.timeout);
    }

    this.#deferredCustomAjaxExpects.get('bamServer').add(deferred);
    return deferred.promise;
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

    return { promise, resolve, reject };
  }
};
