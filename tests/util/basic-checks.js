/* eslint-disable */
export const baseQuery = expect.objectContaining({
  a: expect.any(String),
  ck: expect.any(String),
  ref: expect.any(String),
  rst: expect.any(String),
  s: expect.any(String),
  t: expect.any(String),
  v: expect.any(String)
})

export function checkRum ({ query, body }, liteAgent = false) {
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
    v: expect.any(String)
  })
  if (!liteAgent) {
    expect(query).toMatchObject({
      af: expect.any(String),
    })
  }
  expect(body).toEqual('')
}

export function checkPVT ({ query, body }) {
  const pvtItem = expect.objectContaining({
    attributes: expect.any(Array),
    name: expect.any(String),
    type: expect.any(String),
    value: expect.any(Number)
  })
  expect(query).toEqual(baseQuery)
  expect(body[0]).toEqual(pvtItem)
}

export function checkAjax ({ query, body }) {
  expect(query).toEqual(baseQuery)
  body.forEach(x => expect(x).toMatchObject({
    callbackDuration: expect.any(Number),
    callbackEnd: expect.any(Number),
    children: expect.any(Array),
    domain: expect.any(String),
    end: expect.any(Number),
    method: expect.any(String),
    nodeId: expect.any(String),
    path: expect.any(String),
    requestBodySize: expect.any(Number),
    requestedWith: expect.any(String),
    responseBodySize: expect.any(Number),
    start: expect.any(Number),
    status: expect.any(Number),
    type: expect.any(String)
  }))
}

export function checkJsErrors ({ query, body }) {
  expect(query).toEqual(baseQuery)
  expect(body.err[0]).toBeTruthy()
}

export function checkMetrics ({ query, body }) {
  expect(query).toEqual(baseQuery)
  expect(body.sm?.length).toBeTruthy()
}

export function checkPageAction ({ query, body }) {
  expect(query).toEqual(baseQuery)
  expect(body.ins?.length).toBeTruthy()
}

export function checkSessionTrace ({ query, body }) {
  expect(body.length).toBeGreaterThanOrEqual(1)
}

export function checkSpa ({ query, body }) {
  expect(query).toEqual(baseQuery)
  expect(body.length).toBeGreaterThanOrEqual(1)
}
