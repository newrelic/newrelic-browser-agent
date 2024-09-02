import { EventBuffer } from '../../../features/utils/event-buffer'

export const getRuntime = jest.fn().mockReturnValue({ eventBuffer: new EventBuffer() })
export const setRuntime = jest.fn()
