import { FEATURE_NAMES } from '../../loaders/features/features'

export const INTERACTION_TRIGGERS = [
  'click', // e.g. user clicks link or the page back/forward buttons
  'keydown', // e.g. user presses left and right arrow key to switch between displayed photo gallery
  'submit' // e.g. user clicks submit butotn or presses enter while editing a form field
]
export const API_TRIGGER_NAME = 'api'
export const IPL_TRIGGER_NAME = 'initialPageLoad'

export const FEATURE_NAME = FEATURE_NAMES.softNav

export const INTERACTION_TYPE = {
  INITIAL_PAGE_LOAD: '',
  ROUTE_CHANGE: 1,
  UNSPECIFIED: 2
}

export const NODE_TYPE = {
  INTERACTION: 1,
  AJAX: 2,
  CUSTOM_END: 3,
  CUSTOM_TRACER: 4
}

export const INTERACTION_STATUS = {
  IP: 'in progress',
  FIN: 'finished',
  CAN: 'cancelled'
}
