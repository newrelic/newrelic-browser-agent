
export const modules = {
  pageViewEvent: 'page-view-event',
  pageViewTiming: 'page-view-timing',
  jsErrors: 'js-errors',
  ajax: 'ajax',
  pageAction: 'page-action',
  sessionTrace: 'session-trace'
}

const lite = [modules.pageViewEvent, modules.pageViewTiming]
const pro = [...lite, modules.jsErrors, modules.ajax, modules.pageAction, modules.sessionTrace]
const spa = [...pro] // add spa module here when built

export const features = {lite, pro, spa}
