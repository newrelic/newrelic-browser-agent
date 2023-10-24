export function extractAjaxEvents (requestBody) {
  const events = []

  if (Array.isArray(requestBody)) {
    events.push(...requestBody.flatMap(rq => extractAjaxEvents(rq)))
  } else {
    if (requestBody.type === 'ajax') {
      events.push({
        ...requestBody
      })
    }

    if (requestBody.children) {
      events.push(...requestBody.children.flatMap(rq => extractAjaxEvents(rq)))
    }
  }

  return events
}
