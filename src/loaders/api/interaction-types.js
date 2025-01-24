/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 *
 * @typedef InteractionInstance
 * @property {actionText} actionText
 * @property {createTracer} createTracer
 * @property {end} end
 * @property {getContext} getContext
 * @property {ignore} ignore
 * @property {onEnd} onEnd
 * @property {save} save
 * @property {setAttribute} setAttribute
 * @property {setName} setName
 */

/**
 * Sets the text value of the HTML element that was clicked to start a browser interaction.
 * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/actiontext/}
 * @callback actionText
 * @param {string} value The text value of the HTML element that represents the action that started the interaction.
 * @returns {InteractionInstance} Returns the same interaction object allowing method chaining.
 */

/**
 * Times sub-components of a SPA interaction separately, including wait time and JS execution time.
 * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/createtracer/}
 * @callback createTracer
 * @param {string} name This will be used as the name of the tracer.
 * @param {(...args: any[]) => any} [callback] A callback that contains the synchronous work to run at the end of the async work. To execute this callback, call the wrapper function returned using createTracer().
 * @returns {(...args: any[]) => any} Returns a method that wraps the original callback. When this method is invoked, it calls the original callback and ends the async timing.
 */

/**
 * Ends the SPA interaction at the current time.
 * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/end/}
 * @callback end
 * @returns {InteractionInstance} Returns the same interaction object allowing method chaining.
 */

/**
 * Stores values for the current SPA interaction asynchronously in browser.
 * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/getcontext/}
 * @callback getContext
 * @param {(ctx: object) => void} callback This function is called when the interaction ends. It is called with one parameter, which is the interaction context.
 * @returns {InteractionInstance} Returns the same interaction object allowing method chaining.
 */

/**
 * Overrides other SPA save() calls; ignores an interaction so it is not saved or sent to New Relic.
 * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/ignore/}
 * @callback ignore
 * @returns {InteractionInstance} Returns the same interaction object allowing method chaining.
 */

/**
 * Change the values associated with a SPA interaction before the interaction is saved.
 * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/onend/}
 * @callback onEnd
 * @param {(ctx: object) => void} callback This function is called when the interaction ends. It is called with one parameter, which is the interaction context.
 * @returns {InteractionInstance} Returns the same interaction object allowing method chaining.
 */

/**
 * Ensures a SPA browser interaction will be saved when it ends.
 * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/save/}
 * @callback save
 * @returns {InteractionInstance} Returns the same interaction object allowing method chaining.
 */

/**
 * Adds a custom SPA attribute only to the current interaction in browser.
 * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setattribute/}
 * @callback setAttribute
 * @param {string} key Used as the attribute name on the BrowserInteraction event.
 * @param {any} value Used as the attribute value on the BrowserInteraction event. This can be a string, number, boolean, or object. If it is an object, New Relic serializes it to a JSON string.
 * @returns {InteractionInstance} Returns the same interaction object allowing method chaining.
 */

/**
 * Sets the name and trigger of a SPA's browser interaction that is not a route change or URL change.
 * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setname/}
 * @callback setName
 * @param {string} name If null, the name will be set using the targetGroupedUrl attribute. If not null, this will set the browserInteractionName attribute in the BrowserInteraction event.
 * @param {string} [trigger] If not null, this will set the TRIGGER attribute on the BrowserInteraction event.
 * @returns {InteractionInstance} Returns the same interaction object allowing method chaining.
 */

/* istanbul ignore next */
export const unused = {}
