/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { testAjaxEventsRequest, testInteractionEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

/**
 * Helper to find ajax events in both standalone and interaction contexts.
 * With loader:full, ajax events appear as standalone events.
 * With loader:spa + soft_nav, ajax events appear as children of interaction events.
 */
function findAjaxEvent (harvests, path) {
  const standaloneEvent = harvests
    .flatMap(h => h.request.body)
    .find(e => e.type === 'ajax' && e.path === path)

  if (standaloneEvent) return standaloneEvent

  const interactionWithAjax = harvests
    .flatMap(h => h.request.body)
    .find(e => e.type === 'interaction' && e.children?.some(c => c.type === 'ajax' && c.path === path))

  return interactionWithAjax?.children.find(c => c.type === 'ajax' && c.path === path)
}

const loaderConfigs = [
  { loader: 'full', description: 'loader:full' },
  { loader: 'spa', init: { feature_flags: ['soft_nav'] }, description: 'loader:spa + soft_nav' }
]

loaderConfigs.forEach(({ loader, init, description }) => {
  describe(`Ajax Payload Capture - ${description}`, () => {
    let ajaxCapture, interactionCapture

    beforeEach(async () => {
      [ajaxCapture, interactionCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testAjaxEventsRequest },
        { test: testInteractionEventsRequest }
      ])
    })

    describe('XHR', () => {
      describe('capture_payloads: off', () => {
        it('does not capture payloads for successful requests', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'off' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendSuccess').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/echo-body')
          expect(event).toBeDefined()
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'requestBody' })
          ]))
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'responseBody' })
          ]))
        })

        it('does not capture payloads for failed requests', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'off' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendError').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/status/500')
          expect(event).toBeDefined()
          expect(event.status).toBe(500)
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'requestBody' })
          ]))
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'responseBody' })
          ]))
        })

        it('does not capture payloads for GraphQL errors', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'off' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendGqlError').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/gql-error')
          expect(event).toBeDefined()
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'requestBody' })
          ]))
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'responseBody' })
          ]))
        })
      })

      describe('capture_payloads: all', () => {
        it('captures all payload attributes for successful requests', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendSuccess').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/echo-body')
          expect(event).toBeDefined()

          const reqBody = event.children.find(c => c.key === 'requestBody')
          expect(reqBody).toBeDefined()
          expect(reqBody.value).toContain('success request')

          const reqHeaders = event.children.find(c => c.key === 'requestHeaders')
          expect(reqHeaders).toBeDefined()
          expect(reqHeaders.value).toContain('application/json')

          const resBody = event.children.find(c => c.key === 'responseBody')
          expect(resBody).toBeDefined()

          const resHeaders = event.children.find(c => c.key === 'responseHeaders')
          expect(resHeaders).toBeDefined()
        })

        it('captures payloads for failed requests', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendError').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/status/500')
          expect(event).toBeDefined()
          expect(event.status).toBe(500)
          expect(event.children.find(c => c.key === 'requestBody')).toBeDefined()
          expect(event.children.find(c => c.key === 'responseBody')).toBeDefined()
        })

        it('captures query parameters', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendWithQuery').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/json-with-query')
          expect(event).toBeDefined()

          const reqQuery = event.children.find(c => c.key === 'requestQuery')
          expect(reqQuery).toBeDefined()
          expect(reqQuery.value).toContain('param1')
          expect(reqQuery.value).toContain('value1')
        })

        it('captures request and response headers', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendWithHeaders').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/json-with-headers')
          expect(event).toBeDefined()

          const reqHeaders = event.children.find(c => c.key === 'requestHeaders')
          expect(reqHeaders).toBeDefined()
          expect(reqHeaders.value).toContain('X-Test-Header')

          const resHeaders = event.children.find(c => c.key === 'responseHeaders')
          expect(resHeaders).toBeDefined()
          expect(resHeaders.value.toLowerCase()).toContain('x-custom-header')
        })
      })

      describe('capture_payloads: failures', () => {
        it('does not capture payloads for successful requests', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'failures' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendSuccess').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/echo-body')
          expect(event).toBeDefined()
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'requestBody' })
          ]))
        })

        it('captures payloads for 4xx errors', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'failures' } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              var xhr = new XMLHttpRequest()
              xhr.open('GET', '/status/404')
              xhr.send()
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/status/404')
          expect(event).toBeDefined()
          expect(event.status).toBe(404)
          expect(event.children.find(c => c.key === 'responseBody')).toBeDefined()
        })

        it('captures payloads for 5xx errors', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'failures' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendError').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/status/500')
          expect(event).toBeDefined()
          expect(event.status).toBe(500)

          const reqBody = event.children.find(c => c.key === 'requestBody')
          expect(reqBody).toBeDefined()
          expect(reqBody.value).toContain('error request')

          expect(event.children.find(c => c.key === 'responseBody')).toBeDefined()
        })

        it('captures payloads for GraphQL errors with 200 status', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'failures' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendGqlError').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/gql-error')
          expect(event).toBeDefined()
          expect(event.status).toBe(200)

          const resBody = event.children.find(c => c.key === 'responseBody')
          expect(resBody).toBeDefined()
          expect(resBody.value).toContain('errors')
          expect(resBody.value).toContain('unknownField')
        })

        it('captures payloads for GraphQL partial errors', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'failures' } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              var xhr = new XMLHttpRequest()
              xhr.open('POST', '/gql-partial-error')
              xhr.setRequestHeader('Content-Type', 'application/json')
              xhr.send(JSON.stringify({ query: 'query { user { id name invalidField } }' }))
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/gql-partial-error')
          expect(event).toBeDefined()
          expect(event.status).toBe(200)

          const resBody = event.children.find(c => c.key === 'responseBody')
          expect(resBody).toBeDefined()
          expect(resBody.value).toContain('errors')
          expect(resBody.value).toContain('data')
        })
      })

      describe('content-type filtering', () => {
        it('captures text/plain responses', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              var xhr = new XMLHttpRequest()
              xhr.open('GET', '/text-plain')
              xhr.send()
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/text-plain')
          expect(event).toBeDefined()

          const resBody = event.children.find(c => c.key === 'responseBody')
          expect(resBody).toBeDefined()
          expect(resBody.value).toContain('Plain text response')
        })

        it('captures XML responses', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              var xhr = new XMLHttpRequest()
              xhr.open('GET', '/xml')
              xhr.send()
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/xml')
          expect(event).toBeDefined()

          const resBody = event.children.find(c => c.key === 'responseBody')
          expect(resBody).toBeDefined()
          expect(resBody.value).toContain('Hello XML')
        })

        it('does not capture binary responses', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              var xhr = new XMLHttpRequest()
              xhr.open('GET', '/binary')
              xhr.send()
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/binary')
          expect(event).toBeDefined()
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'responseBody' })
          ]))
        })
      })

      describe('deny list', () => {
        it('blocks requests from internal domains', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all', block_internal: true } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              var xhr = new XMLHttpRequest()
              xhr.open('POST', '/echo-body')
              xhr.setRequestHeader('Content-Type', 'application/json')
              xhr.send(JSON.stringify({ message: 'should be blocked' }))
            }))

          await browser.pause(2000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/echo-body')
          expect(event).toBeUndefined()
        })
      })

      describe('obfuscation', () => {
        it('applies obfuscation rules to payloads', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/xhr-payloads.html', {
            loader,
            init: {
              ...init,
              ajax: { capture_payloads: 'all' },
              obfuscate: [
                { regex: /sensitive/g, replacement: 'REDACTED' },
                { regex: /secret-key/g, replacement: 'HIDDEN' }
              ]
            }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              var xhr = new XMLHttpRequest()
              xhr.open('POST', '/echo-body')
              xhr.setRequestHeader('Content-Type', 'application/json')
              xhr.setRequestHeader('X-Secret-Key', 'secret-key-value')
              xhr.send(JSON.stringify({ message: 'sensitive data', key: 'secret-key' }))
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/echo-body')
          expect(event).toBeDefined()

          const reqBody = event.children.find(c => c.key === 'requestBody')
          expect(reqBody.value).toContain('REDACTED')
          expect(reqBody.value).toContain('HIDDEN')
          expect(reqBody.value).not.toContain('sensitive')
          expect(reqBody.value).not.toContain('secret-key')

          const reqHeaders = event.children.find(c => c.key === 'requestHeaders')
          expect(reqHeaders.value).toContain('HIDDEN')
          expect(reqHeaders.value).not.toContain('secret-key')
        })
      })
    })

    describe('Fetch', () => {
      describe('capture_payloads: off', () => {
        it('does not capture payloads for successful requests', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'off' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendSuccess').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/echo-body')
          expect(event).toBeDefined()
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'requestBody' })
          ]))
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'responseBody' })
          ]))
        })

        it('does not capture payloads for failed requests', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'off' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendError').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/status/500')
          expect(event).toBeDefined()
          expect(event.status).toBe(500)
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'requestBody' })
          ]))
        })

        it('does not capture payloads for GraphQL errors', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'off' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendGqlError').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/gql-error')
          expect(event).toBeDefined()
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'responseBody' })
          ]))
        })
      })

      describe('capture_payloads: all', () => {
        it('captures all payload attributes for successful requests', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendSuccess').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/echo-body')
          expect(event).toBeDefined()

          const reqBody = event.children.find(c => c.key === 'requestBody')
          expect(reqBody).toBeDefined()
          expect(reqBody.value).toContain('success request')

          const reqHeaders = event.children.find(c => c.key === 'requestHeaders')
          expect(reqHeaders).toBeDefined()

          const resBody = event.children.find(c => c.key === 'responseBody')
          expect(resBody).toBeDefined()
        })

        it('captures payloads for failed requests', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendError').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/status/500')
          expect(event).toBeDefined()
          expect(event.status).toBe(500)
          expect(event.children.find(c => c.key === 'requestBody')).toBeDefined()
          expect(event.children.find(c => c.key === 'responseBody')).toBeDefined()
        })

        it('captures query parameters', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendWithQuery').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/json-with-query')
          expect(event).toBeDefined()

          const reqQuery = event.children.find(c => c.key === 'requestQuery')
          expect(reqQuery).toBeDefined()
          expect(reqQuery.value).toContain('param1')
          expect(reqQuery.value).toContain('value1')
        })

        it('captures request and response headers', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendWithHeaders').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/json-with-headers')
          expect(event).toBeDefined()

          const reqHeaders = event.children.find(c => c.key === 'requestHeaders')
          expect(reqHeaders).toBeDefined()
          expect(reqHeaders.value).toContain('X-Test-Header')

          const resHeaders = event.children.find(c => c.key === 'responseHeaders')
          expect(resHeaders).toBeDefined()
          expect(resHeaders.value.toLowerCase()).toContain('x-custom-header')
        })

        it('handles Request object', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-request-param.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendAjax').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/json')
          expect(event).toBeDefined()
          expect(event.children.find(c => c.key === 'responseBody')).toBeDefined()
        })

        it('handles Headers object', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-simple.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              var headers = new Headers()
              headers.append('Content-Type', 'application/json')
              headers.append('X-Custom', 'custom-value')
              fetch('/echo-body', {
                method: 'POST',
                headers,
                body: JSON.stringify({ test: 'data' })
              })
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/echo-body')
          expect(event).toBeDefined()

          const reqHeaders = event.children.find(c => c.key === 'requestHeaders')
          expect(reqHeaders).toBeDefined()
          expect(reqHeaders.value.toLowerCase()).toContain('x-custom')
        })
      })

      describe('capture_payloads: failures', () => {
        it('does not capture payloads for successful requests', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'failures' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendSuccess').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/echo-body')
          expect(event).toBeDefined()
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'requestBody' })
          ]))
        })

        it('captures payloads for 4xx errors', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-simple.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'failures' } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              fetch('/status/404')
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/status/404')
          expect(event).toBeDefined()
          expect(event.status).toBe(404)
          expect(event.children.find(c => c.key === 'responseBody')).toBeDefined()
        })

        it('captures payloads for 5xx errors', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'failures' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendError').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/status/500')
          expect(event).toBeDefined()
          expect(event.status).toBe(500)

          const reqBody = event.children.find(c => c.key === 'requestBody')
          expect(reqBody).toBeDefined()
          expect(reqBody.value).toContain('error request')

          expect(event.children.find(c => c.key === 'responseBody')).toBeDefined()
        })

        it('captures payloads for GraphQL errors', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'failures' } }
          }))
            .then(() => browser.waitForAgentLoad())

          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 }),
            $('#sendGqlError').click()
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/gql-error')
          expect(event).toBeDefined()
          expect(event.status).toBe(200)

          const resBody = event.children.find(c => c.key === 'responseBody')
          expect(resBody).toBeDefined()
          expect(resBody.value).toContain('errors')
        })

        it('captures payloads for GraphQL partial errors', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-simple.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'failures' } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              fetch('/gql-partial-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'query { user { id name invalidField } }' })
              })
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/gql-partial-error')
          expect(event).toBeDefined()

          const resBody = event.children.find(c => c.key === 'responseBody')
          expect(resBody).toBeDefined()
          expect(resBody.value).toContain('errors')
          expect(resBody.value).toContain('data')
        })
      })

      describe('content-type filtering', () => {
        it('captures text/plain responses', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-simple.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              fetch('/text-plain')
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/text-plain')
          expect(event).toBeDefined()

          const resBody = event.children.find(c => c.key === 'responseBody')
          expect(resBody).toBeDefined()
          expect(resBody.value).toContain('Plain text response')
        })

        it('captures XML responses', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-simple.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              fetch('/xml')
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/xml')
          expect(event).toBeDefined()

          const resBody = event.children.find(c => c.key === 'responseBody')
          expect(resBody).toBeDefined()
          expect(resBody.value).toContain('Hello XML')
        })

        it('does not capture binary responses', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-simple.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all' } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              fetch('/binary')
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/binary')
          expect(event).toBeDefined()
          expect(event.children).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'responseBody' })
          ]))
        })
      })

      describe('deny list', () => {
        it('blocks requests from internal domains', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-payloads.html', {
            loader,
            init: { ...init, ajax: { capture_payloads: 'all', block_internal: true } }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              fetch('/echo-body', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'should be blocked' })
              })
            }))

          await browser.pause(2000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/echo-body')
          expect(event).toBeUndefined()
        })
      })

      describe('obfuscation', () => {
        it('applies obfuscation rules to payloads', async () => {
          await browser.url(await browser.testHandle.assetURL('ajax/fetch-payloads.html', {
            loader,
            init: {
              ...init,
              ajax: { capture_payloads: 'all' },
              obfuscate: [
                { regex: /sensitive/g, replacement: 'REDACTED' },
                { regex: /secret-token/g, replacement: 'HIDDEN' }
              ]
            }
          }))
            .then(() => browser.waitForAgentLoad())
            .then(() => browser.execute(function () {
              window.disableAjaxHashChange = true
              fetch('/echo-body', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Bearer secret-token-abc123'
                },
                body: JSON.stringify({ message: 'sensitive information', token: 'secret-token' })
              })
            }))

          await browser.pause(1000)
          const [ajaxHarvests, interactionHarvests] = await Promise.all([
            ajaxCapture.waitForResult({ timeout: 10000 }),
            interactionCapture.waitForResult({ timeout: 10000 })
          ])

          const event = findAjaxEvent([...ajaxHarvests, ...interactionHarvests], '/echo-body')
          expect(event).toBeDefined()

          const reqBody = event.children.find(c => c.key === 'requestBody')
          expect(reqBody.value).toContain('REDACTED')
          expect(reqBody.value).toContain('HIDDEN')
          expect(reqBody.value).not.toContain('sensitive')
          expect(reqBody.value).not.toContain('secret-token')

          const reqHeaders = event.children.find(c => c.key === 'requestHeaders')
          expect(reqHeaders.value).toContain('HIDDEN')
          expect(reqHeaders.value).not.toContain('secret-token')
        })
      })
    })
  })
})
