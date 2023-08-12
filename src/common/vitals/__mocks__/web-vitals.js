const vital = { value: 1, entries: [{ startTime: 1, name: 'name', size: 1, id: 'id', url: 'url', element: { tagName: 'tagName' } }], id: 'id' }

const continuouslyReportMetric = c => {
  // report a new metric every quarter second
  const callcb = () => {
    setTimeout(() => {
      c(vital)
      callcb()
    }, 250)
  }
  callcb()
}

export const onCLS = c => continuouslyReportMetric(c)
export const onFCP = c => continuouslyReportMetric(c)
export const onFID = c => continuouslyReportMetric(c)
export const onINP = c => continuouslyReportMetric(c)
export const onLCP = c => continuouslyReportMetric(c)
