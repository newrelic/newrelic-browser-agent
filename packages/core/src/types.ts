export interface NrOptions {
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

    privacy?: { cookies_enabled: boolean }
    ajax?: {deny_list: string[]}
    distributed_tracing?: {
        enabled?: boolean
        exclude_newrelic_header?: boolean
        cors_use_newrelic_header?: boolean
        cors_use_tracecontext_headers?: boolean
        allowed_origins?: string[]
    }
    obfuscate?: {regex: string | RegExp, replacement: string}[]
    page_view_timing?: { enabled: boolean };
    ssl?: boolean;

    accountID?: string
    trustKey?: string
    agentID?: string
    xpid?: string

    disabled?: NrFeatures[]
}


interface NrShared {
    applicationID?: string;
    licenseKey?: string;
}

export interface NrInfo extends NrShared {
    beacon?: string 
    errorBeacon?: string 
    licenseKey?: string 
    applicationID?: string
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
    page_view_timing: {enabled?: boolean},
    ssl?: boolean,
    obfuscate?: {regex: string | RegExp, replacement: string}[]
}

export interface NrLoaderConfig extends NrShared {
    accountID?: string
    trustKey?: string
    agentID?: string
    xpid?: string
    licenseKey?: undefined,
    applicationID?: undefined,
}

export enum NrFeatures {
    JSERRORS='js-errors',
    // AJAX='AJAX',
    // PAGE_VIEW_EVENT='PAGE_VIEW_EVENT',
    // PAGE_VIEW_TIMING='PAGE_VIEW_TIMING'
}

export type NrStoreError = (err: Error | String, time?: Number, internal?: any, customAttributes?: any) => void

export interface NrFeaturesWithApi { 
    [NrFeatures.JSERRORS]: {
        storeError: NrStoreError
    },
    // [NrFeatures.AJAX]: {},
    // [NrFeatures.PAGE_VIEW_EVENT]: {},
    // [NrFeatures.PAGE_VIEW_TIMING]: {}
}