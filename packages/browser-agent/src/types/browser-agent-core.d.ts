declare module "@newrelic/browser-agent-core/common/config/config" {
    export const setRuntime: any;
    export const setConfiguration: any;
    export const getConfiguration: any;
    export const setInfo: any;
    export const getInfo: any;
    export const setLoaderConfig: any;
    export const getLoaderConfig: any;
}

declare module "@newrelic/browser-agent-core/common/window/nreum" {
    export const gosNREUMInitializedAgents: any;
}

declare module "@newrelic/browser-agent-core/common/ids/unique-id" {
    export const generateRandomHexString: any;
}

declare module "@newrelic/browser-agent-core/common/aggregate/aggregator" {
    export const Aggregator: any;
    export type Aggregator = any;
}

declare module "@newrelic/browser-agent-core/common/drain/drain" {
    export const drain: any;
}

declare module "@newrelic/browser-agent-core/common/timing/now" {
    export const now: any;
}
