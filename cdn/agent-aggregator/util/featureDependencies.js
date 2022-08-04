export function getFeatureDependencyNames(feature) {
    switch(feature){
        case 'ajax':
            return ['jserrors']
        case 'session-trace':
            return ['ajax']
        default:
            return []
    }
}