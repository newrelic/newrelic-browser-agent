"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeError = exports.recordPageAction = exports.recordError = void 0;
var now_1 = require("../../../../modules/common/timing/now");
var handle_1 = require("../../../../modules/common/event-emitter/handle");
var metrics_1 = require("../../../../modules/common/metrics/metrics");
function recordError(err, customAttributes, time) {
    if (typeof err === 'string')
        err = new Error(err);
    (0, metrics_1.recordSupportability)('API/noticeError/called');
    time = time || (0, now_1.now)();
    (0, handle_1.handle)('err', [err, time, false, customAttributes]);
}
exports.recordError = recordError;
function recordPageAction() {
}
exports.recordPageAction = recordPageAction;
function storeError(err, time, internal, customAttributes) {
    // this gets replaced by the error feature module
    // if the error feature module is disabled, this function throws a warning message
    console.warn("The JS-Errors Feature of the New Relic Browser Agent Has Been Disabled. Method \"storeError\" will not do anything!");
}
exports.storeError = storeError;
