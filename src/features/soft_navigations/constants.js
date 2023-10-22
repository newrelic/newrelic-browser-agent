import { FEATURE_NAMES } from '../../loaders/features/features'

export const INTERACTION_EVENTS = [
  'click',
  'submit',
  'keypress',
  'keydown',
  'keyup',
  'change'
]

export const FEATURE_NAME = FEATURE_NAMES.softNav

export const CATEGORY = {
  INITIAL_PAGE_LOAD: 0,
  ROUTE_CHANGE: 1,
  CUSTOM: 2
}

export const TYPE_IDS = {
  INTERACTION: 1,
  AJAX: 2,
  CUSTOM_TRACER: 4
}
