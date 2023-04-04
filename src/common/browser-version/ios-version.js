export const isiOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent)

/* Feature detection to get our version(s). */

// Shared Web Workers introduced in iOS 16.0+ and n/a in 15.6-
export const iOS_below16 = isiOS && Boolean(typeof SharedWorker === 'undefined')
/* ^ It was discovered in Safari 14 (https://bugs.webkit.org/show_bug.cgi?id=225305) that the buffered flag in PerformanceObserver
	did not work. This affects our onFCP metric in particular since web-vitals uses that flag to retrieve paint timing entries.
	This was fixed in v16+.
*/
