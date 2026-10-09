import { Component, afterNextRender } from '@angular/core';

declare const window: any;

/*
 * Exercises the agent APIs that don't fire automatically on page load, so the
 * framework informational test suite can confirm ajax/jserrors/logging/page-action
 * events are captured for this framework build too.
 */
function triggerFeatureEvents () {
  window.agent?.noticeError('framework-spec-test-error');
  window.agent?.log('framework-spec-test-log');
  window.agent?.addPageAction('framework-spec-test-action');
  fetch(window.location.href).catch(() => {});
}

@Component({
    selector: 'app-root',
    template: `
    <nav class="navbar">
      <div class="nav-container">
        <h1 class="logo">Demo App</h1>
        <ul class="nav-menu">
          <li><a routerLink="/home" routerLinkActive="active">Home</a></li>
          <li><a routerLink="/about" routerLinkActive="active">About</a></li>
        </ul>
      </div>
    </nav>
    <router-outlet></router-outlet>
  `,
    styles: [`
    .navbar {
      background-color: #dd0031;
      padding: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
    }

    .logo {
      color: white;
      margin: 0;
      font-size: 1.5rem;
    }

    .nav-menu {
      list-style: none;
      display: flex;
      gap: 2rem;
      margin: 0;
      padding: 0;
    }

    .nav-menu a {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: background-color 0.3s;
    }

    .nav-menu a:hover {
      background-color: rgba(255,255,255,0.1);
    }

    .nav-menu a.active {
      background-color: rgba(255,255,255,0.2);
      font-weight: bold;
    }
  `],
    standalone: false
})
export class AppComponent {
  title = 'demo-app';

  constructor () {
    /*
     * afterNextRender fires once Angular has rendered this view - closer to React's
     * useEffect/Vue's onMounted than ngOnInit, which fires before the view paints.
     * It's still no guarantee we're past the window "load" event though: Angular's
     * own render flush is unrelated to the browser waiting on every subresource
     * (including the agent's own lazy-loaded chunks), so this view can render well
     * before "load" fires. Soft nav closes its "initial page load" interaction on
     * "load", and an ajax call made while that interaction is still open gets
     * attributed as a child of it instead of being reported as its own standalone
     * ajax harvest event - so we still need to defer past "load" ourselves.
     *
     * Deferring to "load" alone isn't enough: the agent's own interaction-closing
     * logic is itself a "load" listener, and plain listener order between it and
     * ours isn't guaranteed. A setTimeout scheduled from the "load" handler (or
     * immediately, if "load" already happened) is a macrotask, so it's guaranteed
     * to run only after every synchronous "load" listener - including the agent's -
     * has already finished, which reliably places the trigger outside the
     * now-closed interaction window.
     */
    afterNextRender(() => {
      const fire = () => setTimeout(triggerFeatureEvents, 0);
      if (document.readyState === 'complete') {
        fire();
      } else {
        window.addEventListener('load', fire, { once: true });
      }
    });
  }
}
