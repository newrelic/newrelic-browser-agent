import { Obfuscator } from '../../../../../src/common/util/obfuscate'

jest.enableAutomock()
jest.unmock('../../../../../src/features/soft_navigations/aggregate/ajax-node')
jest.unmock('../../../../../src/features/soft_navigations/aggregate/bel-node')
jest.unmock('../../../../../src/common/serialize/bel-serializer')

const someAgent = {
  agentIdentifier: 'abcd',
  info: {},
  runtime: { obfuscator: new Obfuscator({ init: { obfuscate: [] } }) }
}
const someAjaxEvent = {
  method: 'POST',
  status: 205,
  domain: 'google.com',
  path: '/',
  requestSize: 123,
  responseSize: 456,
  type: 'fetch',
  startTime: 1024,
  endTime: 2048,
  callbackDuration: 999,
  spanId: 'some_span_id',
  traceId: 'some_trace_id',
  spanTimestamp: 789,
  gql: {
    operationName: 'Anonymous',
    operationType: 'QUERY',
    operationFramework: 'GraphQL'
  }
}

let AjaxNode

beforeEach(() => {
  jest.resetModules()

  AjaxNode = require('../../../../../src/features/soft_navigations/aggregate/ajax-node').AjaxNode
})

test('Ajax node creation is correct', () => {
  const ajn = new AjaxNode(someAgent, someAjaxEvent)

  expect(ajn.info).toEqual({})
  expect(ajn.belType).toEqual(2)
  expect(ajn.nodeId).toEqual(1)
  expect(ajn.callbackDuration === 0 && ajn.callbackEnd === 0).toBeTruthy()
  expect(ajn.requestedWith).toEqual(1) // fetch
  expect(someAjaxEvent).toEqual(expect.objectContaining({
    startTime: ajn.start,
    endTime: ajn.end,
    method: ajn.method,
    status: ajn.status,
    domain: ajn.domain,
    path: ajn.path,
    requestSize: ajn.txSize,
    responseSize: ajn.rxSize,
    spanId: ajn.spanId,
    traceId: ajn.traceId,
    spanTimestamp: ajn.spanTimestamp,
    gql: ajn.gql
  }))
})

test('Ajax serialize output is correct', () => {
  const ajn = new AjaxNode(someAgent, someAjaxEvent)

  expect(ajn.nodeId).toEqual(1)
  expect(ajn.serialize(0)).toEqual("2,3,sg,sg,,,'POST,5p,'google.com,'/,3f,co,1,'1,'some_span_id,'some_trace_id,lx;5,'operationName,'Anonymous;5,'operationType,'QUERY;5,'operationFramework,'GraphQL")
  // The start (and end) timestamp should translate based on "parent" timestamp passed in:
  expect(ajn.serialize(512)).toEqual("2,3,e8,sg,,,'POST,5p,'google.com,'/,3f,co,1,'1,'some_span_id,'some_trace_id,lx;5,'operationName,'Anonymous;5,'operationType,'QUERY;5,'operationFramework,'GraphQL")
})
