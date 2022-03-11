export interface NrInfo {
    beacon: string 
    errorBeacon: string 
    licenseKey: string 
    applicationID: string
    sa: number
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
    privacy?: { cookies_enabled: boolean }
    ajax?: {deny_list: string[]}
    distributed_tracing?: {
        enabled?: boolean
        exclude_newrelic_header?: boolean
        cors_use_newrelic_header?: boolean
        cors_use_tracecontext_headers?: boolean
        allowed_origins?: string[]
    }
}

export interface NrLoaderConfig {
    accountID?: string
    trustKey?: string
    agentID?: string
    licenseKey?: string
    applicationID?: string
    xpid?: string
}

export enum NrFeatures {
    JSERRORS='JSERRORS',
    AJAX='AJAX'
}

export type NrStoreError = (err: Error | String, time?: Number, internal?: any, customAttributes?: any) => void