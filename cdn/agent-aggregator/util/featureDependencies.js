export function getFeatureDependencyNames(feature) {
    switch(feature){
        case 'ajax':
            return ['jserrors']
        default:
            return []
    }
}