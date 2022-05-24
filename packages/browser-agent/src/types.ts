export interface NrInterface {
    config: { info: NrInfo, config: NrConfig, loader_config: NrLoaderConfig };
    features: AppFeatures;
    start: NrInitialize,
    noticeError: NrNoticeError
}

export class NrFeature {
    private _enabled: boolean = true
    private _auto: boolean = true
    
    constructor(public name: NrFeatures){}

    get enabled (): boolean {
        return this._enabled
    }

    set enabled(val: boolean) {
        this._enabled = Boolean(val)
    }

    get auto(): boolean {
        return this._auto
    }

    set auto(val: boolean) {
        this._auto = val
    }
}
export interface AppFeatures {
    'errors': NrFeature
}

export interface NrOptions extends NrInfo, NrConfig, NrLoaderConfig {}

interface NrShared {
    applicationID?: string;
    licenseKey?: string;
}

export interface NrInfo extends NrShared {
    applicationID: string;
    licenseKey: string;
    beacon: string // sets beacon and errorBeacon
    errorBeacon?: string
    sa?: number
    queueTime?: number; 
    applicationTime?: number; 
    ttGuid?: string ; 
    user?: string; 
    account?: string; 
    product?: string; 
    extra?: string; 
    userAttributes?: string; 
    atts?: string; 
    transactionName?: string; 
    tNamePlain?: string; 
}

export interface NrConfig {
    privacy?: { cookies_enabled?: boolean }
    ajax?: {deny_list?: string[]}
    distributed_tracing?: {
        enabled?: boolean
        exclude_newrelic_header?: boolean
        cors_use_newrelic_header?: boolean
        cors_use_tracecontext_headers?: boolean
        allowed_origins?: string[]
    }
    page_view_timing?: { enabled?: boolean };
    ssl?: boolean;
    obfuscate?: {regex?: string | RegExp, replacement?: string}[]
}

export interface NrLoaderConfig extends NrShared {
    accountID?: string
    trustKey?: string
    agentID?: string
    xpid?: string
    licenseKey: string,
    applicationID: string,
}

export enum NrFeatures {
    JSERRORS='js-errors',
    // AJAX='AJAX',
    // PAGE_VIEW_EVENT='PAGE_VIEW_EVENT',
    // PAGE_VIEW_TIMING='PAGE_VIEW_TIMING'
}

export type NrStoreError = (err: Error | String, time?: Number, internal?: any, customAttributes?: any) => void
export type NrInitialize = (opts: NrOptions) => Promise<Boolean>
export type NrNoticeError = (err: Error | String, customAttributes: Object) => void;
export interface NrFeaturesWithApi { 
    [NrFeatures.JSERRORS]: {
        noticeError: NrStoreError
    },
    // [NrFeatures.AJAX]: {},
    // [NrFeatures.PAGE_VIEW_EVENT]: {},
    // [NrFeatures.PAGE_VIEW_TIMING]: {}
}

export interface NrImportPaths {
    aggregate: string, instrument: string
}
