import { FEATURE_NAMES } from '../../loaders/features/features'

export const INTERACTION_TRIGGERS = [
  'click', // e.g. user clicks link or the page back/forward buttons
  'submit' // e.g. user clicks submit butotn or presses enter while editing a form field
]

export const FEATURE_NAME = FEATURE_NAMES.softNav

export const INTERACTION_TYPE = {
  INITIAL_PAGE_LOAD: 0,
  ROUTE_CHANGE: 1,
  CUSTOM: 2
}

export const NODE_TYPE = {
  INTERACTION: 1,
  AJAX: 2,
  CUSTOM_TRACER: 4
}
