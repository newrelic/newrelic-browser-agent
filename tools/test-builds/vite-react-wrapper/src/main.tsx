// Make sure newrelic is the first thing imported
// import "./newrelic";
import {RegisteredEntity} from '@newrelic/browser-agent/interfaces/registered-entity'

import { createRoot } from "react-dom/client";
import { App } from "./App";

const myApi = new RegisteredEntity({
    id: 5678,
    name: 'test'
})

const root = createRoot(document.getElementById("app") as HTMLElement);

root.render(<App />);

setTimeout(() => {
    // force a CLS recalc
    const app = document.getElementById("root")
    if (app){
        app.style.position = 'absolute'
        app.style.top = '100px'
    }
}, 100)