import { subscribeToEOL } from "@newrelic/browser-agent-core/src/common/unload/eol";

export const onLT = (onReport) => {
	const handleEntries = (entries) => {
		entries.forEach(entry => {
			const metric = {
				name: 'LT',
				value: entry.duration,
				info: {	// this property deviates from CWV std interface but will hold the custom context to send to NRDB
					ltFrame : entry.name,				// MDN: the browsing context or frame that can be attributed to the long task
					ltStart : entry.startTime,	// MDN: a double representing the time (millisec) when the task started
					ltCtr : entry.attribution[0].containerType			// MDN: type of frame container: 'iframe', 'embed', or 'object' ... but this can also be 'window'
				}
			}
			if (metric.info.ltCtr !== 'window') {	// the following properties are only of relevance & appended for html elements
				Object.assign(metric.info, {
					ltCtrSrc : entry.attribution[0].containerSrc,		// MDN: container's 'src' attribute
					ltCtrId : entry.attribution[0].containerId,			// MDN: container's 'id' attribute
					ltCtrName: entry.attribution[0].containerName		// MDN: container's 'name' attribute
				});
			}

			onReport(metric);	// report every long task observed unconditionally
		});
	};

	let po;
	try {
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      po = new PerformanceObserver((list) => {
        // Delay by a microtask to workaround a bug in Safari where the
        // callback is invoked immediately, rather than in a separate task.
        // See: https://github.com/GoogleChrome/web-vitals/issues/277
        Promise.resolve().then(() => {
          handleEntries(list.getEntries());
        });
      });
      po.observe({ type: "longtask", buffered: true });
    }
  } catch (e) {
    // Do nothing.
  }

	if (po) {
		subscribeToEOL(() => {
			handleEntries(po.takeRecords());
		}, true);	// this bool is a temp arg under staged BFCache work that runs the func under the new page session logic -- tb removed w/ the feature flag later

		/* No work needed on BFCache restore for long task. */
	}
}