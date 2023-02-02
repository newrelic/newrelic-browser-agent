const browserMatcher = require("../../../tools/jil/index").Matcher;

/**
 * @type {string[]}
 * @description The types of workers that get tested against. See tests/assets/worker/{type}-worker.html. Add "shared" to this array to run against Shared Workers (local only, does not work in GH).
 */
const workerTypes = ["classic", "module"];

/**
 * @param {string} type - one of the workerTypes
 * @returns BrowserMatcher for the versions that support the type of worker
 */
const typeToMatcher = (type) => {
  switch (type) {
    case "classic":
      return browserMatcher.withFeature("workers");
    case "module":
      return browserMatcher.withFeature("workersFull");
    case "shared":
      return browserMatcher.withFeature("sharedWorkers");
  }
};

/**
 * @property {boolean} isWorker - A custom attribute that gets set at configure() to denote if the global scope is a worker
 */
const workerCustomAttrs = {
  isWorker: true,
};

module.exports = { workerTypes, typeToMatcher, workerCustomAttrs };
