export function getFeatureDependencyNames(feature) {
    switch(feature){
        case 'ajax':
            return ['jserrors']
        case 'session-trace':
            return ['ajax', 'page-view-event']
        case 'page-view-timing':
            return ['page-view-event'] // this could change if we disconnect window load timings
        default:
            return []
    }
}

export function getFrozenAttributes(feature) {
    switch(feature){
        case 'ajax':
        case 'metrics':
        case 'page_action':
        case 'page_view_event':
        case 'page_view_timing':
        case 'session_trace':
        case 'spa':
            return ['auto', 'harvestTimeSeconds'] 
            // right now, jserrors is the only feature that can have "on" or "off" page-level auto-instrumentation...
            // page_action is always "off" (no instr)
            // as new API/manual implementation methods are added, this list can likely be pruned
        case 'jserrors':
        default:
            return ['harvestTimeSeconds']
    }
}