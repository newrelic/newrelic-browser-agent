/**
 * @jest-environment jsdom
 */

import { NrFeatures } from '../../types';
import { initializeFeatures } from './initialize'

describe('nr interface', () => {
    beforeEach(() => {
        jest.resetModules()
        jest.resetAllMocks()
    });

    it('should import modules in enabledFeatures', async () => {
        const jsErrors = await import('../../../../../modules/features/js-errors/aggregate')
        const spy = jest.spyOn(jsErrors, 'initialize')
        const features = await initializeFeatures([NrFeatures.JSERRORS])
        expect(spy).toHaveBeenCalled()
        expect(features).toContain(NrFeatures.JSERRORS)
    })

    it('should import nothing if no modules in enabledFeatures', async () => {
        const jsErrors = await import('../../../../../modules/features/js-errors/aggregate')
        const spy = jest.spyOn(jsErrors, 'initialize')
        const features = await initializeFeatures([])
        expect(spy).not.toHaveBeenCalled()
        expect(features).not.toContain(NrFeatures.JSERRORS)
    })
})