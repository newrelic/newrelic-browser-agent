import { NrConfig, NrFeatures, NrInfo, NrLoaderConfig } from './types';
import { storeError } from './utils/api-defaults';
declare const nr: {
    disable: (features: NrFeatures[] | NrFeatures) => void;
    readonly features: NrFeatures[];
    start: typeof initialize;
    storeError: typeof storeError;
};
export default nr;
export { initialize as init };
declare function initialize({ info, config, loader_config }: {
    info: NrInfo;
    config?: NrConfig;
    loader_config?: NrLoaderConfig;
}): Promise<void>;
