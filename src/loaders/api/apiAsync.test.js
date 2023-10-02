import { setAPI } from './apiAsync'
import * as register from '../../common/event-emitter/register-handler'

jest.enableAutomock()
jest.unmock('./apiAsync')
jest.unmock('../../common/event-emitter/contextual-ee')

test('setAPI registers all async methods', () => {
  let callSpy = jest.spyOn(register, 'registerHandler')
  setAPI('abcd')

  expect(callSpy).toHaveBeenCalledTimes(4)
  for (let i = 0; i < 4; i++) {
    expect(callSpy.mock.calls[i][0].startsWith('api-')).toBeTruthy()
    expect(callSpy.mock.calls[i][1]).toBeInstanceOf(Function)
  }
})
