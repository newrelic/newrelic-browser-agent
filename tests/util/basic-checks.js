/* eslint-disable */
import {onlyAndroid, supportsFirstPaint} from "../../tools/browser-matcher/common-matchers.mjs";

export const baseQuery = expect.objectContaining({
  a: expect.any(String),
  ck: expect.any(String),
  ref: expect.any(String),
  rst: expect.any(String),
  s: expect.any(String),
  t: expect.any(String),
  v: expect.any(String)
})

export function checkRumQuery ({ query }, { liteAgent } = {}) {
  expect(query).toMatchObject({
    a: expect.any(String),
    be: expect.any(String),
    ck: expect.any(String),
    dc: expect.any(String),
    fe: expect.any(String),
    perf: expect.any(String),
    ref: expect.any(String),
    rst: expect.any(String),
    s: expect.any(String),
    t: expect.any(String),
    v: expect.any(String),
  })
  if (!liteAgent) {
    expect(query).toMatchObject({
      af: expect.any(String),
    })
  }
}

export function checkRumBody({body}){
  expect(body).toEqual('')
}

export function checkRumPerf({ query, body }) {
  const perf = JSON.parse(query.perf)
  expect(!!(perf.timing && perf.navigation)).toEqual(true)
  Object.values(perf.timing).forEach(val => expect(val).toBeGreaterThanOrEqual(0))
}

export function checkPVT ({ query, body }) {
  expect(query).toEqual(baseQuery)
  expect(body?.length).toBeGreaterThanOrEqual(1)
  body.forEach(x => {
    if (x.name === 'cls') return
    expect(x).toMatchObject({
      attributes: expect.any(Array),
      name: x.name,
      type: expect.any(String),
      value: expect.any(Number)
    })
  })
}

export function checkAjaxEvents ({ query, body }, { specificPath, hasTrace } = {}) {
  expect(query).toEqual(baseQuery)
  expect(body?.length).toBeGreaterThanOrEqual(1)
  body
    .filter(x => !specificPath || (specificPath && x.path === specificPath))
    .forEach(x => expect(x).toMatchObject({
      callbackDuration: expect.any(Number),
      callbackEnd: expect.any(Number),
      children: expect.any(Array),
      domain: expect.any(String),
      end: expect.any(Number),
      guid: hasTrace ? expect.any(String) : expect.toSatisfy(n => n === null),
      method: expect.any(String),
      nodeId: expect.any(String),
      path: specificPath ? specificPath : expect.any(String),
      requestBodySize: expect.any(Number),
      requestedWith: expect.any(String),
      responseBodySize: expect.any(Number),
      start: expect.any(Number),
      status: expect.any(Number),
      timestamp: hasTrace ? expect.any(Number) : expect.toSatisfy(n => n === null),
      traceId: hasTrace ? expect.any(String) : expect.toSatisfy(n => n === null),
      type: expect.any(String)
    }))
}

export function checkAjaxMetrics ({ query, body }, { specificPath, hasTrace, isFetch } = {}) {
  expect(query).toEqual(baseQuery)
  expect(body.xhr?.length).toBeGreaterThanOrEqual(1)
  body.xhr
    .filter(x => (!specificPath && x.param.pathname) || (specificPath && x.params.pathname === specificPath))
    .forEach(xhr => {
      expect(xhr).toMatchObject({
        params: {
          hostname: expect.any(String),
          port: expect.any(String),
          protocol: expect.any(String),
          host: expect.any(String),
          pathname: specificPath ? specificPath : expect.any(String),
          method: expect.any(String),
          status: expect.any(Number)
        },
        metrics: {
          count: expect.toBeWithin(1, Infinity),
          duration: {
            t: expect.toBeWithin(0, Infinity)
          },
          time: {
            t: expect.toBeWithin(0, Infinity)
          }
        }
      })

      if (!isFetch) {
        expect(xhr.metrics.cbTime).toMatchObject({
          t: expect.toBeWithin(0, Infinity)
        })
      }

      if (xhr.metrics.rxSize && isFetch && xhr.params.status === 0) {
        expect(xhr.metrics.rxSize).toMatchObject({
          c: expect.toBeWithin(1, Infinity)
        })
      } else if (xhr.metrics.rxSize) {
        expect(xhr.metrics.rxSize).toMatchObject({
          t: expect.toBeWithin(0, Infinity)
        })
      }

      if (xhr.metrics.txSize) {
        expect(xhr.metrics.txSize).toMatchObject({
          t: expect.toBeWithin(0, Infinity)
        })
      }
    })
}

export function checkJsErrors ({ query, body }, { messages } = {}, prop = 'err') {
  expect(query).toEqual(baseQuery)
  expect(body[prop]?.length).toBeGreaterThanOrEqual(1)
  body[prop].forEach(err => {
    expect(err).toMatchObject({
      custom: expect.any(Object),
      metrics: {
        count: expect.any(Number),
        time: {
          t: expect.any(Number)
        }
      },
      params: {
        exceptionClass: expect.any(String),
        request_uri: expect.any(String),
        message: expect.any(String),
        releaseIds: expect.any(String),
        firstOccurrenceTimestamp: expect.any(Number),
        timestamp: expect.any(Number),
        stackHash: expect.any(Number),
      }
    })

    if (typeof err.params.browser_stack_hash === 'number') {
      expect(err.params).toMatchObject({
        stack_trace: expect.toSatisfy(n => n === undefined),
        pageview: expect.toSatisfy(n => n === undefined),
      })
    } else {
      expect(err.params.browser_stack_hash).toBeUndefined()
      expect(err.params).toMatchObject({
        stack_trace: expect.any(String),
        pageview: expect.any(Number),
      })
    }
  })


  if (Array.isArray(messages) && messages.length > 0) {
    messages.forEach((message, index) => expect(body[prop][index].params.message).toMatch(message))
  }
}

export function checkMetrics ({ query, body }) {
  expect(query).toEqual(baseQuery)
  expect(body.sm?.length).toBeGreaterThanOrEqual(1)
  body.sm.forEach(sm => {
    expect(sm).toMatchObject({
      params: {
        name: expect.any(String)
      },
      stats: expect.any(Object)
    })

    if (typeof sm.stats.c === 'number') {
      expect(sm.stats.c).toBeGreaterThanOrEqual(1)
    }
    if (typeof sm.stats.t === 'number') {
      expect(sm.stats.t).toBeGreaterThanOrEqual(0)
    }
  })
}

export function checkGenericEvents ({ query, body }, { specificAction, actionContents } = {}) {
  expect(query).toEqual(baseQuery)
  expect(body.ins?.length).toBeGreaterThanOrEqual(1)
  body.ins.forEach(ins => {
    expect(ins).toMatchObject({
      eventType: expect.any(String),
      pageUrl: expect.any(String),
      timestamp: expect.any(Number)
    })

    if (ins.referrerUrl) {
      expect(ins.referrerUrl).toEqual(expect.any(String))
    }
  })

  if (specificAction) {
    expect(body.ins).toEqual(expect.arrayContaining([
      expect.objectContaining({
        actionName: specificAction,
        ...(actionContents || {})
      })
    ]))
  }
}

export function checkSessionTrace ({ query, body }) {
  expect(body.length).toBeGreaterThanOrEqual(1)
  body.forEach(res => {
    if (res.t === 'timing') {
      expect(res).toMatchObject({
        n: expect.any(String),
        s: expect.any(Number),
        e: expect.any(Number),
        o: 'document',
        t: 'timing'
      })
    } else if (res.t === 'event') {
      expect(res).toMatchObject({
        n: expect.any(String),
        s: expect.any(Number),
        e: expect.any(Number),
        t: 'event'
      })
    } else if (res.n === 'history.pushState') {
      expect(res).toMatchObject({
        n: 'history.pushState',
        s: expect.any(Number),
        e: expect.any(Number),
        o: expect.any(String),
        t: expect.any(String)
      })
    } else if (res.n === 'error') {
      expect(res).toMatchObject({
        n: 'error',
        s: expect.any(Number),
        e: expect.any(Number),
        o: expect.any(String),
        t: expect.any(Number)
      })
    } else if (res.n === 'Ajax') {
      expect(res).toMatchObject({
        n: 'Ajax',
        s: expect.any(Number),
        e: expect.any(Number),
        o: expect.any(String),
        t: 'ajax'
      })
    } else {
      expect(res).toMatchObject({
        n: expect.any(String),
        s: expect.any(Number),
        e: expect.any(Number),
        o: expect.any(String),
        t: expect.any(String)
      })
    }
  })
}

export function checkSpa ({ query, body }, { trigger } = {}) {
  expect(query).toEqual(baseQuery)
  expect(body.length).toBeGreaterThanOrEqual(1)

  const interaction = body.find(b => b.type === 'interaction')
  expect(interaction).toBeDefined()
  expect(interaction).toEqual(expect.objectContaining({
    type: "interaction",
    children: expect.any(Array),
    start: expect.any(Number),
    end: expect.any(Number),
    callbackEnd: expect.any(Number),
    callbackDuration: expect.any(Number),
    trigger: expect.any(String),
    initialPageURL: expect.any(String),
    oldURL: expect.any(String),
    newURL: expect.any(String),
    category: expect.any(String),
    id: expect.any(String),
    nodeId: expect.any(String),
    navTiming: expect.any(Object)
  }))
  // *cli Jun'24 - LambdaTest's Android Chrome arbitrarily have paint timing in spa tests checking IPL depending on some race condition.
  // Sometimes they are present (Number) and sometimes not (null). It's too unreliable for tests so their check is excluded.
  if (!browserMatch(onlyAndroid)) {
    expect(interaction).toEqual(expect.objectContaining({
      firstPaint: browserMatch(supportsFirstPaint) && (!trigger || trigger === 'initialPageLoad') ? expect.any(Number) : null,
      firstContentfulPaint: (!trigger || trigger === 'initialPageLoad') ? expect.any(Number) : null
    }))
  }
}
