import { createRoot } from "react-dom/client";
import { App } from "./App";

// Declare newrelic global
declare const newrelic: any;
declare const window: any;

// Register the main MFE with id vite-main-mfe
window.api = newrelic.register({
    id: 'vite-main-mfe',
    name: 'Main MFE'
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