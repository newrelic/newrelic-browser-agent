/**
 * All-in-one checker for ECMAScript spec APIs that the agent use which would require polyfills.
 * @returns {object} Enum-like mapping of feature names to their supportability status
 */
export function detectPolyfillFeatures() {
    const featureStatus = {};
    checkAndAddFeature('Promise', 'PROMISE');
    checkAndAddFeature('Array.prototype.includes', 'ARRAY_INCLUDES');
    checkAndAddFeature('Object.assign', 'OBJECT_ASSIGN');
    checkAndAddFeature('Object.entries', 'OBJECT_ENTRIES');
    return featureStatus;

    /**
     * [Helper] Checks if an API (in string format, e.g. 'Array.prototype.includes') exists, and assign a corresponding status to it.
     * - Note: we can't ref the function itself because if it doesn't exist, this method call will throw a non handle-able ReferenceError
     * - WARNING: this uses eval(), so do NOT pass an untrusted variable or user-input string into the 'funcString' variable!
     * @param {string} funcString - class or function of the global scope in string format
     * @param {string} featName - key for the featureStatus obj
     */
    function checkAndAddFeature(funcString, featName) {
        try {
            let func = eval('self.' + funcString);  // a non-existent API will throw an error
            if (func.toString().indexOf('[native code]') !== -1)
                featureStatus[featName] = Status.NATIVE;
            else
                featureStatus[featName] = Status.CHANGED;
        } catch {
            featureStatus[featName] = Status.UNAVAIL;
        }
    }
}

/**
 * State of a feature's code implementation.
 * @enum {string}
 */
const Status = {
    UNAVAIL: 'NotSupported',
    NATIVE: 'Detected',
    CHANGED: 'Modified' // This could mean it was polyfilled, framework or library implemented, or custom wrapped already
}