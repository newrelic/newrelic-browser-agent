export interface BrowserAgent {
  config: NrOptions;
  start: (options: NrOptions) => Promise<boolean>;
  sharedAggregator: any;
  features: any[];
  agentIdentifier: String;
  setErrorHandler: (filterCallback: ErrorHandler) => void;
  finished: (timestamp?: number) => void;
  inlineHit: () => void;
  addRelease: (releaseName: string, releaseId: string) => void;
  addPageAction: (
    name: string,
    attributes?: Record<string, SimpleType>
  ) => void;
  addToTrace: (eventObject: EventObject) => void;
  setCurrentRouteName: (name: string | null) => void;
  setPageViewName: (name: string, host?: string) => void;
  setCustomAttribute: (name: string, value: SimpleType) => void;
  interaction: () => BrowserInteraction;
  noticeError: (
    error: Error | string,
    customAttributes?: Record<string, SimpleType>
  ) => void;
}

export interface NrOptions {
  info: NrInfo;
  init: NrInit;
  loader_config: NrLoaderConfig;
  runtime: NrRuntime;
  exposed: boolean;
}

interface NrShared {
  applicationID?: string;
  licenseKey?: string;
}

export interface NrRuntime {
  customTransaction?: any;
  disabled?: boolean;
  features?: {};
  maxBytes?: boolean;
  offset?: number;
  onerror?: () => boolean;
  origin?: string;
  ptid?: string;
  releaseIds?: {};
  sessionId?: string;
  xhrWrappable?: boolean;
  userAgent?: string;
}

export interface NrInfo extends NrShared {
  applicationID: string;
  licenseKey: string;
  beacon: string; // sets beacon and errorBeacon
  errorBeacon?: string;
  sa?: number;
  queueTime?: number;
  applicationTime?: number;
  ttGuid?: string;
  user?: string;
  account?: string;
  product?: string;
  extra?: string;
  userAttributes?: string;
  atts?: string;
  transactionName?: string;
  tNamePlain?: string;
}

export interface NrInit {
  privacy?: { cookies_enabled?: boolean }; // *cli - per discussion, default should be boolean
  ajax?: {
    deny_list?: string;
    enabled?: boolean;
    auto?: boolean;
    harvestTimeSeconds?: number;
  };
  distributed_tracing?: {
    enabled?: boolean;
    exclude_newrelic_header?: boolean;
    cors_use_newrelic_header?: boolean;
    cors_use_tracecontext_headers?: boolean;
    allowed_origins?: string[];
  };
  ssl?: boolean;
  obfuscate?: { regex?: string | RegExp; replacement?: string }[];
  jserrors?: { enabled?: boolean; auto?: boolean; harvestTimeSeconds?: number };
  metrics?: { enabled?: boolean; auto?: boolean };
  page_action?: {
    enabled?: boolean;
    auto?: false;
    harvestTimeSeconds?: number;
  };
  page_view_event?: { enabled?: boolean; auto?: boolean };
  page_view_timing?: {
    enabled?: boolean;
    auto?: boolean;
    harvestTimeSeconds?: number;
  };
  session_trace?: {
    enabled?: boolean;
    auto?: boolean;
    harvestTimeSeconds?: number;
  };
  spa?: { enabled?: boolean; auto?: boolean; harvestTimeSeconds?: number };
}

export interface NrLoaderConfig extends NrShared {
  accountID?: string;
  trustKey?: string;
  agentID?: string;
  xpid?: string;
  licenseKey: string;
  applicationID: string;
}

export type NrNoticeError = (
  err: Error | String,
  customAttributes: Object
) => void;

interface EventObject {
  /** Event name */
  name: string;
  /** Start time in ms since epoch */
  start: number;
  /** End time in ms since epoch.  Defaults to same as start resulting in trace object with a duration of zero. */
  end?: number | undefined;
  /** Origin of event */
  origin?: string | undefined;
  /** Event type */
  type?: string | undefined;
}

interface BrowserInteraction {
  /**
   * Sets the text value of the HTML element that was clicked to start a browser interaction.
   *
   * @param value The text value of the HTML element that represents the action that started the interaction.
   * @returns This method returns the same API object created by interaction().
   * @see https://docs.newrelic.com/docs/browser/new-relic-browser/browser-agent-spa-api/actiontext-browser-spa-api
   */
  actionText(value: string): this;

  /**
   * Times sub-components of a SPA interaction separately, including wait time and JS execution time.
   *
   * @param name This will be used as the name of the tracer. If you do not include a name,
   *   New Relic Browser does not add a node to the interaction tree. The callback time will be
   *   attributed to the parent node.
   * @param callback A callback that contains the synchronous work to run at the end of the async work.
   *   To execute this callback, call the wrapper function returned using createTracer()
   * @returns This method ends the async time. It calls (and times) the callback that was passed into createTracer().
   * @see https://docs.newrelic.com/docs/browser/new-relic-browser/browser-agent-spa-api/spa-create-tracer
   */
  createTracer(name: string, callback?: Callback): Wrapper;

  /**
   * Ends the New Relic SPA interaction at the current time.
   *
   * @returns This method returns the same API object created by interaction().
   * @see https://docs.newrelic.com/docs/browser/new-relic-browser/browser-agent-spa-api/spa-end
   */
  end(): this;

  /**
   * Stores values across the current SPA interaction asynchronously in New Relic Browser.
   *
   * @param callback A function that accepts the interaction context object
   *   as its only argument.
   * @returns This method returns the same API object created by interaction().
   * @see https://docs.newrelic.com/docs/browser/new-relic-browser/browser-agent-spa-api/spa-get-context
   */
  // tslint:disable-next-line:no-unnecessary-generics
  getContext<T extends Record<string, any>>(
    callback: GetContextCallback<T>
  ): this;

  /**
   * Overrides other SPA save() calls; ignores an interaction so it is not saved or sent to New Relic.
   *
   * @returns This method returns the same API object created by interaction().
   * @see https://docs.newrelic.com/docs/browser/new-relic-browser/browser-agent-spa-api/spa-ignore-browser
   */
  ignore(): this;

  /**
   * Adds custom attributes for SPA interactions to the end of an event. It is called when the interaction
   * has finished. You can invoke methods to modify the interaction, but methods that have asynchronous
   * side effects will not have an effect.
   *
   * @returns This method returns the same API object created by interaction().
   * @see https://docs.newrelic.com/docs/browser/new-relic-browser/browser-agent-spa-api/spa-on-end
   */
  // tslint:disable-next-line:no-unnecessary-generics
  onEnd<T extends Record<string, any>>(callback: GetContextCallback<T>): this;

  /**
   * Ensures a SPA browser interaction will be saved when it ends.
   *
   * @returns This method returns the same API object created by interaction().
   * @see https://docs.newrelic.com/docs/browser/new-relic-browser/browser-agent-spa-api/spa-save
   */
  save(): this;

  /**
   * Adds a custom SPA attribute only to the current interaction in New Relic Browser.
   *
   * @param key Used as the attribute name on the BrowserInteraction event.
   * @param value Used as the attribute value on the BrowserInteraction event. This can be a
   *   string, number, boolean, or object. If it is an object, New Relic serializes it to a JSON string.
   * @returns This method returns the same API object created by interaction().
   * @see https://docs.newrelic.com/docs/browser/new-relic-browser/browser-agent-spa-api/spa-set-attribute
   */
  setAttribute(key: string, value: ComplexType): this;

  /**
   * Sets the name and trigger of a SPA's browser interaction that is not a route change or URL change.
   *
   * @param name If null, the name will be set using the targetGroupedUrl attribute.
   *   If not null, this will set the browserInteractionName attribute in the BrowserInteraction event.
   * @param trigger If not null, this will set the TRIGGER attribute on the BrowserInteraction event.
   * @returns This method returns the same API object created by interaction().
   * @see https://docs.newrelic.com/docs/browser/new-relic-browser/browser-agent-spa-api/spa-set-name
   */
  setName(name: string, trigger?: string): this;
}

interface Callback {
  (): void;
}

interface ErrorHandler {
  (err: any): boolean;
}

interface GetContextCallback<T extends Record<string, any>> {
  (contextObject: T): void;
}

interface Wrapper {
  (): void;
}

type SimpleType = string | number;
type ComplexType = string | number | boolean | unknown;
