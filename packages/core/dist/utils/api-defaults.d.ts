import { NrFeatures } from "../types";
export declare function initialize(features: NrFeatures[]): Promise<void[]>;
export declare function storeError(err: Error | String, time?: Number, internal?: any, customAttributes?: any): void;
