import { originals } from "../../common/config/config"
import { FEATURE_NAMES } from "../../loaders/features/features";

export const FEATURE_NAME = FEATURE_NAMES.sessionTrace
export const RESOURCE_TIMING_BUFFER_FULL = 'resourcetimingbufferfull'
export const BST_RESOURCE = 'bstResource'
export const RESOURCE = 'resource'
export const START = '-start'
export const END = '-end'
export const FN_START = 'fn' + START
export const FN_END = 'fn' + END
export const BST_TIMER = 'bstTimer'
export const PUSH_STATE = 'pushState'
export const ORIG_EVENT = originals.EV
export const ADD_EVENT_LISTENER = 'addEventListener'
