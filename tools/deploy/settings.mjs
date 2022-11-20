export const CONSTANTS = {
    KEYS: {
        LOADER_EXCLUDE_ACCOUNTS: 'loader_exclude_accounts',
        LOADER_POLYFILL_ACCOUNTS: 'loader_polyfill_accounts',
        LOADER_UPDATE_ACCOUNTS: 'loader_update_accounts',
        LOADER_UPDATE_PERCENT: 'loader_update_percent',
        LOADER_UPDATE_VERSION: 'loader_update_version',
        LOADER_VERSION: 'loader_version',
        RUBY_LOADER_VERSION: 'ruby_loader_version',
        RUBY_LOADER_UPDATE_VERSION: 'ruby_loader_update_version',
    },
    BASE: 'browser_monitoring'
}

/**
* This class represents the list of settings passed into RPM Admin
*/
export class Settings {
    constructor(settings = []) {
        this.settings = settings
        this.payload = settings.map(({ key, value }) => ({ key, value }))
        this.payloadWithComments = settings.map(({ key, value, comments }) => ({ key, value, comments }))
    }
}

/**
* A setting to be used as an argument for Settings
*/
export class Setting {
    constructor(key, value) {
        this._key = key // String
        this._value = value // String | SettingValue | SettingValue[]
    }

    get key() {
        if (!this._key.includes(CONSTANTS.BASE)) return `${CONSTANTS.BASE}.${this._key}`
        return this._key
    }

    get value() {
        if (typeof this._value === 'string') return this._value
        if (Array.isArray(this._value)) return this._value.map(x => x.value).filter(x => x).join(",").trim()
        if (this._value instanceof SettingValue) return this._value.value
        return String(this._value)
    }

    get comments() {
        if (Array.isArray(this._value)) return this._value.map(x => `${x.value}: ${x.comment}`).filter(x => x)
        if (this._value instanceof SettingValue) return [this._value.comment]
        return
    }
}

/**
 * A representation of each value to be passed into Setting, can optionally include comments
 */
export class SettingValue {
    constructor(value, comment) {
        this._value = isNaN(value) ? (value || '') : value // String | Number
        this.comment = comment || '' // String
    }

    get value() {
        return String(this._value)
    }
}

/**
* A list of account IDs to exclude from LOADER_UPDATE_VERSION
*/
export class LoaderExcludeAccounts extends Setting {
    constructor(values){
        super(CONSTANTS.KEYS.LOADER_EXCLUDE_ACCOUNTS, values)
    }
}

/**
* A list of account IDs to get the polyfill build of whichever version is assigned to the account
*/
export class LoaderPolyfillAccounts extends Setting {
    constructor(values){
        super(CONSTANTS.KEYS.LOADER_POLYFILL_ACCOUNTS, values)
    }
}

/**
* A list of account IDs to immediately get LOADER_UPDATE_VERSION
*/
export class LoaderUpdateAccounts extends Setting {
    constructor(values){
        super(CONSTANTS.KEYS.LOADER_UPDATE_ACCOUNTS, values)
    }
}

/**
* Deploy the LOADER_UPDATE_VERSION to a percentace of Accounts using AccountID mod 100
*/
export class LoaderUpdatePercent extends Setting {
    constructor(values){
        super(CONSTANTS.KEYS.LOADER_UPDATE_PERCENT, values)
    }
}

/**
* The version number of the update release
*/
export class LoaderUpdateVersion extends Setting {
    constructor(values){
        super(CONSTANTS.KEYS.LOADER_UPDATE_VERSION, values)
    }
}

/**
* The version number of the current stable release
*/
export class LoaderVersion extends Setting {
    constructor(values){
        super(CONSTANTS.KEYS.LOADER_VERSION, values)
    }
}
