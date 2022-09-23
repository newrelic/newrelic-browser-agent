export default {workersApiIsSupported, insertSupportMetrics};

/**
 * True if Web Workers are supported in browser's execution context. Not all browser versions may support certain Workers or options however.
 * - Warning: service workers are not available on unsecured HTTP sites
 */
const workersApiIsSupported = Boolean(self.Worker && self.SharedWorker && self.ServiceWorker);

let origWorker, origSharedWorker, origServiceWorkerCreate;
/**
 * Un-instrument support metrics for Workers.
 * @returns void
 */
function resetSupportability() {
    if (!origWorker) return;    // Worker wasn't changed by this module or was already restored
    self.Worker = origWorker;
    self.SharedWorker = origSharedWorker;
    self.navigator.serviceWorker.register = origServiceWorkerCreate;
    origWorker = origSharedWorker = origServiceWorkerCreate = undefined;
}

/**
 * Injects code to report Web Workers supportability and usage as metrics, replacing the native API in global scope as a side effect.
 * @param {func} report - handles reporting of supportability metrics to NR1
 * @returns void
 */
function insertSupportMetrics(report) {
    if (origWorker) return; // ensure we only insert the metrics once
    if (!workersApiIsSupported) {
        report('Workers/NotSupported'); // accounts for: old browser versions w/o all 3 workers API, non-HTTPS sites
        return;
    }
    origWorker = Worker;
    origSharedWorker = SharedWorker;
    origServiceWorkerCreate = navigator.serviceWorker.register;

    try {
        self.Worker = extendWorkerConstructor(origWorker, 'Dedicated');
        self.SharedWorker = extendWorkerConstructor(origSharedWorker, 'Shared');
        self.navigator.serviceWorker.register = extendServiceCreation(origServiceWorkerCreate);
    } catch (e) {
        report('Workers/Implementation/Unsupported');   // this indicates the browser version doesn't support how code is injected, such as Proxy API
        console.warning("NR Agent: ", e);
    }
    return;

    // --- Internal helpers ---
    /**
     * Report each time a Worker or SharedWorker is created in page execution. Note the current trap is set for only "new" and Reflect.construct operations.
     * @param {func obj} origClass - Worker() or SharedWorker()
     * @param {string} workerType - 'Dedicated' or 'Shared'
     * @returns Proxy worker that intercepts the original constructor
     */
    function extendWorkerConstructor(origClass, workerType) {
        const newHandler = {
            construct(oConstructor, args) {
                if (args[1]?.type === 'module') {
                    report(`Workers/${workerType}/Module`);
                } else {
                    report(`Workers/${workerType}/Classic`);
                }
                return new oConstructor(...args);
            }
        }
        return new Proxy(origClass, newHandler);
    }
    /**
     * Report each time a ServiceWorkerRegistration is created or updated in page execution.
     * @param {func} origFunc - method responsible for creating a ServiceWorker
     * @returns Refer to ServiceWorkerContainer.register()
     */
    function extendServiceCreation(origFunc) {
        return (...args) => {
            if (args[1]?.type === 'module') {
                report('Workers/Service/Module');
            } else {
                report('Workers/Service/Classic');
            }
            return origFunc.apply(navigator.serviceWorker, args);   // register() has to be rebound to the ServiceWorkerContainer object
        }
    }
}
