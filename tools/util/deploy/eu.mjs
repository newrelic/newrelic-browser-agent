import { Settings, SettingValue, LoaderExcludeAccounts, LoaderPolyfillAccounts, LoaderUpdateAccounts, LoaderUpdatePercent, LoaderUpdateVersion, LoaderVersion } from "./settings.mjs";

export const settings = new Settings([
    // common settings have their own shortcut classes
    new LoaderExcludeAccounts([]),
    new LoaderPolyfillAccounts([
        new SettingValue(1721536, 'Cerner'),
        new SettingValue(1721537, 'Cerner'),
        new SettingValue(2013975, 'Cerner'),
        new SettingValue(2178212, 'Cerner'),
        new SettingValue(1721535, 'Cerner'),
        new SettingValue(1721539, 'Cerner'),
        new SettingValue(2633318, 'Cerner')
    ]),
    new LoaderUpdateAccounts([
        new SettingValue(1721536, 'Cerner'),
        new SettingValue(1721537, 'Cerner'),
        new SettingValue(2013975, 'Cerner'),
        new SettingValue(2178212, 'Cerner'),
        new SettingValue(1721535, 'Cerner'),
        new SettingValue(1721539, 'Cerner'),
        new SettingValue(2633318, 'Cerner')
    ]),
    new LoaderUpdatePercent(new SettingValue(0, 'Percentage of accounts to get LOADER_UPDATE_VERSION, AccountID Mod 100')),
    new LoaderUpdateVersion(new SettingValue(1220, 'The new version number to rollout for all platforms, applies to loaders without specific <LANGUAGE>_UPDATE_VERSION set')),
    new LoaderVersion(new SettingValue(1216, 'The current version number, applies to loaders without specific <LANGUAGE>_VERSION set'))
])