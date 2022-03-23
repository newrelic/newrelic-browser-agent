"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeError = exports.initialize = void 0;
var types_1 = require("../types");
// export function recordError(err: string | Error, customAttributes, time) {
//     if (typeof err === 'string') err = new Error(err)
//     recordSupportability('API/noticeError/called')
//     time = time || now()
//     handle('err', [err, time, false, customAttributes])
//   }
// export function recordPageAction() {
// }
var initialized = false;
var api = {
    storeError: null
};
function initialize(features) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            console.log("initialized agent! Setting up API!");
            initialized = true;
            return [2 /*return*/, Promise.all(features.map(function (feature) { return __awaiter(_this, void 0, void 0, function () {
                    var storeError_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!(feature === types_1.NrFeatures.JSERRORS)) return [3 /*break*/, 2];
                                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../../../modules/features/js-errors/aggregate')); })];
                            case 1:
                                storeError_1 = (_a.sent()).storeError;
                                api.storeError = storeError_1;
                                _a.label = 2;
                            case 2: return [2 /*return*/];
                        }
                    });
                }); }))];
        });
    });
}
exports.initialize = initialize;
function storeError(err, time, internal, customAttributes) {
    if (initialized && !!api.storeError)
        return api.storeError(err, time, internal, customAttributes);
    // if the agent has not been started, the source API method will have not been loaded...
    if (!initialized && !api.storeError)
        return notInitialized(types_1.NrFeatures.JSERRORS);
    // if the error feature module is disabled, this function throws a warning message
    if (initialized && !api.storeError)
        return isDisabled(types_1.NrFeatures.JSERRORS, 'storeError');
}
exports.storeError = storeError;
function notInitialized(featureName) {
    console.warn("You are calling a ".concat(featureName, " Feature API, but the Browser Agent has not been started... Please start the agent using .start({...opts})"));
}
function isDisabled(featureName, methodName) {
    console.warn("The ".concat(featureName, " Feature of the New Relic Browser Agent Has Been Disabled. Method \"").concat(methodName, "\" will not do anything!"));
}
