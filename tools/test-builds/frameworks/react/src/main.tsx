// Make sure newrelic is the first thing imported
import "./newrelic";

import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = createRoot(document.getElementById("app") as HTMLElement);

root.render(<App />);
