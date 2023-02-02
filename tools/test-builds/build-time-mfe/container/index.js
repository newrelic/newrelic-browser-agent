import BrowserAgent from "@newrelic/browser-agent";

// this should notice global errors
const nr = new BrowserAgent();

// should just accept full NREUM object ({init, info, loader_config, ...other data})
nr.start(NREUM);

import {
  mount as dogsMount,
  unmount as dogsUnmount,
} from "@newrelic/component-1";
import {
  mount as catsMount,
  unmount as catsUnmount,
} from "@newrelic/component-2";

catsMount(document.querySelector("#content"));
dogsMount(document.querySelector("#content"));

document.querySelector("#dogs").addEventListener("click", () => {
  catsUnmount();
  dogsMount(document.querySelector("#content"));
});

document.querySelector("#cats").addEventListener("click", () => {
  dogsUnmount();
  catsMount(document.querySelector("#content"));
});

// setTimeout(() => {
//     const tbl = {}
//     Object.entries(NREUM.initializedAgents).forEach(([key, values]) => {
//         const autoInstrument = key === nr.id
//         tbl[key] = {features: values.features.join(", ") || null, applicationID: values.info.applicationID, autoInstrument}
//     })
//     console.table(tbl)
// }, 500)
