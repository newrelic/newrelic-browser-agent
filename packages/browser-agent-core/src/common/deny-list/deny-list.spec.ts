import type { XhrParams } from "./deny-list.interfaces"

import {describe, expect, test} from '@jest/globals'
import {setDenyList, shouldCollectEvent} from './deny-list'

describe('shouldCollectEvent', () => {
  test('does not collect XHR events with undefined hostname', () => {
    setDenyList([
      'https://example.com/'
    ])
    let params: XhrParams = {
      "method": "POST",
      "port": "56300",
      "hostname": undefined as unknown as string,
      "pathname": "/resources/1/asdf",
      "protocol": "http",
      "host": "bam-test-1.nr-local.net:56300",
      "status": 200
    }
    expect(shouldCollectEvent(params)).toBe(false)
  })
})