/**
 * A helper method to warn to the console with New Relic: decoration
 * @param {string} message - The primary message to warn
 * @param {*} secondary - Secondary data to include, usually an error or object
 * @returns 
 */
export function warn(message, secondary){
    if (!console || !console.warn || typeof console.warn !== 'function') return
    console.warn(`New Relic: ${message}`)
    if (secondary) console.warn(secondary)
}