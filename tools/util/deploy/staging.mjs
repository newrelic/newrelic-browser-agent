import { CONSTANTS, Settings, Setting, SettingValue, LoaderExcludeAccounts, LoaderPolyfillAccounts, LoaderUpdateAccounts, LoaderUpdatePercent, LoaderUpdateVersion, LoaderVersion } from "./settings.mjs";

const {KEYS} = CONSTANTS

export const settings = new Settings([
    // common settings have their own shortcut classes
    new LoaderExcludeAccounts([
        new SettingValue(10080233, 'Ruby Playground App Account ID')
    ]),
    new LoaderPolyfillAccounts([
        new SettingValue(10671289, 'DotNet Test Account'),
        new SettingValue(10080233, 'Ruby Playground App Account ID')
    ]),
    new LoaderUpdateAccounts([
        new SettingValue(550352, 'Browser Account'),
        new SettingValue(10671289, 'DotNet Test Account')
    ]),
    new LoaderUpdatePercent(new SettingValue(100, 'Percentage of accounts to get LOADER_UPDATE_VERSION, AccountID Mod 100')),
    new LoaderUpdateVersion(new SettingValue(1220, 'The new version number to rollout for all platforms, applies to loaders without specific <LANGUAGE>_UPDATE_VERSION set')),
    new LoaderVersion(new SettingValue(1216, 'The current version number, applies to loaders without specific <LANGUAGE>_VERSION set')),
    
    // uncommon or custom settings can be manually defined as such
    new Setting(KEYS.RUBY_LOADER_UPDATE_VERSION, new SettingValue(1220, "The new version number to rollout for RUBY only, overrides LOADER_UPDATE_VERSION")),
    new Setting(KEYS.RUBY_LOADER_VERSION, new SettingValue(1215, "The current version number for RUBY only, overrides UPDATE_VERSION"))
])