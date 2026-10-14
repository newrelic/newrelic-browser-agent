// Make sure newrelic is the first thing imported
import "./newrelic";

import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById("app")! });
