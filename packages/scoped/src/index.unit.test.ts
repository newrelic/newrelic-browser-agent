/**
 * @jest-environment jsdom
 */

import { NrFeatures, NrOptions } from './types';

let config: NrOptions | any = {
    applicationID: 'applicationID',
    beacon: 'beacon',
    licenseKey: 'licenseKey',
    obfuscate: [{regex: /test/g, replacement: 'test'}]
}

describe('nr interface', () => {
    beforeEach(() => {
        jest.resetModules()
        jest.resetAllMocks()
    });

    it('should not disable features if none are passed', async () => {
        const {default: nr} = await import('./index')
        const opts = {...config}
        await nr.start(opts)
        expect(nr.features).toContain(NrFeatures.JSERRORS)
    })

    it('should disable features based on disabled property of config', async () => {
        const {default: nr} = await import('./index')
        const opts = {...config, disabled: [NrFeatures.JSERRORS]}
        await nr.start(opts)
        expect(nr.features).not.toContain(NrFeatures.JSERRORS)
    })

    it('should set internal config values on start()', async () => {
        const {default: nr} = await import('./index')
        const opts = {...config}
        await nr.start(opts)
        expect(nr.config.info).toHaveProperty('licenseKey')
        expect(nr.config.info).toHaveProperty('applicationID')
        expect(nr.config.info).toHaveProperty('beacon')
        expect(nr.config.config).toHaveProperty('obfuscate')
        expect(nr.config.loader_config).toHaveProperty('licenseKey')
        expect(nr.config.loader_config).toHaveProperty('applicationID')
    })

    it('should not set invalid internal config values', async () => {
        const {default: nr} = await import('./index')
        const opts = {...config, invalidProperty: 'invalid'}
        await nr.start(config)
        expect(nr.config.info).not.toHaveProperty('invalidProperty')
    })

    it('should early return if already initialized', async () => {
        const {default: nr} = await import('./index')
        const opts = {...config}
        const opts2 = {...config, applicationID: 'applicationID2', disabled: [NrFeatures.JSERRORS]}
        expect(await nr.start(opts)).toBeTruthy()
        expect(await nr.start(opts2)).toBeFalsy()
        expect(nr.config.info.applicationID).not.toEqual('applicationID2')
        expect(nr.features).toContain(NrFeatures.JSERRORS)
    })

    it('should use real storeError if initialized', async () => {
        const {default: nr} = await import('./index')
        const spy = jest.spyOn(console, 'warn').mockImplementation()
        const opts = {...config}
        await nr.start(opts)
        nr.storeError('test')
        expect(spy).not.toHaveBeenCalled()
    })

    it('should use warning storeError if not initialized', async () => {
        const {default: nr} = await import('./index')
        const spy = jest.spyOn(console, 'warn').mockImplementation()
        nr.storeError('test')
        expect(spy).toHaveBeenCalled()
    })
})