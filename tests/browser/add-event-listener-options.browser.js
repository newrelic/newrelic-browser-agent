/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require("jil");
import { setup } from "./utils/setup";
import { wrapEvents } from "../../src/common/wrap/wrap-events";

const { baseEE } = setup();

jil.browserTest("addEventListener options work when wrapped", function (t) {
  console.log("baseEE", baseEE);

  wrapEvents(baseEE);

  let handlerCallCount = 0;
  let el = createAndAddDomElement();

  el.addEventListener("click", handler, { capture: true });
  el.addEventListener("click", handler, { capture: false });
  triggerEvent(el, "click");

  t.equal(handlerCallCount, 2, "should have seen handler calls both phases");

  el.removeEventListener("click", handler, false);
  triggerEvent(el, "click");

  t.equal(handlerCallCount, 3, "should have seen handler call for capture");

  el.removeEventListener("click", handler, true);
  triggerEvent(el, "click");

  t.equal(handlerCallCount, 3, "should not have seen additional handler calss");

  t.end();

  function handler() {
    handlerCallCount++;
  }
});

function triggerEvent(el, eventName) {
  let evt = document.createEvent("Events");
  evt.initEvent(eventName, true, false);
  el.dispatchEvent(evt);
}

function createAndAddDomElement(tagName = "div") {
  var el = document.createElement(tagName);
  document.body.appendChild(el);
  return el;
}
