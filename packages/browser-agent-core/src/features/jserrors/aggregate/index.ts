import { FeatureBase } from "../../../common/util/feature-base";
import { getRuntime } from "../../../common/config/state/runtime";
import { registerHandler as register } from "../../../common/event-emitter/register-handler";
import { getConfigurationValue } from "../../../common/config/state/init";
import { HarvestScheduler } from "../../../common/harvest/harvest-scheduler";
import { stringify } from "../../../common/util/stringify";
import { stringHashCode } from "./string-hash-code";
import { now } from "../../../common/timing/now";
import { handle } from "../../../common/event-emitter/handle";
import { getInfo } from "../../../common/config/state/info";
import {
  NrErrorBody,
  NrErrorMetrics,
  NrErrorParams,
} from "./aggregate-interfaces";
import { parseError } from "./parser";

export class Aggregate extends FeatureBase {
  // Maximum stack trace string length dictated by backend
  private static readonly maxStackTraceLength = 65530;

  /**
   * Instance level cache to hold errors that occur during a SPA interaction
   * for processing once the interaction completes (onInteractionSaved) or
   * fails (onInteractionDiscarded).
   */
  private readonly errorCache = new Map<
    number,
    [
      "err" | "ierr",
      number,
      NrErrorParams,
      NrErrorMetrics,
      Record<string, unknown>
    ][]
  >();

  /**
   * Instance level cache to hold the hash of errors already seen on the current
   * page view. This is used to modify how we report identical errors in subsequent
   * harvests.
   */
  private readonly stackReported = new Set<number>();

  /**
   * Instance level cache to hold errors between the onHarvestStart and
   * onHarvestEnd callbacks. This is used for retry logic and is cleared
   * in onHarvestEnd.
   */
  private currentBody?: {
    err?: NrErrorBody[];
    ierr?: NrErrorBody[];
  };

  private readonly scheduler!: HarvestScheduler;
  private errorOnPage = false;

  constructor(agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator);

    const agentRuntime = getRuntime(this.agentIdentifier);
    // bail if not instrumented
    if (!agentRuntime.features.err) {
      return;
    }

    // this will need to change to match whatever ee we use in the instrument
    this.ee.on("interactionSaved", this.onInteractionSaved.bind(this));

    // this will need to change to match whatever ee we use in the instrument
    this.ee.on("interactionDiscarded", this.onInteractionDiscarded.bind(this));

    register("err", this.storeError.bind(this), undefined, this.ee);
    register("ierr", this.storeError.bind(this), undefined, this.ee);

    const harvestTimeSeconds =
      getConfigurationValue(
        this.agentIdentifier,
        "jserrors.harvestTimeSeconds"
      ) || 10;

    this.scheduler = new HarvestScheduler(
      "jserrors",
      { onFinished: this.onHarvestFinished.bind(this) },
      this
    );
    this.scheduler.harvest.on("jserrors", this.onHarvestStarted.bind(this));
    this.scheduler.startTimer(harvestTimeSeconds);
  }

  private onHarvestStarted(options: any) {
    const body = this.aggregator.take(["err", "ierr"]);

    if (options.retry) {
      this.currentBody = body;
    }

    const payload: any = { body: body, qs: {} };
    const releaseIds = stringify(getRuntime(this.agentIdentifier).releaseIds);

    if (releaseIds !== "{}") {
      payload.qs.ri = releaseIds;
    }

    if (body && body.err && body.err.length && !this.errorOnPage) {
      payload.qs.pve = "1";
      this.errorOnPage = true;
    }
    return payload;
  }

  private onHarvestFinished(result: any) {
    if (result.retry && this.currentBody) {
      Object.keys(this.currentBody).forEach((key) => {
        const value = (this.currentBody as { [key: string]: NrErrorBody[] })[
          key
        ];
        for (let i = 0; i < value.length; i++) {
          const bucket = value[i];
          const name =
            bucket.params.stackHash +
            ":" +
            stringHashCode(stringify(bucket.custom));
          this.aggregator.merge(
            key,
            name,
            bucket.metrics,
            bucket.params,
            bucket.custom
          );
        }
      });
      this.currentBody = undefined;
    }
  }

  private storeError(
    error: Error | string,
    time: number,
    internal: boolean,
    customAttributes: Record<string, unknown>
  ) {
    time = time || now();

    // TODO: Figure out what this does, why its needed, and document it
    // are we in an interaction
    if (
      !internal &&
      getRuntime(this.agentIdentifier).onerror &&
      getRuntime(this.agentIdentifier).onerror(error)
    )
      return;

    const type = internal ? "ierr" : "err";
    const errorMetrics: NrErrorMetrics = { time };
    const parsedError = parseError(
      this.ee,
      getRuntime(this.agentIdentifier),
      error
    );
    const errorParams: Partial<NrErrorParams> = {
      exceptionClass: parsedError.name,
      message: parsedError.message,
      stackHash: parsedError.hash,
      request_uri: self.location.pathname,
      releaseIds: stringify(getRuntime(this.agentIdentifier).releaseIds),
    };

    const bucketingHash = stringHashCode(`${parsedError.name}_${parsedError.message}_${parsedError.stack}`);

    /**
     * If the error is identical to one reported in a previous harvest, send
     * browser_stack_hash instead of stack_trace and pageview.
     */
    if (this.stackReported.has(bucketingHash)) {
      errorParams.browser_stack_hash = stringHashCode(parsedError.stack as string)
    } else if (errorParams.stackHash) {
      errorParams.stack_trace = this.truncateSize(parsedError.stack);
      errorParams.pageview = 1;
      this.stackReported.add(bucketingHash);
    }

    // stn and spa aggregators listen to this event - stn sends the error in its payload,
    // and spa annotates the error with interaction info
    handle(
      "errorAgg",
      [type, bucketingHash, errorParams, errorMetrics],
      undefined,
      undefined,
      this.ee
    );

    if (errorParams._interactionId != null) {
      // hold on to the error until the interaction finishes

      if (!this.errorCache.has(errorParams._interactionId)) {
        this.errorCache.set(errorParams._interactionId, []);
      }

      (this.errorCache.get(errorParams._interactionId) || []).push([
        type,
        bucketingHash,
        errorParams as NrErrorParams,
        errorMetrics,
        customAttributes,
      ]);
    } else {
      // store custom attributes
      const customParams = {};
      const att = getInfo(this.agentIdentifier).jsAttributes;
      Object.keys(att).forEach((key) => {
        const val = att[key];
        customParams[key] =
          val && typeof val === "object" ? stringify(val) : val;
      });

      if (customAttributes) {
        Object.keys(customAttributes).forEach((key) => {
          const val = customAttributes[key];
          customParams[key] =
            val && typeof val === "object" ? stringify(val) : val;
        });
      }

      const jsAttributesHash = stringHashCode(stringify(customParams));
      const aggregateHash = bucketingHash + ":" + jsAttributesHash;
      this.aggregator.store(
        type,
        aggregateHash,
        errorParams,
        errorMetrics,
        customParams
      );
    }
  }

  private onInteractionSaved(interaction) {
    if (!this.errorCache.has(interaction.id)) {
      return;
    }

    (this.errorCache.get(interaction.id) || []).forEach((item) => {
      const customParams = {};
      const localCustomParams = item[4];

      Object.keys(interaction.root.attrs.custom).forEach((key) => {
        const val = interaction.root.attrs.custom[key];
        customParams[key] =
          val && typeof val === "object" ? stringify(val) : val;
      });

      if (localCustomParams) {
        Object.keys(localCustomParams).forEach((key) => {
          const val = localCustomParams[key];
          customParams[key] =
            val && typeof val === "object" ? stringify(val) : val;
        });
      }

      const params = item[2];
      params.browserInteractionId = interaction.root.attrs.id;
      params._interactionId = undefined;

      if (params._interactionNodeId) {
        params.parentNodeId = params._interactionNodeId.toString();
        params._interactionNodeId = undefined;
      }

      const hash = item[1] + interaction.root.attrs.id;
      const jsAttributesHash = stringHashCode(stringify(customParams));
      const aggregateHash = hash + ":" + jsAttributesHash;

      this.aggregator.store(
        item[0],
        aggregateHash,
        params,
        item[3],
        customParams
      );
    });

    this.errorCache.delete(interaction.id);
  }

  private onInteractionDiscarded(interaction) {
    if (!this.errorCache.has(interaction.id)) {
      return;
    }

    (this.errorCache.get(interaction.id) || []).forEach((item) => {
      const customParams = {};
      const localCustomParams = item[4];

      Object.keys(interaction.root.attrs.custom).forEach((key) => {
        const val = interaction.root.attrs.custom[key];
        customParams[key] =
          val && typeof val === "object" ? stringify(val) : val;
      });

      if (localCustomParams) {
        Object.keys(localCustomParams).forEach((key) => {
          const val = localCustomParams[key];
          customParams[key] =
            val && typeof val === "object" ? stringify(val) : val;
        });
      }

      const params = item[2];
      params._interactionId = undefined;
      params._interactionNodeId = undefined;

      const hash = item[1];
      const jsAttributesHash = stringHashCode(stringify(customParams));
      const aggregateHash = hash + ":" + jsAttributesHash;

      this.aggregator.store(
        item[0],
        aggregateHash,
        item[2],
        item[3],
        customParams
      );
    });

    this.errorCache.delete(interaction.id);
  }

  /**
   * Truncates the stack trace string to fit the established limit.
   */
  private truncateSize(stackString?: string | null): string {
    if (typeof stackString !== "string") {
      return "";
    }

    return stackString.length > Aggregate.maxStackTraceLength
      ? stackString.substring(0, Aggregate.maxStackTraceLength)
      : stackString;
  }
}
