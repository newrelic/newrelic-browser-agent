import { createRoot } from "react-dom/client";
import { App } from "./App";

// Declare newrelic global
declare const newrelic: any;

// Register the main MFE with id vite-main-mfe
newrelic.register({
    id: 'vite-main-mfe',
    name: 'Main MFE'
})

const root = createRoot(document.getElementById("app") as HTMLElement);

root.render(<App />);

setTimeout(() => {
    // Force a layout shift for CLS testing
    // Wait longer to ensure React has fully rendered
    // Make the shift more dramatic to ensure detection on all devices
    const app = document.getElementById("root")
    if (app){
        app.style.position = 'absolute'
        app.style.top = '200px'
        app.style.left = '50px'
    }
}, 500)