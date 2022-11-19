export interface NrErrorParams {
  /**
   * The class name of the exception.
   * @example throw new Error() => "Error"
   * @example throw "" => "String"
   */
  exceptionClass: string;

  /**
   * The content of the error.
   */
  message: string;

  /**
   * Custom property customers can add to errors
   * for the use of identifying which errors relate
   * to which releases of their own code.
   * @see https://docs.newrelic.com/docs/browser/new-relic-browser/browser-agent-spa-api/add-release/
   */
  releaseIds: string;

  /**
   * The URI portion of the current page location.
   */
  request_uri: string;

  /**
   * A hash value of the canonical stack trace. We hash the canonical
   * stack trace to provide as close to a cross-browser hash of the
   * error. In most cases of the latest browsers, while the stack
   * trace may be different, we are able to produce an identical
   * canonical stack and the hashes will match.
   */
  stackHash?: number;

  /**
   * The raw stack trace produced by the browser with a few
   * modifications. Specifically, the URLs within the stack
   * trace are canonicalized.
   */
  stack_trace: string;

  /**
   * An indicator used by the backend to determine if the error
   * harvested is the first seen on the current page. Identical
   * errors transmitted in subsequent harvests should not have
   * this property.
   */
  pageview?: number;

  /**
   * A hash value of the stack_trace property. This is used in place
   * of the stack_trace property for identical errors that have already
   * been transmitted in a previous harvest for the current page. This
   * is done to reduce the payload size in the harvest while still allowing
   * the backend to tie the error back to a stack trace.
   */
  browser_stack_hash?: number;

  // The below properties are added by the spa feature

  _interactionId?: number;
  _interactionNodeId?: number;
  browserInteractionId?: number;
  parentNodeId?: string;
}

export interface NrErrorMetrics {
  time: number;
}

export interface NrParsedError {
  name?: string;
  message?: string;
  stack?: string;
  hash?: number;
}

export interface NrErrorStackTraceFrame {
  url?: string | null;
  func?: string | null;
  line?: number | null;
  column?: number | null;
}

export interface NrErrorBody {
  custom?: Record<string, any>;
  metrics?: Record<string, any>;
  params: NrErrorParams;
}
