import { LoremIpsum } from './LoremIpsum';
import { LCP } from './LCP';

export function App() {
  return (
    <div data-nr-mfe-id='vite-main-mfe' id="root">
      <LCP />
      <h1>Vite React</h1>
      <LoremIpsum />
    </div>
  );
}